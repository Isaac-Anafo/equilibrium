package com.equilibrium.rebalance;

import com.equilibrium.common.ApiException;
import com.equilibrium.common.ErrorCodes;
import com.equilibrium.notification.NotificationService;
import com.equilibrium.notification.NotificationType;
import com.equilibrium.portfolio.DriftEngine;
import com.equilibrium.portfolio.Portfolio;
import com.equilibrium.portfolio.PortfolioAccessGuard;
import com.equilibrium.portfolio.Position;
import com.equilibrium.portfolio.PositionRepository;
import com.equilibrium.portfolio.TargetAllocation;
import com.equilibrium.portfolio.TargetAllocationRepository;
import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.UUID;
import java.util.function.Function;
import java.util.stream.Collectors;

@Service
public class RebalanceService {

    private final PortfolioAccessGuard accessGuard;
    private final PositionRepository positionRepository;
    private final TargetAllocationRepository allocationRepository;
    private final RebalanceEventRepository eventRepository;
    private final RebalanceExecutionRepository executionRepository;
    private final NotificationService notificationService;
    private final ObjectMapper objectMapper;
    private final BigDecimal commissionBps;

    public RebalanceService(PortfolioAccessGuard accessGuard,
                            PositionRepository positionRepository,
                            TargetAllocationRepository allocationRepository,
                            RebalanceEventRepository eventRepository,
                            RebalanceExecutionRepository executionRepository,
                            NotificationService notificationService,
                            ObjectMapper objectMapper,
                            @Value("${app.rebalance.commission-bps:0}") int commissionBps) {
        this.accessGuard = accessGuard;
        this.positionRepository = positionRepository;
        this.allocationRepository = allocationRepository;
        this.eventRepository = eventRepository;
        this.executionRepository = executionRepository;
        this.notificationService = notificationService;
        this.objectMapper = objectMapper;
        this.commissionBps = BigDecimal.valueOf(commissionBps);
    }

    @Transactional(readOnly = true)
    public List<RebalanceDtos.ProposalView> proposals(UUID userId, UUID portfolioId) {
        Portfolio portfolio = accessGuard.requireOwner(portfolioId, userId);
        List<RebalanceEngine.Proposal> proposals = computeProposals(portfolio);
        return proposals.stream().map(this::toProposalView).toList();
    }

    @Transactional
    public RebalanceDtos.ExecuteResponse execute(UUID userId, UUID portfolioId,
                                                 RebalanceDtos.ExecuteRequest request) {
        Portfolio portfolio = accessGuard.requireOwner(portfolioId, userId);
        Optional<RebalanceExecution> existing = executionRepository
                .findByPortfolioIdAndRequestId(portfolioId, request.requestId());
        if (existing.isPresent()) {
            return readStored(existing.get());
        }

        List<RebalanceEngine.Proposal> proposals = computeProposals(portfolio);
        if (proposals.isEmpty()) {
            throw new ApiException(ErrorCodes.CONFLICT, HttpStatus.CONFLICT,
                    "No rebalancing trades to execute.");
        }

        List<Position> positions = positionRepository.findByPortfolio(portfolio);
        Map<String, Position> byTicker = positions.stream()
                .collect(Collectors.toMap(Position::getTicker, Function.identity()));
        for (RebalanceEngine.Proposal proposal : proposals) {
            Position position = byTicker.get(proposal.ticker());
            if (position == null) {
                continue;
            }
            BigDecimal shares = proposal.action() == RebalanceEngine.TradeAction.BUY
                    ? position.getShares().add(proposal.shares())
                    : position.getShares().subtract(proposal.shares());
            position.setShares(shares.max(BigDecimal.ZERO));
            positionRepository.save(position);
        }

        TargetAllocation allocation = requireAllocation(portfolio);
        DriftEngine.Result after = DriftEngine.compute(positionRepository.findByPortfolio(portfolio), allocation);

        BigDecimal totalAmount = proposals.stream()
                .map(RebalanceEngine.Proposal::amount)
                .reduce(BigDecimal.ZERO, BigDecimal::add);
        BigDecimal totalCost = proposals.stream()
                .map(RebalanceEngine.Proposal::cost)
                .reduce(BigDecimal.ZERO, BigDecimal::add);

        RebalanceEvent event = new RebalanceEvent();
        event.setPortfolio(portfolio);
        event.setTrigger("Approved rebalance");
        event.setTrades(proposals.size());
        event.setCost(totalCost);
        eventRepository.save(event);

        notificationService.notify(portfolio.getUser().getId(), NotificationType.TRADE,
                proposals.size() + " trades executed successfully. Portfolio rebalanced.");

        List<RebalanceDtos.PositionAfterView> afterViews = after.rows().stream()
                .map(r -> new RebalanceDtos.PositionAfterView(r.ticker(), r.name(), r.current(), r.target(),
                        r.delta(), r.value()))
                .toList();

        RebalanceDtos.ExecuteResponse response = new RebalanceDtos.ExecuteResponse(
                proposals.size(),
                totalAmount.setScale(2, RoundingMode.HALF_UP),
                totalCost.setScale(2, RoundingMode.HALF_UP),
                after.totalValue().setScale(2, RoundingMode.HALF_UP),
                new RebalanceDtos.EventView(event.getExecutedAt().toString(), event.getTrigger(),
                        event.getTrades(), "$" + event.getCost().setScale(2, RoundingMode.HALF_UP)),
                afterViews);

        RebalanceExecution record = new RebalanceExecution();
        record.setPortfolio(portfolio);
        record.setRequestId(request.requestId());
        record.setResultJson(writeJson(response));
        executionRepository.save(record);

        return response;
    }

    @Transactional(readOnly = true)
    public List<RebalanceDtos.EventView> log(UUID userId, UUID portfolioId) {
        Portfolio portfolio = accessGuard.requireOwner(portfolioId, userId);
        return eventRepository.findByPortfolioOrderByExecutedAtDesc(portfolio).stream()
                .map(e -> new RebalanceDtos.EventView(e.getExecutedAt().toString(), e.getTrigger(),
                        e.getTrades(), "$" + e.getCost().setScale(2, RoundingMode.HALF_UP)))
                .toList();
    }

    private List<RebalanceEngine.Proposal> computeProposals(Portfolio portfolio) {
        TargetAllocation allocation = requireAllocation(portfolio);
        return RebalanceEngine.proposals(positionRepository.findByPortfolio(portfolio), allocation,
                portfolio.getDriftThreshold(), commissionBps,
                portfolio.getRiskProfile().name().toLowerCase());
    }

    private RebalanceDtos.ProposalView toProposalView(RebalanceEngine.Proposal proposal) {
        String action = proposal.action() == RebalanceEngine.TradeAction.BUY ? "Buy" : "Sell";
        return new RebalanceDtos.ProposalView(proposal.ticker(), proposal.name(), action,
                proposal.shares(), proposal.amount(), proposal.cost(), proposal.rationale());
    }

    private TargetAllocation requireAllocation(Portfolio portfolio) {
        return allocationRepository.findByPortfolioId(portfolio.getId())
                .orElseThrow(() -> new ApiException(ErrorCodes.INTERNAL_ERROR, HttpStatus.INTERNAL_SERVER_ERROR,
                        "Target allocation missing for portfolio."));
    }

    private RebalanceDtos.ExecuteResponse readStored(RebalanceExecution execution) {
        try {
            return objectMapper.readValue(execution.getResultJson(), RebalanceDtos.ExecuteResponse.class);
        } catch (JsonProcessingException e) {
            throw new ApiException(ErrorCodes.INTERNAL_ERROR, HttpStatus.INTERNAL_SERVER_ERROR,
                    "Could not read stored execution result.");
        }
    }

    private String writeJson(RebalanceDtos.ExecuteResponse response) {
        try {
            return objectMapper.writeValueAsString(response);
        } catch (JsonProcessingException e) {
            throw new ApiException(ErrorCodes.INTERNAL_ERROR, HttpStatus.INTERNAL_SERVER_ERROR,
                    "Could not store execution result.");
        }
    }
}

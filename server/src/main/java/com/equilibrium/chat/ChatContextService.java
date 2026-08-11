package com.equilibrium.chat;

import com.equilibrium.portfolio.DriftEngine;
import com.equilibrium.portfolio.Portfolio;
import com.equilibrium.portfolio.PortfolioRepository;
import com.equilibrium.portfolio.Position;
import com.equilibrium.portfolio.PositionRepository;
import com.equilibrium.portfolio.TargetAllocation;
import com.equilibrium.portfolio.TargetAllocationRepository;
import com.equilibrium.rebalance.RebalanceEngine;
import com.equilibrium.rebalance.RebalanceEvent;
import com.equilibrium.rebalance.RebalanceEventRepository;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Service
public class ChatContextService {

    private final PortfolioRepository portfolioRepository;
    private final PositionRepository positionRepository;
    private final TargetAllocationRepository allocationRepository;
    private final RebalanceEventRepository eventRepository;
    private final BigDecimal commissionBps;

    public ChatContextService(PortfolioRepository portfolioRepository,
                              PositionRepository positionRepository,
                              TargetAllocationRepository allocationRepository,
                              RebalanceEventRepository eventRepository,
                              @Value("${app.rebalance.commission-bps:0}") int commissionBps) {
        this.portfolioRepository = portfolioRepository;
        this.positionRepository = positionRepository;
        this.allocationRepository = allocationRepository;
        this.eventRepository = eventRepository;
        this.commissionBps = BigDecimal.valueOf(commissionBps);
    }

    @Transactional(readOnly = true)
    public String snapshot(UUID userId) {
        Optional<Portfolio> maybePortfolio = portfolioRepository.findFirstByUserIdOrderByCreatedAtAsc(userId);
        if (maybePortfolio.isEmpty()) {
            return "The user does not have a portfolio yet.";
        }
        Portfolio portfolio = maybePortfolio.get();
        TargetAllocation allocation = requireAllocation(portfolio);
        List<Position> positions = positionRepository.findByPortfolio(portfolio);
        DriftEngine.Result drift = DriftEngine.compute(positions, allocation);

        StringBuilder sb = new StringBuilder();
        sb.append("- Portfolio: \"").append(portfolio.getName()).append("\"")
                .append(", risk profile: ").append(portfolio.getRiskProfile().lower())
                .append(", drift threshold: ").append(portfolio.getDriftThreshold()).append("%\n");
        sb.append("- Total value: $").append(drift.totalValue().setScale(2, RoundingMode.HALF_UP)).append("\n");
        sb.append("- Current portfolio drift: ").append(drift.driftPct())
                .append("% (balanced when within the threshold)\n");
        sb.append("- Target allocation: bonds ").append(allocation.getBonds())
                .append("%, domestic ").append(allocation.getDomestic())
                .append("%, international ").append(allocation.getIntl())
                .append("%, real estate ").append(allocation.getRealEstate()).append("%\n");

        sb.append("- Holdings (ticker | name | current % | target % | delta % | value):\n");
        for (DriftEngine.DriftRow row : drift.rows()) {
            sb.append("  ").append(row.ticker()).append(" | ").append(row.name()).append(" | ")
                    .append(row.current()).append("% | ").append(row.target()).append("% | ")
                    .append(row.delta()).append(" | $").append(row.value()).append("\n");
        }

        List<RebalanceEngine.Proposal> proposals = RebalanceEngine.proposals(positions, allocation,
                portfolio.getDriftThreshold(), commissionBps, portfolio.getRiskProfile().lower());
        if (proposals.isEmpty()) {
            sb.append("- No rebalancing trades are currently proposed.\n");
        } else {
            sb.append("- Proposed rebalancing trades:\n");
            for (RebalanceEngine.Proposal proposal : proposals) {
                sb.append("  ").append(proposal.ticker()).append(": ")
                        .append(proposal.action().name())
                        .append(" ").append(proposal.shares()).append(" shares ($")
                        .append(proposal.amount()).append(")\n");
            }
        }

        List<RebalanceEvent> events = eventRepository.findByPortfolioOrderByExecutedAtDesc(portfolio);
        if (!events.isEmpty()) {
            sb.append("- Recent rebalance activity:\n");
            for (RebalanceEvent event : events) {
                sb.append("  ").append(event.getExecutedAt()).append(": ").append(event.getTrigger())
                        .append(", ").append(event.getTrades()).append(" trades\n");
            }
        }
        return sb.toString();
    }

    private TargetAllocation requireAllocation(Portfolio portfolio) {
        return allocationRepository.findByPortfolioId(portfolio.getId()).orElse(null);
    }
}

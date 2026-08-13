package com.equilibrium.portfolio;

import com.equilibrium.analytics.PositionPrice;
import com.equilibrium.analytics.PositionPriceRepository;
import com.equilibrium.auth.UserRepository;
import com.equilibrium.common.ApiException;
import com.equilibrium.common.ErrorCodes;
import com.equilibrium.notification.NotificationService;
import com.equilibrium.notification.NotificationType;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.LocalDate;
import java.time.OffsetDateTime;
import java.time.ZoneOffset;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.UUID;

@Service
public class PortfolioService {

    private final PortfolioRepository portfolioRepository;
    private final PositionRepository positionRepository;
    private final TargetAllocationRepository allocationRepository;
    private final UserRepository userRepository;
    private final PositionPriceRepository priceRepository;
    private final PortfolioAccessGuard accessGuard;
    private final NotificationService notificationService;
    private final PortfolioActivityService activityService;

    public PortfolioService(PortfolioRepository portfolioRepository,
                            PositionRepository positionRepository,
                            TargetAllocationRepository allocationRepository,
                            UserRepository userRepository,
                            PositionPriceRepository priceRepository,
                            PortfolioAccessGuard accessGuard,
                            NotificationService notificationService,
                            PortfolioActivityService activityService) {
        this.portfolioRepository = portfolioRepository;
        this.positionRepository = positionRepository;
        this.allocationRepository = allocationRepository;
        this.userRepository = userRepository;
        this.priceRepository = priceRepository;
        this.accessGuard = accessGuard;
        this.notificationService = notificationService;
        this.activityService = activityService;
    }

    @Transactional
    public PortfolioDtos.PortfolioView create(UUID userId, PortfolioDtos.CreatePortfolioRequest request) {
        Portfolio portfolio = new Portfolio();
        portfolio.setUser(userRepository.getReferenceById(userId));
        portfolio.setName(request.name());
        portfolio.setRiskProfile(request.riskProfile());
        portfolio.setDriftThreshold(request.driftThreshold() == null
                ? new BigDecimal("3.5") : request.driftThreshold());
        portfolioRepository.save(portfolio);

        TargetAllocation allocation = new TargetAllocation();
        allocation.setPortfolio(portfolio);
        allocation.setBonds(new BigDecimal("40"));
        allocation.setDomestic(new BigDecimal("40"));
        allocation.setIntl(new BigDecimal("15"));
        allocation.setRealEstate(new BigDecimal("5"));
        allocationRepository.save(allocation);

        if (request.holdings() != null) {
            for (PortfolioDtos.HoldingInput h : request.holdings()) {
                savePosition(portfolio, h);
            }
        }
        return new PortfolioDtos.PortfolioView(portfolio.getId(), portfolio.getName(), portfolio.getRiskProfile());
    }

    @Transactional(readOnly = true)
    public PortfolioDtos.PortfolioView myPortfolio(UUID userId) {
        return portfolioRepository.findFirstByUserIdOrderByCreatedAtAsc(userId)
                .map(p -> new PortfolioDtos.PortfolioView(p.getId(), p.getName(), p.getRiskProfile()))
                .orElseThrow(() -> new ApiException(ErrorCodes.NOT_FOUND, HttpStatus.NOT_FOUND,
                        "No portfolio found. Create one during onboarding."));
    }

    @Transactional(readOnly = true)
    public PortfolioDtos.SummaryResponse summary(UUID userId, UUID portfolioId) {
        Portfolio portfolio = accessGuard.requireOwner(portfolioId, userId);
        List<Position> positions = positionRepository.findByPortfolio(portfolio);
        TargetAllocation allocation = requireAllocation(portfolio);
        DriftEngine.Result drift = DriftEngine.compute(positions, allocation);

        OffsetDateTime asOf = OffsetDateTime.now(ZoneOffset.UTC);
        BigDecimal dayReturn = BigDecimal.ZERO;
        BigDecimal totalReturn = BigDecimal.ZERO;
        if (!positions.isEmpty()) {
            LocalDate latest = latestPriceDate(positions);
            if (latest != null) {
                asOf = latest.atTime(16, 0).atOffset(ZoneOffset.UTC);
                BigDecimal latestTotal = totalValueOnOrBefore(positions, latest);
                BigDecimal priorTotal = totalValueOnOrBefore(positions, latest.minusDays(1));
                if (priorTotal.signum() > 0) {
                    dayReturn = latestTotal.divide(priorTotal, 6, RoundingMode.HALF_UP)
                            .subtract(BigDecimal.ONE)
                            .multiply(new BigDecimal("100"))
                            .setScale(1, RoundingMode.HALF_UP);
                }
                BigDecimal yearAgoTotal = totalValueOnOrBefore(positions, latest.minusYears(1));
                if (yearAgoTotal.signum() > 0) {
                    totalReturn = latestTotal.divide(yearAgoTotal, 6, RoundingMode.HALF_UP)
                            .subtract(BigDecimal.ONE)
                            .multiply(new BigDecimal("100"))
                            .setScale(1, RoundingMode.HALF_UP);
                }
            }
        }
        return new PortfolioDtos.SummaryResponse(
                drift.totalValue().setScale(2, RoundingMode.HALF_UP),
                totalReturn, dayReturn, drift.driftPct(), portfolio.getDriftThreshold(), asOf);
    }

    @Transactional(readOnly = true)
    public List<PortfolioDtos.HoldingsRowView> holdings(UUID userId, UUID portfolioId) {
        Portfolio portfolio = accessGuard.requireOwner(portfolioId, userId);
        TargetAllocation allocation = requireAllocation(portfolio);
        DriftEngine.Result drift = DriftEngine.compute(positionRepository.findByPortfolio(portfolio), allocation);
        List<PortfolioDtos.HoldingsRowView> rows = new ArrayList<>();
        for (DriftEngine.DriftRow row : drift.rows()) {
            rows.add(new PortfolioDtos.HoldingsRowView(row.ticker(), row.name(), row.current(), row.target(),
                    row.value(), row.delta()));
        }
        rows.sort(Comparator.comparing(PortfolioDtos.HoldingsRowView::current).reversed());
        return rows;
    }

    @Transactional(readOnly = true)
    public PortfolioDtos.TargetAllocationView getTargetAllocation(UUID userId, UUID portfolioId) {
        Portfolio portfolio = accessGuard.requireOwner(portfolioId, userId);
        TargetAllocation allocation = requireAllocation(portfolio);
        return toView(allocation);
    }

    @Transactional
    public PortfolioDtos.TargetAllocationView updateTargetAllocation(UUID userId, UUID portfolioId,
                                                                     PortfolioDtos.TargetAllocationRequest request) {
        Portfolio portfolio = accessGuard.requireOwner(portfolioId, userId);
        BigDecimal sum = request.bonds().add(request.domestic()).add(request.intl()).add(request.realEstate());
        if (sum.compareTo(new BigDecimal("100")) != 0) {
            throw new ApiException(ErrorCodes.UNPROCESSABLE_ENTITY, HttpStatus.UNPROCESSABLE_ENTITY,
                    "Target allocation must total 100%.", Map.of("allocation", "must total 100"));
        }
        for (BigDecimal value : List.of(request.bonds(), request.domestic(), request.intl(), request.realEstate())) {
            if (value.signum() < 0 || value.compareTo(new BigDecimal("100")) > 0) {
                throw new ApiException(ErrorCodes.UNPROCESSABLE_ENTITY, HttpStatus.UNPROCESSABLE_ENTITY,
                        "Each bucket must be between 0 and 100.", Map.of("allocation", "out of range"));
            }
        }
        TargetAllocation allocation = requireAllocation(portfolio);
        allocation.setBonds(request.bonds());
        allocation.setDomestic(request.domestic());
        allocation.setIntl(request.intl());
        allocation.setRealEstate(request.realEstate());
        allocationRepository.save(allocation);
        maybeEmitDriftNotification(portfolio, allocation);
        activityService.record(portfolio, PortfolioActivityType.ALLOCATION,
                "Updated target allocation to " + allocation.getBonds() + "/" + allocation.getDomestic()
                        + "/" + allocation.getIntl() + "/" + allocation.getRealEstate() + ".");
        return toView(allocation);
    }

    @Transactional(readOnly = true)
    public PortfolioDtos.ThresholdView getThreshold(UUID userId, UUID portfolioId) {
        Portfolio portfolio = accessGuard.requireOwner(portfolioId, userId);
        return new PortfolioDtos.ThresholdView(portfolio.getDriftThreshold());
    }

    @Transactional
    public PortfolioDtos.ThresholdView updateThreshold(UUID userId, UUID portfolioId,
                                                       PortfolioDtos.ThresholdRequest request) {
        Portfolio portfolio = accessGuard.requireOwner(portfolioId, userId);
        BigDecimal threshold = request.threshold();
        if (threshold == null || threshold.compareTo(new BigDecimal("0.5")) < 0
                || threshold.compareTo(new BigDecimal("20")) > 0) {
            throw new ApiException(ErrorCodes.UNPROCESSABLE_ENTITY, HttpStatus.UNPROCESSABLE_ENTITY,
                    "Enter a value between 0.5% and 20%.", Map.of("threshold", "must be between 0.5 and 20"));
        }
        portfolio.setDriftThreshold(threshold);
        portfolioRepository.save(portfolio);
        maybeEmitDriftNotification(portfolio, requireAllocation(portfolio));
        activityService.record(portfolio, PortfolioActivityType.THRESHOLD,
                "Changed drift threshold to " + threshold + "%.");
        return new PortfolioDtos.ThresholdView(portfolio.getDriftThreshold());
    }

    @Transactional(readOnly = true)
    public PortfolioDtos.AutoApproveView getAutoApprove(UUID userId, UUID portfolioId) {
        Portfolio portfolio = accessGuard.requireOwner(portfolioId, userId);
        return new PortfolioDtos.AutoApproveView(portfolio.isAutoApprove());
    }

    @Transactional
    public PortfolioDtos.AutoApproveView updateAutoApprove(UUID userId, UUID portfolioId,
                                                           PortfolioDtos.AutoApproveRequest request) {
        Portfolio portfolio = accessGuard.requireOwner(portfolioId, userId);
        portfolio.setAutoApprove(Boolean.TRUE.equals(request.autoApprove()));
        portfolioRepository.save(portfolio);
        activityService.record(portfolio, PortfolioActivityType.AUTO_APPROVE,
                Boolean.TRUE.equals(request.autoApprove())
                        ? "Enabled auto-approve for trades under $500."
                        : "Disabled auto-approve for trades under $500.");
        return new PortfolioDtos.AutoApproveView(portfolio.isAutoApprove());
    }

    private void maybeEmitDriftNotification(Portfolio portfolio, TargetAllocation allocation) {
        DriftEngine.Result drift = DriftEngine.compute(positionRepository.findByPortfolio(portfolio), allocation);
        if (drift.driftPct().compareTo(portfolio.getDriftThreshold()) > 0) {
            notificationService.notify(portfolio.getUser().getId(), NotificationType.DRIFT,
                    "Portfolio has drifted " + drift.driftPct() + "% from target — review rebalancing.");
        }
    }

    private void savePosition(Portfolio portfolio, PortfolioDtos.HoldingInput h) {
        Position position = new Position();
        position.setPortfolio(portfolio);
        position.setTicker(h.ticker().trim().toUpperCase(Locale.ROOT));
        position.setName(h.name() == null ? "" : h.name());
        position.setAssetClass(inferAssetClass(position.getTicker()));
        position.setShares(new BigDecimal(h.shares()));
        position.setPrice(new BigDecimal(h.price()));
        positionRepository.save(position);
    }

    private AssetClass inferAssetClass(String ticker) {
        return switch (ticker) {
            case "VTI", "VOO", "SPY", "ITOT", "IWV", "SCHB" -> AssetClass.DOMESTIC;
            case "VXUS", "VEA", "VWO", "IXUS", "EEM" -> AssetClass.INTL;
            case "BND", "AGG", "TIP", "BNDX" -> AssetClass.BONDS;
            case "VNQ", "REET", "IYR" -> AssetClass.REAL_ESTATE;
            default -> AssetClass.DOMESTIC;
        };
    }

    private TargetAllocation requireAllocation(Portfolio portfolio) {
        return allocationRepository.findByPortfolioId(portfolio.getId())
                .orElseThrow(() -> new ApiException(ErrorCodes.INTERNAL_ERROR, HttpStatus.INTERNAL_SERVER_ERROR,
                        "Target allocation missing for portfolio."));
    }

    private PortfolioDtos.TargetAllocationView toView(TargetAllocation allocation) {
        return new PortfolioDtos.TargetAllocationView(allocation.getBonds(), allocation.getDomestic(),
                allocation.getIntl(), allocation.getRealEstate());
    }

    private LocalDate latestPriceDate(List<Position> positions) {
        LocalDate latest = null;
        for (Position position : positions) {
            PositionPrice price = priceRepository.findTopByPositionIdOrderByAsOfDesc(position.getId())
                    .orElse(null);
            if (price != null && (latest == null || price.getAsOf().isAfter(latest))) {
                latest = price.getAsOf();
            }
        }
        return latest;
    }

    private BigDecimal totalValueOnOrBefore(List<Position> positions, LocalDate date) {
        BigDecimal total = BigDecimal.ZERO;
        for (Position position : positions) {
            PositionPrice price = priceRepository
                    .findTopByPositionIdAndAsOfLessThanEqualOrderByAsOfDesc(position.getId(), date)
                    .orElse(null);
            if (price != null) {
                total = total.add(position.getShares().multiply(price.getClose()));
            }
        }
        return total;
    }
}

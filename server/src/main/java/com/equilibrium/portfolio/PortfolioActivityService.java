package com.equilibrium.portfolio;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.UUID;

@Service
public class PortfolioActivityService {

    private final PortfolioActivityRepository activityRepository;
    private final PortfolioAccessGuard accessGuard;

    public PortfolioActivityService(PortfolioActivityRepository activityRepository,
                                    PortfolioAccessGuard accessGuard) {
        this.activityRepository = activityRepository;
        this.accessGuard = accessGuard;
    }

    @Transactional
    public void record(Portfolio portfolio, PortfolioActivityType type, String summary) {
        PortfolioActivity activity = new PortfolioActivity();
        activity.setPortfolio(portfolio);
        activity.setType(type);
        activity.setSummary(summary);
        activityRepository.save(activity);
    }

    @Transactional(readOnly = true)
    public List<PortfolioDtos.ActivityView> list(UUID userId, UUID portfolioId) {
        Portfolio portfolio = accessGuard.requireOwner(portfolioId, userId);
        return activityRepository.findByPortfolioIdOrderByCreatedAtDesc(portfolio.getId()).stream()
                .map(a -> new PortfolioDtos.ActivityView(
                        a.getCreatedAt().toString(),
                        a.getType().name().toLowerCase(),
                        a.getSummary()))
                .toList();
    }
}
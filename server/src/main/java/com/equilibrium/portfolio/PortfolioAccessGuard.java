package com.equilibrium.portfolio;

import com.equilibrium.common.ApiException;
import com.equilibrium.common.ErrorCodes;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Component;

import java.util.UUID;

@Component
public class PortfolioAccessGuard {

    private final PortfolioRepository portfolioRepository;

    public PortfolioAccessGuard(PortfolioRepository portfolioRepository) {
        this.portfolioRepository = portfolioRepository;
    }

    public Portfolio requireOwner(UUID portfolioId, UUID userId) {
        Portfolio portfolio = portfolioRepository.findById(portfolioId)
                .orElseThrow(() -> new ApiException(ErrorCodes.NOT_FOUND, HttpStatus.NOT_FOUND,
                        "Portfolio not found."));
        if (!portfolio.getUser().getId().equals(userId)) {
            throw new ApiException(ErrorCodes.FORBIDDEN, HttpStatus.FORBIDDEN,
                    "You do not have access to this portfolio.");
        }
        return portfolio;
    }
}

package com.equilibrium.portfolio;

import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.UUID;

public interface PositionRepository extends JpaRepository<Position, UUID> {

    List<Position> findByPortfolio(Portfolio portfolio);

    List<Position> findByPortfolioId(UUID portfolioId);
}

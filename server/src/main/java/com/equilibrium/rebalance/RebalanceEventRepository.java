package com.equilibrium.rebalance;

import com.equilibrium.portfolio.Portfolio;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.UUID;

public interface RebalanceEventRepository extends JpaRepository<RebalanceEvent, UUID> {

    List<RebalanceEvent> findByPortfolioIdOrderByExecutedAtDesc(UUID portfolioId);

    List<RebalanceEvent> findByPortfolioOrderByExecutedAtDesc(Portfolio portfolio);
}

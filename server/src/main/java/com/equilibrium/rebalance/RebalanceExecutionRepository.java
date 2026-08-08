package com.equilibrium.rebalance;

import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;
import java.util.UUID;

public interface RebalanceExecutionRepository extends JpaRepository<RebalanceExecution, UUID> {

    Optional<RebalanceExecution> findByPortfolioIdAndRequestId(UUID portfolioId, String requestId);
}

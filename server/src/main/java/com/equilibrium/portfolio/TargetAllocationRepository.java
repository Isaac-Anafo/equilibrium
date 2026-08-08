package com.equilibrium.portfolio;

import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;
import java.util.UUID;

public interface TargetAllocationRepository extends JpaRepository<TargetAllocation, UUID> {

    Optional<TargetAllocation> findByPortfolioId(UUID portfolioId);
}

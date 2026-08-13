package com.equilibrium.portfolio;

import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.UUID;

public interface PortfolioActivityRepository extends JpaRepository<PortfolioActivity, UUID> {

    List<PortfolioActivity> findByPortfolioIdOrderByCreatedAtDesc(UUID portfolioId);
}
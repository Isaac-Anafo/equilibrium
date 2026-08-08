package com.equilibrium.portfolio;

import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface PortfolioRepository extends JpaRepository<Portfolio, UUID> {

    List<Portfolio> findByUserId(UUID userId);

    Optional<Portfolio> findFirstByUserIdOrderByCreatedAtAsc(UUID userId);

    Optional<Portfolio> findByIdAndUserId(UUID id, UUID userId);
}

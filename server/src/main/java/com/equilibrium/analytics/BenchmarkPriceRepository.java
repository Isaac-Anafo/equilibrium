package com.equilibrium.analytics;

import org.springframework.data.jpa.repository.JpaRepository;

import java.time.LocalDate;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface BenchmarkPriceRepository extends JpaRepository<BenchmarkPrice, UUID> {

    Optional<BenchmarkPrice> findTopByOrderByAsOfDesc();

    List<BenchmarkPrice> findByAsOfBetweenOrderByAsOfAsc(LocalDate from, LocalDate to);
}

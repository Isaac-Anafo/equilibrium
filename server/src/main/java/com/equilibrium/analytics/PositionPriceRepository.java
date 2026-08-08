package com.equilibrium.analytics;

import org.springframework.data.jpa.repository.JpaRepository;

import java.time.LocalDate;
import java.util.Collection;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface PositionPriceRepository extends JpaRepository<PositionPrice, UUID> {

    Optional<PositionPrice> findTopByPositionIdOrderByAsOfDesc(UUID positionId);

    Optional<PositionPrice> findTopByPositionIdOrderByAsOfAsc(UUID positionId);

    Optional<PositionPrice> findTopByPositionIdAndAsOfLessThanEqualOrderByAsOfDesc(UUID positionId, LocalDate asOf);

    List<PositionPrice> findByPositionIdInAndAsOfBetweenOrderByAsOfAsc(Collection<UUID> positionIds,
                                                                       LocalDate from, LocalDate to);

    List<PositionPrice> findByPositionIdInAndAsOfGreaterThanEqualOrderByAsOfAsc(Collection<UUID> positionIds,
                                                                                LocalDate from);
}

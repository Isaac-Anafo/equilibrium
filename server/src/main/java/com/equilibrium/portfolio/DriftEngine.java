package com.equilibrium.portfolio;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.util.ArrayList;
import java.util.EnumMap;
import java.util.List;
import java.util.Map;

public final class DriftEngine {
    private DriftEngine() {
    }

    public record DriftRow(Position position, String ticker, String name, BigDecimal current, BigDecimal target,
                           BigDecimal value, BigDecimal delta) {
    }

    public static final class Result {
        private final List<DriftRow> rows;
        private final BigDecimal totalValue;
        private final BigDecimal driftPct;

        Result(List<DriftRow> rows, BigDecimal totalValue, BigDecimal driftPct) {
            this.rows = rows;
            this.totalValue = totalValue;
            this.driftPct = driftPct;
        }

        public List<DriftRow> rows() {
            return rows;
        }

        public BigDecimal totalValue() {
            return totalValue;
        }

        public BigDecimal driftPct() {
            return driftPct;
        }
    }

    public static Result compute(List<Position> positions, TargetAllocation allocation) {
        BigDecimal total = BigDecimal.ZERO;
        Map<AssetClass, Integer> counts = new EnumMap<>(AssetClass.class);
        for (Position p : positions) {
            counts.merge(p.getAssetClass(), 1, Integer::sum);
            total = total.add(p.getShares().multiply(p.getPrice()));
        }

        List<DriftRow> rows = new ArrayList<>();
        for (Position p : positions) {
            BigDecimal value = p.getShares().multiply(p.getPrice());
            BigDecimal current = total.signum() == 0
                    ? BigDecimal.ZERO
                    : value.multiply(new BigDecimal("100")).divide(total, 1, RoundingMode.HALF_UP);
            BigDecimal target = targetFor(p.getAssetClass(), allocation, counts);
            BigDecimal delta = current.subtract(target).setScale(1, RoundingMode.HALF_UP);
            rows.add(new DriftRow(p, p.getTicker(), p.getName(), current, target,
                    value.setScale(2, RoundingMode.HALF_UP), delta));
        }

        BigDecimal driftPct = rows.stream()
                .map(r -> r.delta().abs())
                .max(BigDecimal::compareTo)
                .orElse(BigDecimal.ZERO);
        return new Result(rows, total, driftPct);
    }

    private static BigDecimal targetFor(AssetClass assetClass, TargetAllocation allocation,
                                        Map<AssetClass, Integer> counts) {
        BigDecimal bucketWeight = switch (assetClass) {
            case BONDS -> allocation.getBonds();
            case DOMESTIC -> allocation.getDomestic();
            case INTL -> allocation.getIntl();
            case REAL_ESTATE -> allocation.getRealEstate();
        };
        int count = counts.getOrDefault(assetClass, 0);
        if (count == 0) {
            return BigDecimal.ZERO;
        }
        return bucketWeight.divide(BigDecimal.valueOf(count), 1, RoundingMode.HALF_UP);
    }
}

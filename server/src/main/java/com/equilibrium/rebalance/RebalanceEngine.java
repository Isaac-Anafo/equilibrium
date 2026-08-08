package com.equilibrium.rebalance;

import com.equilibrium.portfolio.AssetClass;
import com.equilibrium.portfolio.DriftEngine;
import com.equilibrium.portfolio.Position;
import com.equilibrium.portfolio.TargetAllocation;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.List;

public final class RebalanceEngine {
    private RebalanceEngine() {
    }

    public enum TradeAction {
        BUY, SELL
    }

    public record Proposal(String ticker, String name, TradeAction action, BigDecimal shares, BigDecimal amount,
                           BigDecimal cost, String rationale, BigDecimal delta) {
    }

    public static List<Proposal> proposals(List<Position> positions, TargetAllocation allocation,
                                           BigDecimal threshold, BigDecimal commissionBps, String riskProfile) {
        DriftEngine.Result drift = DriftEngine.compute(positions, allocation);
        List<Proposal> out = new ArrayList<>();
        for (DriftEngine.DriftRow row : drift.rows()) {
            if (row.delta().abs().compareTo(threshold) <= 0) {
                continue;
            }
            TradeAction action = row.delta().signum() > 0 ? TradeAction.SELL : TradeAction.BUY;
            BigDecimal valueToTrade = row.delta().abs()
                    .divide(new BigDecimal("100"), 10, RoundingMode.HALF_UP)
                    .multiply(drift.totalValue());
            BigDecimal price = row.position().getPrice();
            BigDecimal shares = valueToTrade.divide(price, 6, RoundingMode.HALF_UP);
            BigDecimal amount = shares.multiply(price).setScale(2, RoundingMode.HALF_UP);
            BigDecimal cost = commissionFor(commissionBps, amount);
            String rationale = rationale(action, row.position().getAssetClass(),
                    row.current(), row.target(), riskProfile);
            out.add(new Proposal(row.ticker(), row.name(), action, shares, amount, cost, rationale, row.delta()));
        }
        out.sort(Comparator.comparing((Proposal p) -> p.delta().abs()).reversed());
        return out;
    }

    private static BigDecimal commissionFor(BigDecimal commissionBps, BigDecimal amount) {
        return amount.multiply(commissionBps)
                .divide(new BigDecimal("10000"), 2, RoundingMode.HALF_UP);
    }

    private static String rationale(TradeAction action, AssetClass assetClass, BigDecimal current,
                                    BigDecimal target, String riskProfile) {
        String label = assetLabel(assetClass);
        if (action == TradeAction.SELL) {
            return "Reduces " + label + " from " + current + "% to " + target + "%, matching your "
                    + riskProfile + " target.";
        }
        return "Increases " + label + " from " + current + "% to " + target + "%, " + benefitPhrase(assetClass) + ".";
    }

    private static String assetLabel(AssetClass assetClass) {
        return switch (assetClass) {
            case BONDS -> "bond allocation";
            case DOMESTIC -> "total-market equity";
            case INTL -> "international allocation";
            case REAL_ESTATE -> "real estate";
        };
    }

    private static String benefitPhrase(AssetClass assetClass) {
        return switch (assetClass) {
            case BONDS -> "improving downside protection";
            case DOMESTIC -> "staying invested in market growth";
            case INTL -> "increasing diversification";
            case REAL_ESTATE -> "trimming an overweight position";
        };
    }
}

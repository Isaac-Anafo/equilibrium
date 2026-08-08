package com.equilibrium.rebalance;

import jakarta.validation.constraints.NotBlank;

import java.math.BigDecimal;
import java.util.List;

public final class RebalanceDtos {
    private RebalanceDtos() {
    }

    public record ProposalView(String ticker, String name, String action, BigDecimal shares, BigDecimal amount,
                               BigDecimal cost, String rationale) {
    }

    public record EventView(String date, String trigger, int trades, String cost) {
    }

    public record ExecuteRequest(@NotBlank String requestId) {
    }

    public record PositionAfterView(String ticker, String name, BigDecimal current, BigDecimal target,
                                    BigDecimal delta, BigDecimal value) {
    }

    public record ExecuteResponse(int executedTrades, BigDecimal totalAmount, BigDecimal totalCost,
                                  BigDecimal portfolioValue, EventView event, List<PositionAfterView> positions) {
    }
}

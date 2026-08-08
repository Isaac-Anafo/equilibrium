package com.equilibrium.portfolio;

import com.fasterxml.jackson.annotation.JsonProperty;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;

import java.math.BigDecimal;
import java.time.OffsetDateTime;
import java.util.List;
import java.util.UUID;

public final class PortfolioDtos {
    private PortfolioDtos() {
    }

    public record HoldingInput(String ticker, String name, String shares, String price) {
    }

    public record CreatePortfolioRequest(@NotBlank String name,
                                         @NotNull RiskProfile riskProfile,
                                         BigDecimal driftThreshold,
                                         List<HoldingInput> holdings) {
    }

    public record PortfolioView(UUID id, String name, RiskProfile riskProfile) {
    }

    public record SummaryResponse(BigDecimal value, BigDecimal totalReturn, BigDecimal dayReturn,
                                  BigDecimal driftPct, BigDecimal threshold, OffsetDateTime asOf) {
    }

    public record HoldingsRowView(String ticker, String name, BigDecimal current, BigDecimal target,
                                  BigDecimal value, BigDecimal delta) {
    }

    public record TargetAllocationView(@JsonProperty("bonds") BigDecimal bonds,
                                       @JsonProperty("domestic") BigDecimal domestic,
                                       @JsonProperty("intl") BigDecimal intl,
                                       @JsonProperty("real_estate") BigDecimal realEstate) {
    }

    public record TargetAllocationRequest(@JsonProperty("bonds") @NotNull BigDecimal bonds,
                                          @JsonProperty("domestic") @NotNull BigDecimal domestic,
                                          @JsonProperty("intl") @NotNull BigDecimal intl,
                                          @JsonProperty("real_estate") @NotNull BigDecimal realEstate) {
    }

    public record ThresholdView(BigDecimal threshold) {
    }

    public record ThresholdRequest(@NotNull BigDecimal threshold) {
    }

    public record AutoApproveView(boolean autoApprove) {
    }

    public record AutoApproveRequest(@NotNull Boolean autoApprove) {
    }
}

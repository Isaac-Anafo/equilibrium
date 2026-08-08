package com.equilibrium.analytics;

import java.math.BigDecimal;
import java.util.List;

public final class AnalyticsDtos {
    private AnalyticsDtos() {
    }

    public record ChartPoint(String date, BigDecimal portfolio, BigDecimal benchmark) {
    }

    public record MetricView(String key, String label, String value, String gloss) {
    }

    public record MetricsBundle(List<MetricView> metrics) {
    }
}

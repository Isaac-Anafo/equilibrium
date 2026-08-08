package com.equilibrium.analytics;

import com.equilibrium.portfolio.Portfolio;
import com.equilibrium.portfolio.PortfolioAccessGuard;
import com.equilibrium.portfolio.Position;
import com.equilibrium.portfolio.PositionRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.LocalDate;
import java.time.format.DateTimeFormatter;
import java.util.ArrayList;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.TreeMap;
import java.util.UUID;
import java.util.stream.Collectors;

@Service
public class AnalyticsService {

    private static final DateTimeFormatter DATE_LABEL = DateTimeFormatter.ofPattern("MMM d", Locale.ENGLISH);
    private static final double DAYS_PER_YEAR = 252.0;

    private final PortfolioAccessGuard accessGuard;
    private final PositionRepository positionRepository;
    private final PositionPriceRepository priceRepository;
    private final BenchmarkPriceRepository benchmarkRepository;

    public AnalyticsService(PortfolioAccessGuard accessGuard,
                            PositionRepository positionRepository,
                            PositionPriceRepository priceRepository,
                            BenchmarkPriceRepository benchmarkRepository) {
        this.accessGuard = accessGuard;
        this.positionRepository = positionRepository;
        this.priceRepository = priceRepository;
        this.benchmarkRepository = benchmarkRepository;
    }

    @Transactional(readOnly = true)
    public List<AnalyticsDtos.ChartPoint> performance(UUID userId, UUID portfolioId, String range) {
        Portfolio portfolio = accessGuard.requireOwner(portfolioId, userId);
        List<Position> positions = positionRepository.findByPortfolio(portfolio);
        if (positions.isEmpty()) {
            return List.of();
        }

        LocalDate end = latestDate(positions);
        LocalDate start = startForRange(range, positions, end);
        if (start == null || end == null) {
            return List.of();
        }

        List<UUID> positionIds = positions.stream().map(Position::getId).toList();
        List<PositionPrice> prices = "All".equals(range)
                ? priceRepository.findByPositionIdInAndAsOfGreaterThanEqualOrderByAsOfAsc(positionIds, start)
                : priceRepository.findByPositionIdInAndAsOfBetweenOrderByAsOfAsc(positionIds, start, end);

        Map<UUID, Position> byId = positions.stream()
                .collect(Collectors.toMap(Position::getId, p -> p));
        TreeMap<LocalDate, BigDecimal> portfolioValues = new TreeMap<>();
        for (PositionPrice price : prices) {
            Position position = byId.get(price.getPosition().getId());
            if (position == null) {
                continue;
            }
            BigDecimal contribution = position.getShares().multiply(price.getClose());
            portfolioValues.merge(price.getAsOf(), contribution, BigDecimal::add);
        }
        if (portfolioValues.size() < 2) {
            return List.of();
        }

        TreeMap<LocalDate, BigDecimal> benchmarkValues = new TreeMap<>();
        benchmarkRepository.findByAsOfBetweenOrderByAsOfAsc(start, end)
                .forEach(b -> benchmarkValues.put(b.getAsOf(), b.getClose()));

        List<AnalyticsDtos.ChartPoint> points = new ArrayList<>();
        List<LocalDate> dates = new ArrayList<>(portfolioValues.keySet());
        LocalDate first = dates.get(0);
        BigDecimal portfolioBase = portfolioValues.get(first);
        Map.Entry<LocalDate, BigDecimal> firstBench = benchmarkValues.floorEntry(first);
        if (firstBench == null) {
            return List.of();
        }
        BigDecimal benchmarkBase = firstBench.getValue();

        for (int i = 0; i < dates.size(); i += 7) {
            LocalDate date = dates.get(i);
            points.add(point(date, portfolioValues.get(date), portfolioBase,
                    benchmarkValues, date, benchmarkBase));
        }
        LocalDate last = dates.get(dates.size() - 1);
        if (points.isEmpty() || !last.equals(dates.get((points.size() - 1) * 7))) {
            points.add(point(last, portfolioValues.get(last), portfolioBase,
                    benchmarkValues, last, benchmarkBase));
        }
        return points;
    }

    @Transactional(readOnly = true)
    public List<AnalyticsDtos.MetricView> metrics(UUID userId, UUID portfolioId) {
        Portfolio portfolio = accessGuard.requireOwner(portfolioId, userId);
        List<Position> positions = positionRepository.findByPortfolio(portfolio);
        if (positions.isEmpty()) {
            return List.of();
        }
        LocalDate end = latestDate(positions);
        LocalDate start = earliestDate(positions);
        if (start == null || end == null || !end.isAfter(start)) {
            return List.of();
        }
        List<UUID> positionIds = positions.stream().map(Position::getId).toList();
        List<PositionPrice> prices = priceRepository
                .findByPositionIdInAndAsOfBetweenOrderByAsOfAsc(positionIds, start, end);
        Map<UUID, Position> byId = positions.stream()
                .collect(Collectors.toMap(Position::getId, p -> p));
        TreeMap<LocalDate, BigDecimal> values = new TreeMap<>();
        for (PositionPrice price : prices) {
            Position position = byId.get(price.getPosition().getId());
            if (position != null) {
                values.merge(price.getAsOf(), position.getShares().multiply(price.getClose()), BigDecimal::add);
            }
        }
        return computeMetrics(values);
    }

    private LocalDate startForRange(String range, List<Position> positions, LocalDate end) {
        return switch (range) {
            case "1M" -> end.minusDays(28);
            case "6M" -> end.minusDays(182);
            case "All" -> earliestDate(positions);
            default -> end.minusDays(365);
        };
    }

    private LocalDate earliestDate(List<Position> positions) {
        LocalDate earliest = null;
        for (Position position : positions) {
            PositionPrice price = priceRepository.findTopByPositionIdOrderByAsOfAsc(position.getId())
                    .orElse(null);
            if (price != null && (earliest == null || price.getAsOf().isBefore(earliest))) {
                earliest = price.getAsOf();
            }
        }
        return earliest;
    }

    private LocalDate latestDate(List<Position> positions) {
        LocalDate latest = null;
        for (Position position : positions) {
            PositionPrice price = priceRepository.findTopByPositionIdOrderByAsOfDesc(position.getId())
                    .orElse(null);
            if (price != null && (latest == null || price.getAsOf().isAfter(latest))) {
                latest = price.getAsOf();
            }
        }
        return latest;
    }

    private AnalyticsDtos.ChartPoint point(LocalDate date, BigDecimal value, BigDecimal base,
                                           TreeMap<LocalDate, BigDecimal> benchmarkValues,
                                           LocalDate benchDate, BigDecimal benchBase) {
        BigDecimal normalized = value.divide(base, 8, RoundingMode.HALF_UP)
                .multiply(new BigDecimal("100"))
                .setScale(2, RoundingMode.HALF_UP);
        Map.Entry<LocalDate, BigDecimal> bench = benchmarkValues.floorEntry(benchDate);
        BigDecimal benchNormalized = BigDecimal.ZERO;
        if (bench != null) {
            benchNormalized = bench.getValue().divide(benchBase, 8, RoundingMode.HALF_UP)
                    .multiply(new BigDecimal("100"))
                    .setScale(2, RoundingMode.HALF_UP);
        }
        return new AnalyticsDtos.ChartPoint(DATE_LABEL.format(date), normalized, benchNormalized);
    }

    private List<AnalyticsDtos.MetricView> computeMetrics(TreeMap<LocalDate, BigDecimal> values) {
        List<Double> returns = new ArrayList<>();
        List<BigDecimal> ordered = new ArrayList<>(values.values());
        for (int i = 1; i < ordered.size(); i++) {
            double prev = ordered.get(i - 1).doubleValue();
            double curr = ordered.get(i).doubleValue();
            if (prev > 0) {
                returns.add(curr / prev - 1.0);
            }
        }
        if (returns.size() < 2) {
            return List.of();
        }
        double mean = returns.stream().mapToDouble(Double::doubleValue).average().orElse(0.0);
        double variance = returns.stream()
                .mapToDouble(r -> Math.pow(r - mean, 2))
                .average()
                .orElse(0.0);
        double stdDev = Math.sqrt(variance);
        double downsideVariance = returns.stream()
                .mapToDouble(r -> Math.min(r, 0.0))
                .map(r -> r * r)
                .average()
                .orElse(0.0);
        double downsideDev = Math.sqrt(downsideVariance);
        double annualVol = stdDev * Math.sqrt(DAYS_PER_YEAR);
        double annualReturn = mean * DAYS_PER_YEAR;
        double sharpe = annualVol > 0 ? annualReturn / annualVol : 0.0;
        double sortino = downsideDev > 0
                ? annualReturn / (downsideDev * Math.sqrt(DAYS_PER_YEAR))
                : 0.0;
        double peak = ordered.get(0).doubleValue();
        double maxDrawdown = 0.0;
        for (BigDecimal v : ordered) {
            double value = v.doubleValue();
            peak = Math.max(peak, value);
            if (peak > 0) {
                maxDrawdown = Math.min(maxDrawdown, value / peak - 1.0);
            }
        }
        return List.of(
                new AnalyticsDtos.MetricView("sharpe", "Sharpe ratio", fmt(sharpe, 2),
                        "Return earned per unit of risk taken. Higher is better."),
                new AnalyticsDtos.MetricView("sortino", "Sortino ratio", fmt(sortino, 2),
                        "Like Sharpe, but only penalises downside volatility."),
                new AnalyticsDtos.MetricView("vol", "Volatility", pct(annualVol, 1),
                        "Annualised standard deviation of monthly returns."),
                new AnalyticsDtos.MetricView("drawdown", "Max drawdown", pct(maxDrawdown, 1),
                        "Largest peak-to-trough decline in the period."));
    }

    private String fmt(double value, int scale) {
        return BigDecimal.valueOf(value).setScale(scale, RoundingMode.HALF_UP).toPlainString();
    }

    private String pct(double value, int scale) {
        return BigDecimal.valueOf(value * 100).setScale(scale, RoundingMode.HALF_UP).toPlainString() + "%";
    }
}

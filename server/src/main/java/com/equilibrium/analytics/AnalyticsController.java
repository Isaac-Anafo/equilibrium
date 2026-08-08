package com.equilibrium.analytics;

import com.equilibrium.common.ApiException;
import com.equilibrium.common.ErrorCodes;
import com.equilibrium.common.SecurityUtils;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;
import java.util.Set;
import java.util.UUID;

@RestController
@RequestMapping("/api/v1/portfolios/{id}")
public class AnalyticsController {

    private static final Set<String> VALID_RANGES = Set.of("1M", "6M", "1Y", "All");

    private final AnalyticsService analyticsService;

    public AnalyticsController(AnalyticsService analyticsService) {
        this.analyticsService = analyticsService;
    }

    @GetMapping("/performance")
    public List<AnalyticsDtos.ChartPoint> performance(@PathVariable UUID id,
                                                      @RequestParam(name = "range", defaultValue = "1Y") String range,
                                                      HttpServletResponse response) {
        if (!VALID_RANGES.contains(range)) {
            throw new ApiException(ErrorCodes.VALIDATION_ERROR, HttpStatus.BAD_REQUEST,
                    "range must be one of 1M, 6M, 1Y, All.");
        }
        response.setHeader("Cache-Control", "public, max-age=60");
        return analyticsService.performance(SecurityUtils.currentUserId(), id, range);
    }

    @GetMapping("/metrics")
    public List<AnalyticsDtos.MetricView> metrics(@PathVariable UUID id) {
        return analyticsService.metrics(SecurityUtils.currentUserId(), id);
    }
}

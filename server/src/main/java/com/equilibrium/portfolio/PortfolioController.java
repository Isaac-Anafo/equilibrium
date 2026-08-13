package com.equilibrium.portfolio;

import com.equilibrium.common.SecurityUtils;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/v1/portfolios")
public class PortfolioController {

    private final PortfolioService portfolioService;
    private final PortfolioActivityService activityService;

    public PortfolioController(PortfolioService portfolioService, PortfolioActivityService activityService) {
        this.portfolioService = portfolioService;
        this.activityService = activityService;
    }

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    public PortfolioDtos.PortfolioView create(@Valid @RequestBody PortfolioDtos.CreatePortfolioRequest request) {
        return portfolioService.create(SecurityUtils.currentUserId(), request);
    }

    @GetMapping("/me")
    public PortfolioDtos.PortfolioView me() {
        return portfolioService.myPortfolio(SecurityUtils.currentUserId());
    }

    @GetMapping("/{id}/summary")
    public PortfolioDtos.SummaryResponse summary(@PathVariable UUID id) {
        return portfolioService.summary(SecurityUtils.currentUserId(), id);
    }

    @GetMapping("/{id}/activity")
    public List<PortfolioDtos.ActivityView> activity(@PathVariable UUID id) {
        return activityService.list(SecurityUtils.currentUserId(), id);
    }

    @GetMapping("/{id}/holdings")
    public List<PortfolioDtos.HoldingsRowView> holdings(@PathVariable UUID id) {
        return portfolioService.holdings(SecurityUtils.currentUserId(), id);
    }

    @GetMapping("/{id}/target-allocation")
    public PortfolioDtos.TargetAllocationView getTargetAllocation(@PathVariable UUID id) {
        return portfolioService.getTargetAllocation(SecurityUtils.currentUserId(), id);
    }

    @PutMapping("/{id}/target-allocation")
    public PortfolioDtos.TargetAllocationView updateTargetAllocation(
            @PathVariable UUID id,
            @Valid @RequestBody PortfolioDtos.TargetAllocationRequest request) {
        return portfolioService.updateTargetAllocation(SecurityUtils.currentUserId(), id, request);
    }

    @GetMapping("/{id}/settings/drift-threshold")
    public PortfolioDtos.ThresholdView getThreshold(@PathVariable UUID id) {
        return portfolioService.getThreshold(SecurityUtils.currentUserId(), id);
    }

    @PutMapping("/{id}/settings/drift-threshold")
    public PortfolioDtos.ThresholdView updateThreshold(@PathVariable UUID id,
                                                       @Valid @RequestBody PortfolioDtos.ThresholdRequest request) {
        return portfolioService.updateThreshold(SecurityUtils.currentUserId(), id, request);
    }

    @GetMapping("/{id}/settings/auto-approve")
    public PortfolioDtos.AutoApproveView getAutoApprove(@PathVariable UUID id) {
        return portfolioService.getAutoApprove(SecurityUtils.currentUserId(), id);
    }

    @PutMapping("/{id}/settings/auto-approve")
    public PortfolioDtos.AutoApproveView updateAutoApprove(@PathVariable UUID id,
                                                           @Valid @RequestBody PortfolioDtos.AutoApproveRequest request) {
        return portfolioService.updateAutoApprove(SecurityUtils.currentUserId(), id, request);
    }
}

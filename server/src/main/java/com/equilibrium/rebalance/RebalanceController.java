package com.equilibrium.rebalance;

import com.equilibrium.common.SecurityUtils;
import jakarta.validation.Valid;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/v1/portfolios/{id}/rebalance")
public class RebalanceController {

    private final RebalanceService rebalanceService;

    public RebalanceController(RebalanceService rebalanceService) {
        this.rebalanceService = rebalanceService;
    }

    @GetMapping("/proposals")
    public List<RebalanceDtos.ProposalView> proposals(@PathVariable UUID id) {
        return rebalanceService.proposals(SecurityUtils.currentUserId(), id);
    }

    @PostMapping("/execute")
    public RebalanceDtos.ExecuteResponse execute(@PathVariable UUID id,
                                                 @Valid @RequestBody RebalanceDtos.ExecuteRequest request) {
        return rebalanceService.execute(SecurityUtils.currentUserId(), id, request);
    }

    @GetMapping("/log")
    public List<RebalanceDtos.EventView> log(@PathVariable UUID id) {
        return rebalanceService.log(SecurityUtils.currentUserId(), id);
    }
}

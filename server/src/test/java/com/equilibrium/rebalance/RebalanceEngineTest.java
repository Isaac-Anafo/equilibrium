package com.equilibrium.rebalance;

import com.equilibrium.portfolio.AssetClass;
import com.equilibrium.portfolio.DriftEngine;
import com.equilibrium.portfolio.Position;
import com.equilibrium.portfolio.TargetAllocation;
import org.junit.jupiter.api.Test;

import java.math.BigDecimal;
import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;

class RebalanceEngineTest {

    @Test
    void driftIsMaxAbsoluteDelta() {
        DriftEngine.Result drift = DriftEngine.compute(positions(), allocation());

        assertThat(drift.driftPct()).isEqualByComparingTo("5.0");
        assertThat(drift.totalValue()).isEqualByComparingTo("2000");
    }

    @Test
    void proposesOnlyPositionsBeyondThreshold() {
        List<RebalanceEngine.Proposal> proposals =
                RebalanceEngine.proposals(positions(), allocation(), new BigDecimal("3.5"),
                        BigDecimal.ZERO, "balanced");

        assertThat(proposals).hasSize(2);
        assertThat(proposals).extracting(RebalanceEngine.Proposal::ticker)
                .containsExactlyInAnyOrder("VXUS", "VNQ");

        RebalanceEngine.Proposal vxus = proposals.stream()
                .filter(p -> p.ticker().equals("VXUS")).findFirst().orElseThrow();
        assertThat(vxus.action()).isEqualTo(RebalanceEngine.TradeAction.SELL);
        assertThat(vxus.shares()).isEqualByComparingTo("20");
        assertThat(vxus.amount()).isEqualByComparingTo("100.00");
        assertThat(vxus.cost()).isEqualByComparingTo("0.00");

        RebalanceEngine.Proposal vnq = proposals.stream()
                .filter(p -> p.ticker().equals("VNQ")).findFirst().orElseThrow();
        assertThat(vnq.action()).isEqualTo(RebalanceEngine.TradeAction.BUY);
        assertThat(vnq.shares()).isEqualByComparingTo("100");
        assertThat(vnq.amount()).isEqualByComparingTo("100.00");
    }

    @Test
    void returnsNoProposalsWhenInBalance() {
        List<RebalanceEngine.Proposal> proposals =
                RebalanceEngine.proposals(positions(), allocation(), new BigDecimal("10"),
                        BigDecimal.ZERO, "balanced");

        assertThat(proposals).isEmpty();
    }

    @Test
    void splitsBucketWeightAcrossPositionsInBucket() {
        Position a = position("A", AssetClass.DOMESTIC, "100", "10");
        Position b = position("B", AssetClass.DOMESTIC, "100", "10");
        TargetAllocation allocation = allocation(0, 40, 0, 0);

        DriftEngine.Result drift = DriftEngine.compute(List.of(a, b), allocation);
        DriftEngine.DriftRow rowA = drift.rows().get(0);

        assertThat(rowA.target()).isEqualByComparingTo("20.0");
        assertThat(rowA.current()).isEqualByComparingTo("50.0");
        assertThat(rowA.delta()).isEqualByComparingTo("30.0");
    }

    private static List<Position> positions() {
        return List.of(
                position("VTI", AssetClass.DOMESTIC, "100", "10"),
                position("VXUS", AssetClass.INTL, "100", "5"),
                position("BND", AssetClass.BONDS, "100", "4"),
                position("VNQ", AssetClass.REAL_ESTATE, "100", "1"));
    }

    private static TargetAllocation allocation() {
        return allocation(20, 50, 20, 10);
    }

    private static TargetAllocation allocation(int bonds, int domestic, int intl, int realEstate) {
        TargetAllocation allocation = new TargetAllocation();
        allocation.setBonds(new BigDecimal(bonds));
        allocation.setDomestic(new BigDecimal(domestic));
        allocation.setIntl(new BigDecimal(intl));
        allocation.setRealEstate(new BigDecimal(realEstate));
        return allocation;
    }

    private static Position position(String ticker, AssetClass assetClass, String shares, String price) {
        Position position = new Position();
        position.setTicker(ticker);
        position.setName(ticker);
        position.setAssetClass(assetClass);
        position.setShares(new BigDecimal(shares));
        position.setPrice(new BigDecimal(price));
        return position;
    }
}

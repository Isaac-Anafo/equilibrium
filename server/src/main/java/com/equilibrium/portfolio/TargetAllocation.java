package com.equilibrium.portfolio;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.FetchType;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.OneToOne;
import jakarta.persistence.PrePersist;
import jakarta.persistence.PreUpdate;
import jakarta.persistence.Table;
import jakarta.persistence.Version;

import java.math.BigDecimal;
import java.time.OffsetDateTime;
import java.util.UUID;

@Entity
@Table(name = "target_allocations")
public class TargetAllocation {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @OneToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "portfolio_id", nullable = false, unique = true)
    private Portfolio portfolio;

    @Column(nullable = false, precision = 5, scale = 1)
    private BigDecimal bonds = new BigDecimal("40");

    @Column(nullable = false, precision = 5, scale = 1)
    private BigDecimal domestic = new BigDecimal("40");

    @Column(nullable = false, precision = 5, scale = 1)
    private BigDecimal intl = new BigDecimal("15");

    @Column(name = "real_estate", nullable = false, precision = 5, scale = 1)
    private BigDecimal realEstate = new BigDecimal("5");

    @Version
    @Column(nullable = false)
    private Long version;

    @Column(name = "updated_at", nullable = false)
    private OffsetDateTime updatedAt;

    @PrePersist
    void onCreate() {
        updatedAt = OffsetDateTime.now();
    }

    @PreUpdate
    void onUpdate() {
        updatedAt = OffsetDateTime.now();
    }

    public UUID getId() {
        return id;
    }

    public Portfolio getPortfolio() {
        return portfolio;
    }

    public void setPortfolio(Portfolio portfolio) {
        this.portfolio = portfolio;
    }

    public BigDecimal getBonds() {
        return bonds;
    }

    public void setBonds(BigDecimal bonds) {
        this.bonds = bonds;
    }

    public BigDecimal getDomestic() {
        return domestic;
    }

    public void setDomestic(BigDecimal domestic) {
        this.domestic = domestic;
    }

    public BigDecimal getIntl() {
        return intl;
    }

    public void setIntl(BigDecimal intl) {
        this.intl = intl;
    }

    public BigDecimal getRealEstate() {
        return realEstate;
    }

    public void setRealEstate(BigDecimal realEstate) {
        this.realEstate = realEstate;
    }

    public Long getVersion() {
        return version;
    }

    public OffsetDateTime getUpdatedAt() {
        return updatedAt;
    }
}

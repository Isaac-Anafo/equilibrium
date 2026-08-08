package com.equilibrium.portfolio;

import com.fasterxml.jackson.annotation.JsonCreator;
import com.fasterxml.jackson.annotation.JsonValue;

import java.util.Locale;

public enum RiskProfile {
    CONSERVATIVE, BALANCED, GROWTH;

    @JsonValue
    public String lower() {
        return name().toLowerCase(Locale.ROOT);
    }

    @JsonCreator
    public static RiskProfile from(String value) {
        return RiskProfile.valueOf(value.toUpperCase(Locale.ROOT));
    }
}

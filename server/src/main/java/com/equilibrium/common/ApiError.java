package com.equilibrium.common;

import java.util.Map;

public record ApiError(String code, String message, int status, Map<String, String> fieldErrors) {

    public record Envelope(ApiError error) {
    }
}

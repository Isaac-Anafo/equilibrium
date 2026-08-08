package com.equilibrium.common;

import org.springframework.http.HttpStatus;

import java.util.Map;

public class ApiException extends RuntimeException {

    private final String code;
    private final HttpStatus status;
    private final Map<String, String> fieldErrors;

    public ApiException(String code, HttpStatus status, String message) {
        this(code, status, message, Map.of());
    }

    public ApiException(String code, HttpStatus status, String message, Map<String, String> fieldErrors) {
        super(message);
        this.code = code;
        this.status = status;
        this.fieldErrors = fieldErrors == null ? Map.of() : fieldErrors;
    }

    public String getCode() {
        return code;
    }

    public HttpStatus getStatus() {
        return status;
    }

    public Map<String, String> getFieldErrors() {
        return fieldErrors;
    }
}

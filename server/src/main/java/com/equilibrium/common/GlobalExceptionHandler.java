package com.equilibrium.common;

import jakarta.validation.ConstraintViolationException;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.dao.OptimisticLockingFailureException;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.http.converter.HttpMessageNotReadableException;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;
import org.springframework.web.method.annotation.MethodArgumentTypeMismatchException;

import java.util.LinkedHashMap;
import java.util.Map;

@RestControllerAdvice
public class GlobalExceptionHandler {

    private static final Logger log = LoggerFactory.getLogger(GlobalExceptionHandler.class);

    @ExceptionHandler(ApiException.class)
    public ResponseEntity<ApiError.Envelope> handleApi(ApiException ex) {
        ApiError error = new ApiError(ex.getCode(), ex.getMessage(), ex.getStatus().value(), ex.getFieldErrors());
        return ResponseEntity.status(ex.getStatus()).body(new ApiError.Envelope(error));
    }

    @ExceptionHandler(MethodArgumentNotValidException.class)
    public ResponseEntity<ApiError.Envelope> handleValidation(MethodArgumentNotValidException ex) {
        Map<String, String> fieldErrors = new LinkedHashMap<>();
        ex.getBindingResult().getFieldErrors()
                .forEach(fe -> fieldErrors.putIfAbsent(fe.getField(), fe.getDefaultMessage()));
        ApiError error = new ApiError(ErrorCodes.VALIDATION_ERROR,
                "Please check the submitted values.", HttpStatus.BAD_REQUEST.value(), fieldErrors);
        return ResponseEntity.badRequest().body(new ApiError.Envelope(error));
    }

    @ExceptionHandler({ConstraintViolationException.class, MethodArgumentTypeMismatchException.class})
    public ResponseEntity<ApiError.Envelope> handleConstraintViolation(Exception ex) {
        ApiError error = new ApiError(ErrorCodes.VALIDATION_ERROR,
                "Invalid request value.", HttpStatus.BAD_REQUEST.value(), Map.of());
        return ResponseEntity.badRequest().body(new ApiError.Envelope(error));
    }

    @ExceptionHandler(HttpMessageNotReadableException.class)
    public ResponseEntity<ApiError.Envelope> handleUnreadable(HttpMessageNotReadableException ex) {
        ApiError error = new ApiError(ErrorCodes.VALIDATION_ERROR,
                "Malformed JSON or invalid value.", HttpStatus.BAD_REQUEST.value(), Map.of());
        return ResponseEntity.badRequest().body(new ApiError.Envelope(error));
    }

    @ExceptionHandler(AccessDeniedException.class)
    public ResponseEntity<ApiError.Envelope> handleAccessDenied(AccessDeniedException ex) {
        ApiError error = new ApiError(ErrorCodes.FORBIDDEN,
                "You do not have access to this resource.", HttpStatus.FORBIDDEN.value(), Map.of());
        return ResponseEntity.status(HttpStatus.FORBIDDEN).body(new ApiError.Envelope(error));
    }

    @ExceptionHandler(OptimisticLockingFailureException.class)
    public ResponseEntity<ApiError.Envelope> handleStaleWrite(OptimisticLockingFailureException ex) {
        ApiError error = new ApiError(ErrorCodes.CONFLICT,
                "The resource was modified by another request. Please refresh and try again.",
                HttpStatus.CONFLICT.value(), Map.of());
        return ResponseEntity.status(HttpStatus.CONFLICT).body(new ApiError.Envelope(error));
    }

    @ExceptionHandler(Exception.class)
    public ResponseEntity<ApiError.Envelope> handleUnexpected(Exception ex) {
        log.error("Unhandled error", ex);
        ApiError error = new ApiError(ErrorCodes.INTERNAL_ERROR,
                "An unexpected error occurred.", HttpStatus.INTERNAL_SERVER_ERROR.value(), Map.of());
        return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(new ApiError.Envelope(error));
    }
}

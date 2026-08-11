package com.equilibrium.common;

import com.fasterxml.jackson.databind.ObjectMapper;
import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.MediaType;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;

import java.io.IOException;
import java.nio.charset.StandardCharsets;
import java.util.List;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.atomic.AtomicLong;

@Component
public class RateLimitFilter extends OncePerRequestFilter {

    private static final List<String> LIMITED_PATHS = List.of(
            "/api/v1/auth/signin", "/api/v1/auth/signup", "/api/v1/auth/refresh",
            "/api/v1/auth/forgot-password", "/api/v1/auth/reset-password",
            "/api/v1/chat");

    private final ObjectMapper objectMapper;
    private final Map<String, Window> windows = new ConcurrentHashMap<>();
    private final int limitPerMinute;

    public RateLimitFilter(ObjectMapper objectMapper,
                           @Value("${app.auth.login-rate-limit-per-minute:10}") int limitPerMinute) {
        this.objectMapper = objectMapper;
        this.limitPerMinute = limitPerMinute;
    }

    @Override
    protected void doFilterInternal(HttpServletRequest request, HttpServletResponse response, FilterChain chain)
            throws ServletException, IOException {
        if (!LIMITED_PATHS.contains(request.getRequestURI())) {
            chain.doFilter(request, response);
            return;
        }
        String key = clientKey(request);
        long now = System.currentTimeMillis();
        Window window = windows.compute(key, (k, existing) -> {
            if (existing == null || now - existing.start() >= 60_000) {
                return new Window(now, new AtomicLong(1));
            }
            existing.count().incrementAndGet();
            return existing;
        });
        if (window.count().get() > limitPerMinute) {
            writeTooManyRequests(response);
            return;
        }
        chain.doFilter(request, response);
    }

    private String clientKey(HttpServletRequest request) {
        String xff = request.getHeader("X-Forwarded-For");
        String ip = xff != null && !xff.isBlank() ? xff.split(",")[0].trim() : request.getRemoteAddr();
        return ip == null ? "unknown" : ip;
    }

    private void writeTooManyRequests(HttpServletResponse response) throws IOException {
        response.setStatus(429);
        response.setContentType(MediaType.APPLICATION_JSON_VALUE);
        response.setCharacterEncoding(StandardCharsets.UTF_8.name());
        response.setHeader("Cache-Control", "no-store");
        ApiError.Envelope body = new ApiError.Envelope(new ApiError(
                ErrorCodes.TOO_MANY_REQUESTS,
                "Too many requests. Please try again later.",
                429, Map.of()));
        objectMapper.writeValue(response.getWriter(), body);
    }

    private record Window(long start, AtomicLong count) {
    }
}

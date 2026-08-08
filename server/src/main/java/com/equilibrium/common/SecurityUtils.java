package com.equilibrium.common;

import org.springframework.http.HttpStatus;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;

import java.util.UUID;

public final class SecurityUtils {
    private SecurityUtils() {
    }

    public static CurrentUser currentUser() {
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        if (auth != null && auth.getPrincipal() instanceof CurrentUser cu) {
            return cu;
        }
        throw new ApiException(ErrorCodes.UNAUTHORIZED, HttpStatus.UNAUTHORIZED, "Authentication required.");
    }

    public static UUID currentUserId() {
        return currentUser().id();
    }
}

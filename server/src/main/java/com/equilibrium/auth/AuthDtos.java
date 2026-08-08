package com.equilibrium.auth;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public final class AuthDtos {
    private AuthDtos() {
    }

    public record SignInRequest(@NotBlank @Email String email, @NotBlank String password) {
    }

    public record SignUpRequest(@NotBlank @Email String email,
                                @NotBlank @Size(min = 8) String password,
                                String displayName) {
    }

    public record RefreshRequest(@NotBlank String refreshToken) {
    }

    public record ForgotPasswordRequest(@NotBlank @Email String email) {
    }

    public record ResetPasswordRequest(@NotBlank String token, @NotBlank @Size(min = 8) String newPassword) {
    }

    public record SignOutRequest(String refreshToken) {
    }

    public record UserView(String email, String displayName) {
    }

    public record TokenResponse(String accessToken, String refreshToken, long expiresIn, String tokenType,
                                UserView user) {
    }

    public record MessageResponse(String message) {
    }
}

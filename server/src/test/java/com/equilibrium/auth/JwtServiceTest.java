package com.equilibrium.auth;

import org.junit.jupiter.api.Test;

import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

class JwtServiceTest {

    private final JwtService jwtService = new JwtService(
            "unit-test-secret-key-that-is-longer-than-thirty-two-bytes-long",
            "equilibrium-api", 15);

    @Test
    void createsTokenWithExpectedClaims() {
        UUID userId = UUID.randomUUID();

        String token = jwtService.createAccessToken(userId, "you@example.com");
        JwtService.AccessToken parsed = jwtService.parse(token);

        assertThat(parsed.userId()).isEqualTo(userId);
        assertThat(parsed.email()).isEqualTo("you@example.com");
    }

    @Test
    void exposesAccessTtlInSeconds() {
        assertThat(jwtService.accessTtlSeconds()).isEqualTo(900);
    }

    @Test
    void rejectsTamperedToken() {
        UUID userId = UUID.randomUUID();
        String token = jwtService.createAccessToken(userId, "you@example.com");
        String[] parts = token.split("\\.");
        parts[1] = new StringBuilder(parts[1]).reverse().toString();
        String tampered = String.join(".", parts);

        assertThatThrownBy(() -> jwtService.parse(tampered))
                .isInstanceOf(Exception.class);
    }

    @Test
    void rejectsWrongSecret() {
        JwtService other = new JwtService(
                "another-unit-test-secret-key-that-is-longer-than-thirty-two-bytes",
                "equilibrium-api", 15);
        String token = jwtService.createAccessToken(UUID.randomUUID(), "you@example.com");

        assertThatThrownBy(() -> other.parse(token))
                .isInstanceOf(Exception.class);
    }

    @Test
    void rejectsWrongIssuer() {
        JwtService other = new JwtService(
                "unit-test-secret-key-that-is-longer-than-thirty-two-bytes-long",
                "some-other-issuer", 15);
        String token = jwtService.createAccessToken(UUID.randomUUID(), "you@example.com");

        assertThatThrownBy(() -> other.parse(token))
                .isInstanceOf(Exception.class);
    }
}

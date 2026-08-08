package com.equilibrium.auth;

import com.equilibrium.common.ApiException;
import com.equilibrium.common.ErrorCodes;
import com.equilibrium.notification.NotificationPreference;
import com.equilibrium.notification.NotificationPreferenceRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatus;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.security.SecureRandom;
import java.time.OffsetDateTime;
import java.util.Base64;
import java.util.Locale;
import java.util.Optional;
import java.util.UUID;

@Service
public class AuthService {

    private static final Logger log = LoggerFactory.getLogger(AuthService.class);
    private static final String DUMMY_HASH = "$2a$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL17lhWy";

    private final UserRepository userRepository;
    private final RefreshTokenRepository refreshTokenRepository;
    private final PasswordResetTokenRepository resetTokenRepository;
    private final NotificationPreferenceRepository preferenceRepository;
    private final PasswordEncoder passwordEncoder;
    private final JwtService jwtService;
    private final SecureRandom secureRandom = new SecureRandom();
    private final long refreshTtlDays;
    private final long resetTtlMinutes;

    public AuthService(UserRepository userRepository,
                       RefreshTokenRepository refreshTokenRepository,
                       PasswordResetTokenRepository resetTokenRepository,
                       NotificationPreferenceRepository preferenceRepository,
                       PasswordEncoder passwordEncoder,
                       JwtService jwtService,
                       @Value("${app.jwt.refresh-ttl-days:30}") long refreshTtlDays,
                       @Value("${app.auth.reset-token-ttl-minutes:30}") long resetTtlMinutes) {
        this.userRepository = userRepository;
        this.refreshTokenRepository = refreshTokenRepository;
        this.resetTokenRepository = resetTokenRepository;
        this.preferenceRepository = preferenceRepository;
        this.passwordEncoder = passwordEncoder;
        this.jwtService = jwtService;
        this.refreshTtlDays = refreshTtlDays;
        this.resetTtlMinutes = resetTtlMinutes;
    }

    @Transactional
    public AuthDtos.TokenResponse signUp(AuthDtos.SignUpRequest request) {
        String email = normalizeEmail(request.email());
        if (userRepository.existsByEmail(email)) {
            throw new ApiException(ErrorCodes.EMAIL_TAKEN, HttpStatus.CONFLICT,
                    "An account with this email already exists.");
        }
        User user = new User();
        user.setEmail(email);
        user.setPasswordHash(passwordEncoder.encode(request.password()));
        user.setDisplayName(request.displayName());
        userRepository.save(user);

        NotificationPreference prefs = new NotificationPreference();
        prefs.setUserId(user.getId());
        prefs.setEmail(true);
        prefs.setPush(false);
        preferenceRepository.save(prefs);

        return issueTokenPair(user);
    }

    @Transactional
    public AuthDtos.TokenResponse signIn(AuthDtos.SignInRequest request) {
        String email = normalizeEmail(request.email());
        Optional<User> found = userRepository.findByEmail(email);
        if (found.isEmpty()) {
            passwordEncoder.matches(request.password(), DUMMY_HASH);
            throw new ApiException(ErrorCodes.UNAUTHORIZED, HttpStatus.UNAUTHORIZED, "Incorrect email or password.");
        }
        User user = found.get();
        if (user.getPasswordHash() == null || !passwordEncoder.matches(request.password(), user.getPasswordHash())) {
            throw new ApiException(ErrorCodes.UNAUTHORIZED, HttpStatus.UNAUTHORIZED, "Incorrect email or password.");
        }
        return issueTokenPair(user);
    }

    @Transactional
    public AuthDtos.TokenResponse refresh(AuthDtos.RefreshRequest request) {
        String hash = TokenHasher.sha256Hex(request.refreshToken());
        RefreshToken token = refreshTokenRepository.findByTokenHash(hash)
                .orElseThrow(() -> new ApiException(ErrorCodes.UNAUTHORIZED, HttpStatus.UNAUTHORIZED,
                        "Invalid refresh token."));
        if (token.isRevoked()) {
            refreshTokenRepository.revokeAllByUserId(token.getUser().getId());
            throw new ApiException(ErrorCodes.UNAUTHORIZED, HttpStatus.UNAUTHORIZED, "Invalid refresh token.");
        }
        if (token.getExpiresAt().isBefore(OffsetDateTime.now())) {
            throw new ApiException(ErrorCodes.UNAUTHORIZED, HttpStatus.UNAUTHORIZED, "Invalid refresh token.");
        }
        token.setRevoked(true);
        refreshTokenRepository.save(token);

        User user = token.getUser();
        String rawRefresh = randomOpaqueToken();
        RefreshToken next = new RefreshToken();
        next.setUser(user);
        next.setTokenHash(TokenHasher.sha256Hex(rawRefresh));
        next.setExpiresAt(OffsetDateTime.now().plusDays(refreshTtlDays));
        next.setReplacedBy(token.getId());
        refreshTokenRepository.save(next);

        return buildTokenResponse(user, rawRefresh);
    }

    @Transactional(readOnly = true)
    public AuthDtos.UserView me(UUID userId) {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new ApiException(ErrorCodes.UNAUTHORIZED, HttpStatus.UNAUTHORIZED,
                        "Authentication required."));
        return new AuthDtos.UserView(user.getEmail(), user.getDisplayName());
    }

    @Transactional
    public AuthDtos.MessageResponse forgotPassword(AuthDtos.ForgotPasswordRequest request) {
        String email = normalizeEmail(request.email());
        userRepository.findByEmail(email).ifPresent(user -> {
            PasswordResetToken token = new PasswordResetToken();
            String raw = randomOpaqueToken();
            token.setUser(user);
            token.setTokenHash(TokenHasher.sha256Hex(raw));
            token.setExpiresAt(OffsetDateTime.now().plusMinutes(resetTtlMinutes));
            resetTokenRepository.save(token);
            log.info("Password reset token for {}: {}", email, raw);
        });
        return new AuthDtos.MessageResponse("If an account exists, a reset link has been sent.");
    }

    @Transactional
    public void resetPassword(AuthDtos.ResetPasswordRequest request) {
        PasswordResetToken token = resetTokenRepository.findByTokenHash(TokenHasher.sha256Hex(request.token()))
                .orElseThrow(this::invalidResetToken);
        if (token.getUsedAt() != null || token.getExpiresAt().isBefore(OffsetDateTime.now())) {
            throw invalidResetToken();
        }
        User user = token.getUser();
        user.setPasswordHash(passwordEncoder.encode(request.newPassword()));
        token.setUsedAt(OffsetDateTime.now());
        userRepository.save(user);
        resetTokenRepository.save(token);
        refreshTokenRepository.revokeAllByUserId(user.getId());
    }

    @Transactional
    public void signOut(AuthDtos.SignOutRequest request) {
        if (request == null || request.refreshToken() == null || request.refreshToken().isBlank()) {
            return;
        }
        String hash = TokenHasher.sha256Hex(request.refreshToken());
        refreshTokenRepository.findByTokenHash(hash).ifPresent(token -> {
            token.setRevoked(true);
            refreshTokenRepository.save(token);
        });
    }

    private ApiException invalidResetToken() {
        return new ApiException(ErrorCodes.VALIDATION_ERROR, HttpStatus.BAD_REQUEST,
                "Invalid or expired reset token.");
    }

    private AuthDtos.TokenResponse issueTokenPair(User user) {
        String rawRefresh = randomOpaqueToken();
        RefreshToken token = new RefreshToken();
        token.setUser(user);
        token.setTokenHash(TokenHasher.sha256Hex(rawRefresh));
        token.setExpiresAt(OffsetDateTime.now().plusDays(refreshTtlDays));
        refreshTokenRepository.save(token);
        return buildTokenResponse(user, rawRefresh);
    }

    private AuthDtos.TokenResponse buildTokenResponse(User user, String rawRefresh) {
        return new AuthDtos.TokenResponse(
                jwtService.createAccessToken(user.getId(), user.getEmail()),
                rawRefresh,
                jwtService.accessTtlSeconds(),
                "Bearer",
                new AuthDtos.UserView(user.getEmail(), user.getDisplayName()));
    }

    private String randomOpaqueToken() {
        byte[] bytes = new byte[32];
        secureRandom.nextBytes(bytes);
        return Base64.getUrlEncoder().withoutPadding().encodeToString(bytes);
    }

    private String normalizeEmail(String email) {
        return email == null ? null : email.trim().toLowerCase(Locale.ROOT);
    }
}

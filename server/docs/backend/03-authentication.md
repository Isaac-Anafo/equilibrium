# Authentication

The frontend supports two sign-in paths — **Google SSO** (currently a visual mock) and
**email/password** — and expects to receive a session it can hold onto. This backend makes
both real and issues stateless JWT access tokens with rotating refresh tokens.

## 1. Token model

| Token | Lifetime | Transport | Notes |
|---|---|---|---|
| **Access token** (JWT) | 15 min (`expiresIn: 900`) | `Authorization: Bearer` header | Stateless; carries `sub` (user id), `email`, `iat`, `exp`, `jti` |
| **Refresh token** (opaque) | 30 days | body of `POST /auth/refresh` | SHA-256 hashed at rest in `refresh_tokens`; rotated on every use |

- Access tokens are **stateless** — validated by signature + expiry, no DB hit.
- Refresh tokens are **stateful** (row in `refresh_tokens`) to support revocation and
  detection of token reuse. Rotation: on each `POST /auth/refresh`, the presented token is
  revoked and a new pair is issued (`replaced_by` chain).
- Store the refresh token in an `HttpOnly`/`Secure` cookie, or in memory on the SPA and send
  it in the request body. The API accepts either; cookies are recommended to keep it out of
  `localStorage` (the current mock stores `AuthUser` in `localStorage`, which is fine for the
  mock but not for real credentials).

### JWT claims

```json
{
  "sub": "3b4a2c91-...",   // user UUID
  "email": "you@example.com",
  "jti": "e7f3...",         // unique id (anti-replay)
  "iat": 1756756800,
  "exp": 1756757700
}
```

Signed with HS256 using a 64-byte secret (config: `app.jwt.secret`). Rotate the secret via
`jti` denylist or a key-rotation endpoint before cutting over in production.

## 2. Email/password flow

```
Client                        Server
  │  POST /auth/signin            │
  │  {email, password} ──────────▶│  1. Load user by email
  │                               │  2. BCrypt.matches(password, password_hash)
  │                               │  3. Issue access + refresh token pair
  │ ◀── {accessToken,             │  4. Persist refresh token (hashed)
  │      refreshToken, user}      │
```

- Passwords hashed with **BCrypt** (`BCryptPasswordEncoder`, strength 12).
- `401` on failure with a generic message ("Incorrect email or password.") — no
  user-enumeration signals. Account-exists timing differences are mitigated by running a
  dummy compare when the email is unknown.
- Sign-up (`POST /auth/signup`) validates password ≥ 8 chars (frontend enforces the same),
  hashes, creates the user + default `notification_preferences`, and returns a token pair
  (auto-login).

## 3. Google SSO flow (Authorization Code + PKCE)

The frontend's "Continue with Google" button currently does nothing. Wiring it up:

```
React SPA                          Google                          Backend
   │ 1. redirect to Google Auth      │                                │
   │    (client_id, code_challenge)─▶│ 2. user consents               │
   │ 3. redirect_uri?code=...&state= │                                │
   │ ◀───────────────────────────────│                                │
   │ 4. POST /auth/google            │                                │
   │    {code, codeVerifier} ────────▶                                 │
   │                                 │ 5. exchange code + verifier    │
   │                                 │    + client_secret ──────────▶ Google
   │                                 │ 6. id_token + user info ◀──────
   │                                 │ 7. find-or-create user by sub  │
   │ ◀── {accessToken,               │ 8. issue token pair            │
   │      refreshToken, user}        │                                │
```

- Use **Authorization Code + PKCE** (`code_challenge`/`code_verifier`) — never implicit flow.
- `state` param prevents CSRF on the callback.
- Backend exchanges the code with Google using the configured client id/secret
  (`spring.security.oauth2.client.registration.google`), then verifies the `id_token`
  signature and audience.
- **User linking**: match on `google_subject` first; else on `email`; if neither exists,
  create a new user with `provider = 'GOOGLE'` (no password hash). If an email match exists
  for a `LOCAL` user, link the Google subject to that account (ask for re-auth if the email
  is already verified elsewhere — keep simple: link directly, documented here as a decision).
- `POST /auth/google` response is identical to sign-in, so `SignIn.tsx`/`StepAccount.tsx`
  need no changes beyond actually invoking the endpoint.

## 4. Forgot / reset password

1. `POST /auth/forgot-password` — create a single-use `password_reset_tokens` row (hash
   stored, 30-min expiry), send a link to the email containing the raw token. Always `200`
   (no enumeration). Email sending is out of scope for the mock (visual only).
2. `POST /auth/reset-password` — verify hash + expiry, `BCrypt` the new password, revoke the
   token, and revoke all refresh tokens for the user (forces re-login everywhere).

## 5. Sign out

The backend is stateless for access tokens; sign-out is **client-side** (discard tokens) plus
a server call to revoke the refresh token:

```
POST /auth/signout        { "refreshToken": "..." }   → 204, revokes row
```

Add this endpoint if the team wants full server-side revocation; the frontend's current
`signOut()` clears local state either way.

## 6. Request guard / SecurityFilterChain

```java
http
  .csrf(csrf -> csrf.disable())                       // stateless JWT API
  .sessionManagement(s -> s.sessionCreationPolicy(STATELESS))
  .authorizeHttpRequests(auth -> auth
      .requestMatchers(
          "/api/v1/auth/signin", "/api/v1/auth/signup", "/api/v1/auth/google",
          "/api/v1/auth/refresh", "/api/v1/auth/forgot-password",
          "/api/v1/auth/reset-password", "/swagger-ui/**", "/v3/api-docs/**"
      ).permitAll()
      .requestMatchers("/api/v1/**").authenticated()
      .anyRequest().permitAll())
  .oauth2Login(...)                                   // only if Google callback handled by backend
  .addFilterBefore(jwtAuthenticationFilter, UsernamePasswordAuthenticationFilter.class)
  .exceptionHandling(e -> e
      .authenticationEntryPoint(restAuthEntryPoint)   // → 401 JSON envelope
      .accessDeniedHandler(restAccessDeniedHandler)); // → 403 JSON envelope
```

`JwtAuthenticationFilter`:
1. Read `Authorization: Bearer <token>`.
2. Parse + verify signature/expiry with `JwtService`.
3. Load authorities from the `sub` claim and set `SecurityContext`.
4. On failure, leave the context empty → entry point returns the 401 envelope.

## 7. Authorization

- Ownership checks: every portfolio-scoped controller asserts `portfolio.userId == currentUser.id`
  before serving data → otherwise `403 FORBIDDEN`. A small `PortfolioAccessGuard` (or
  `@PortfolioOwner` AOP advice) centralizes this.
- No role-based access in the current product (single user tier); keep the `ROLE_USER`
  authority for future expansion.

## 8. Security notes

- Never log raw tokens or passwords.
- `Cache-Control: no-store` on all auth responses.
- Rate-limit auth endpoints (e.g. 10/min per IP on `/auth/signin`, `/auth/google`,
  `/auth/forgot-password`) → `429`.
- Refresh-token reuse detection: if a revoked token is presented again, revoke the entire
  `replaced_by` chain and all of the user's sessions (theft signal).
- CORS: allow the SPA origin (`app.equilibrium.dev`) with credentials (cookies) — see
  [06-application-config.yml.md](06-application-config.yml.md).

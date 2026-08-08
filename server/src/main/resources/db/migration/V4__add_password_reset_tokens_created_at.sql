-- password_reset_tokens.created_at is required by the PasswordResetToken entity but was
-- missing from the original V1 schema. Backfill and add as NOT NULL.
ALTER TABLE password_reset_tokens
    ADD COLUMN created_at TIMESTAMPTZ NOT NULL DEFAULT now();
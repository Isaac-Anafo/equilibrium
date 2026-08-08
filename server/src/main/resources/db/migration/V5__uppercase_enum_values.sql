-- V5__uppercase_enum_values.sql
-- @Enumerated(EnumType.STRING) stores the enum constant NAME (uppercase), but the V3
-- seed inserted lowercase values ('balanced', 'drift', 'system'). Those rows fail to
-- read with "No enum constant ..." and return HTTP 500. Normalize them here.
UPDATE portfolios SET risk_profile = UPPER(risk_profile) WHERE risk_profile <> UPPER(risk_profile);
UPDATE notifications SET type = UPPER(type) WHERE type <> UPPER(type);

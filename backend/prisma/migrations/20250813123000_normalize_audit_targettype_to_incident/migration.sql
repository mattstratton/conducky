-- Normalize legacy audit targetType values from 'Report' to 'Incident'
-- Idempotent update guarded by WHERE clause

BEGIN;

UPDATE "AuditLog"
SET "targetType" = 'Incident'
WHERE "targetType" = 'Report';

COMMIT;

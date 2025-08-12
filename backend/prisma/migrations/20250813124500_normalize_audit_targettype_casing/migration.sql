-- Normalize any casing variants of 'report' to 'Incident'
BEGIN;

UPDATE "AuditLog"
SET "targetType" = 'Incident'
WHERE lower("targetType") = 'report';

COMMIT;

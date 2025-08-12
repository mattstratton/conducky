-- Insert default unified roles needed for system functionality
-- This ensures roles exist before any user registration attempts

INSERT INTO "UnifiedRole" ("id", "name", "scope", "level", "description", "createdAt", "updatedAt") VALUES
  (gen_random_uuid(), 'system_admin', 'system', 100, 'System administrator with global access', NOW(), NOW()),
  (gen_random_uuid(), 'org_admin', 'organization', 50, 'Organization administrator', NOW(), NOW()),
  (gen_random_uuid(), 'org_viewer', 'organization', 10, 'Organization viewer', NOW(), NOW()),
  (gen_random_uuid(), 'event_admin', 'event', 40, 'Event administrator', NOW(), NOW()),
  (gen_random_uuid(), 'responder', 'event', 20, 'Incident responder', NOW(), NOW()),
  (gen_random_uuid(), 'reporter', 'event', 5, 'Incident reporter', NOW(), NOW())
ON CONFLICT ("name") DO NOTHING;
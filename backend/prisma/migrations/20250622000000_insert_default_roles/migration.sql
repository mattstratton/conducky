-- Insert default roles if they don't exist
INSERT INTO "Role" (id, name) VALUES 
  (gen_random_uuid(), 'Reporter'),
  (gen_random_uuid(), 'Responder'),
  (gen_random_uuid(), 'Event Admin'),
  (gen_random_uuid(), 'SuperAdmin')
ON CONFLICT (name) DO NOTHING; 
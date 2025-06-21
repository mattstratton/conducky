-- Migration: Migrate existing events to organizations
-- This migration creates organizations for existing events and migrates the data

-- Step 1: Create organizations for existing events (only if no organizations exist yet)
INSERT INTO organizations (id, name, slug, description, website, created_at, updated_at, created_by)
SELECT 
  gen_random_uuid() as id,
  e.name || ' Organization' as name,
  e.slug || '-org' as slug,
  'Organization for ' || e.name as description,
  e.website_url as website,
  e.created_at,
  NOW() as updated_at,
  (
    -- Get the first event admin as the organization creator
    SELECT uer.user_id 
    FROM user_event_roles uer 
    JOIN roles r ON uer.role_id = r.id 
    WHERE uer.event_id = e.id 
    AND r.name IN ('Admin', 'Event Admin')
    LIMIT 1
  ) as created_by
FROM events e
WHERE e.organization_id IS NULL
AND NOT EXISTS (SELECT 1 FROM organizations LIMIT 1);

-- Step 2: Update events to link them to their corresponding organizations
UPDATE events 
SET organization_id = (
  SELECT o.id 
  FROM organizations o 
  WHERE o.slug = events.slug || '-org'
)
WHERE organization_id IS NULL
AND EXISTS (
  SELECT 1 
  FROM organizations o 
  WHERE o.slug = events.slug || '-org'
);

-- Step 3: Create organization memberships for event admins
INSERT INTO organization_memberships (id, organization_id, user_id, role, created_at, created_by)
SELECT 
  gen_random_uuid() as id,
  o.id as organization_id,
  uer.user_id,
  'org_admin' as role,
  NOW() as created_at,
  o.created_by
FROM organizations o
JOIN events e ON e.organization_id = o.id
JOIN user_event_roles uer ON uer.event_id = e.id
JOIN roles r ON uer.role_id = r.id
WHERE r.name IN ('Admin', 'Event Admin')
AND NOT EXISTS (
  SELECT 1 
  FROM organization_memberships om 
  WHERE om.organization_id = o.id 
  AND om.user_id = uer.user_id
);

-- Step 4: Handle events that couldn't be migrated (create a default organization)
DO $$
DECLARE
  default_org_id UUID;
  super_admin_id UUID;
BEGIN
  -- Check if there are still unmigrated events
  IF EXISTS (SELECT 1 FROM events WHERE organization_id IS NULL) THEN
    
    -- Get a SuperAdmin user to own the default organization
    SELECT uer.user_id INTO super_admin_id
    FROM user_event_roles uer
    JOIN roles r ON uer.role_id = r.id
    WHERE r.name = 'SuperAdmin'
    LIMIT 1;
    
    -- If no SuperAdmin found, get any admin user
    IF super_admin_id IS NULL THEN
      SELECT uer.user_id INTO super_admin_id
      FROM user_event_roles uer
      JOIN roles r ON uer.role_id = r.id
      WHERE r.name IN ('Admin', 'Event Admin')
      LIMIT 1;
    END IF;
    
    -- Create default organization
    INSERT INTO organizations (id, name, slug, description, created_at, updated_at, created_by)
    VALUES (
      gen_random_uuid(),
      'Default Organization',
      'default-org',
      'Default organization for migrated events',
      NOW(),
      NOW(),
      super_admin_id
    )
    RETURNING id INTO default_org_id;
    
    -- Link remaining events to default organization
    UPDATE events 
    SET organization_id = default_org_id
    WHERE organization_id IS NULL;
    
    -- Create organization memberships for admins of these events
    INSERT INTO organization_memberships (id, organization_id, user_id, role, created_at, created_by)
    SELECT DISTINCT
      gen_random_uuid(),
      default_org_id,
      uer.user_id,
      'org_admin',
      NOW(),
      super_admin_id
    FROM events e
    JOIN user_event_roles uer ON uer.event_id = e.id
    JOIN roles r ON uer.role_id = r.id
    WHERE e.organization_id = default_org_id
    AND r.name IN ('Admin', 'Event Admin')
    AND NOT EXISTS (
      SELECT 1 
      FROM organization_memberships om 
      WHERE om.organization_id = default_org_id 
      AND om.user_id = uer.user_id
    );
    
  END IF;
END $$; 
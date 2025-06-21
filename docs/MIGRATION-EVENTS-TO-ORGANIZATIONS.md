# Events to Organizations Migration Guide

This guide explains how to migrate existing events to the new organization structure in Conducky.

## Overview

The Organizations feature introduces a hierarchical structure where Events belong to Organizations. For existing installations, this migration will:

1. **Create organizations** for each existing event
2. **Link events** to their corresponding organizations  
3. **Convert event admins** to organization admins
4. **Preserve all existing data** and functionality

## Migration Methods

### Method 1: Schema + Data Migration (Recommended)

First apply the schema changes, then run the data migration:

```bash
# Step 1: Apply schema changes (creates organization tables)
docker-compose exec backend npx prisma migrate deploy

# Step 2: Run data migration (migrates existing events)
docker-compose exec backend npm run migrate:events-to-orgs
```

### Method 2: Manual Migration Script

If you need to run the migration separately or want more control:

```bash
# Using the provided shell script (Docker Compose)
./scripts/migrate-events-to-orgs.sh

# Or run directly in backend container
docker-compose exec backend npm run migrate:events-to-orgs

# Or locally
cd backend && npm run migrate:events-to-orgs
```

### Method 3: Railway/Production Deployment

For Railway or other production environments:

```bash
# Connect to your Railway project
railway login
railway link [your-project-id]

# Run migration
railway run npm run migrate:events-to-orgs
```

## What the Migration Does

### 1. Organization Creation
- Creates one organization per existing event
- Organization name: `{Event Name} Organization`
- Organization slug: `{event-slug}-org`
- Organization description: `Organization for {Event Name}`

### 2. Event Linking
- Links each event to its corresponding organization
- Updates the `organization_id` field in the events table

### 3. Admin Migration
- Finds all Event Admins for each event
- Creates organization memberships with `org_admin` role
- Preserves all existing event roles

### 4. Fallback Handling
- Events without admins are linked to a "Default Organization"
- SuperAdmin or any available admin becomes the default org owner

## Before Migration

### Prerequisites
- ✅ Database backup recommended
- ✅ Application should be stopped during migration
- ✅ Ensure you have admin users in your database

### Check Current State
```sql
-- Check events without organizations
SELECT id, name, slug FROM events WHERE organization_id IS NULL;

-- Check existing organizations
SELECT COUNT(*) FROM organizations;
```

## Running the Migration

### Docker Compose Environment

1. **Ensure containers are running:**
   ```bash
   docker-compose up -d
   ```

2. **Run migration:**
   ```bash
   ./scripts/migrate-events-to-orgs.sh
   ```

3. **Verify results:**
   ```bash
   # Check migration results
   docker-compose exec backend npx prisma studio
   ```

### Railway Production Environment

⚠️ **Important**: Railway deployment requires special care due to potential migration conflicts.

#### Pre-Deployment Checklist

1. **Check Railway database migration state:**
   ```bash
   railway login
   railway link [your-project-id]
   railway run npx prisma migrate status
   ```

2. **If you see failed migrations, resolve them first:**
   ```bash
   # Mark any failed organization migrations as resolved
   railway run npx prisma migrate resolve --applied 20241221000000_migrate_events_to_organizations
   
   # Then apply pending migrations
   railway run npx prisma migrate deploy
   ```

#### Deployment Steps

1. **Deploy the code changes:**
   ```bash
   git push # This deploys to Railway
   ```

2. **Apply schema migrations:**
   ```bash
   railway run npx prisma migrate deploy
   ```

3. **Run data migration:**
   ```bash
   railway run npm run migrate:events-to-orgs
   ```

4. **Verify deployment:**
   ```bash
   # Check organizations were created
   railway run npx prisma studio
   ```

#### Alternative: Clean Database Approach

If migration issues persist, you can reset Railway's database:

```bash
# ⚠️ WARNING: This will delete all data
railway run npx prisma migrate reset --force
railway run npm run seed
railway run npm run migrate:events-to-orgs
```

#### Troubleshooting Railway Issues

**Problem**: "relation 'organizations' does not exist"
**Solution**: Use proper case-sensitive table names in queries

**Problem**: "Failed migration found"
**Solution**: 
```bash
railway run npx prisma migrate resolve --applied [migration-name]
```

**Problem**: Migration script fails
**Solution**: Check Railway logs and run migration manually:
```bash
railway logs
railway run node scripts/migrate-events-to-organizations.js
```

## After Migration

### Verification Steps

1. **Check organization creation:**
   ```sql
   SELECT COUNT(*) FROM organizations;
   SELECT name, slug FROM organizations;
   ```

2. **Verify event linking:**
   ```sql
   SELECT COUNT(*) FROM events WHERE organization_id IS NOT NULL;
   ```

3. **Confirm admin memberships:**
   ```sql
   SELECT COUNT(*) FROM organization_memberships WHERE role = 'org_admin';
   ```

### Test Application Functionality

1. **Login as SuperAdmin:**
   - Email: `superadmin@test.com`
   - Password: `superpass` (or your configured password)

2. **Test organization management:**
   - Visit `/admin/organizations`
   - Verify all migrated organizations appear
   - Test organization creation

3. **Test event access:**
   - Login as an event admin
   - Navigate to organization dashboard
   - Verify event access and functionality

## Migration Output

The migration script provides detailed output:

```
🔄 Starting migration: Events to Organizations...
📊 Found 3 events that need migration to organizations.
🔄 Processing 3 events...

📅 Processing event: DevConf 2024 (devconf-2024)
✅ Created organization: DevConf 2024 Organization
✅ Added John Doe as org admin
✅ Migrated event: DevConf 2024

📅 Processing event: PyCon 2024 (pycon-2024)
✅ Created organization: PyCon 2024 Organization
✅ Added Jane Smith as org admin
✅ Migrated event: PyCon 2024

🎉 Migration completed successfully!
📊 Summary:
   - Organizations created: 2
   - Events migrated: 3
   - Total events now have organizations: 3
```

## Troubleshooting

### Common Issues

#### 1. "No admin user found" Error
**Problem:** Event has no admin users
**Solution:** 
- Manually assign an admin to the event first, or
- The migration will create a default organization for orphaned events

#### 2. Slug Conflicts
**Problem:** Organization slug already exists
**Solution:** Migration automatically handles conflicts by checking existing organizations

#### 3. Permission Errors
**Problem:** Database permission issues
**Solution:** Ensure the database user has CREATE, UPDATE, INSERT permissions

### Migration Rollback

If you need to rollback the migration:

```sql
-- WARNING: This will remove all organization data
-- Make sure you have a backup before running

-- Remove organization memberships
DELETE FROM organization_memberships;

-- Unlink events from organizations
UPDATE events SET organization_id = NULL;

-- Remove organizations
DELETE FROM organizations;
```

## Advanced Configuration

### Custom Migration Behavior

You can modify the migration script (`backend/scripts/migrate-events-to-organizations.js`) to:

- Change organization naming patterns
- Set custom organization descriptions
- Modify role assignment logic
- Add custom organization settings

### Environment-Specific Considerations

#### Development Environment
- Migration can be run multiple times safely
- Use Prisma Studio to inspect results
- Test with sample data

#### Production Environment
- **Always backup database first**
- Run during maintenance window
- Test migration on staging environment first
- Monitor application logs after migration

## Support

If you encounter issues during migration:

1. Check the migration output for specific error messages
2. Verify database permissions and connectivity
3. Ensure all prerequisites are met
4. Contact support with migration logs if needed

## Related Documentation

- [Organizations Feature Overview](./ORGANIZATIONS.md)
- [Database Schema Changes](./DATABASE-SCHEMA.md)
- [API Endpoints](./API-ENDPOINTS.md)
- [User Roles and Permissions](./RBAC.md) 
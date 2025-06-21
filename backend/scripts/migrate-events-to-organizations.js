#!/usr/bin/env node

/**
 * Migration Script: Migrate Events to Organizations
 * 
 * This script migrates existing events to the new organization structure.
 * It can be run safely multiple times - it will only migrate unmigrated events.
 * 
 * Usage:
 *   npm run migrate:events-to-orgs
 *   or
 *   node scripts/migrate-events-to-organizations.js
 */

const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function migrateEventsToOrganizations() {
  console.log('🔄 Starting migration: Events to Organizations...');
  
  try {
    // Check if there are any events without organizations
    const unmigrated = await prisma.event.count({
      where: { organizationId: null }
    });

    if (unmigrated === 0) {
      console.log('✅ No events need migration. All events are already linked to organizations.');
      return;
    }

    console.log(`📊 Found ${unmigrated} events that need migration to organizations.`);

    // Get all events without organizations
    const eventsToMigrate = await prisma.event.findMany({
      where: { organizationId: null },
      include: {
        userEventRoles: {
          include: {
            user: true,
            role: true
          }
        }
      }
    });

    console.log(`🔄 Processing ${eventsToMigrate.length} events...`);

    let migratedCount = 0;
    let organizationsCreated = 0;

    for (const event of eventsToMigrate) {
      console.log(`\n📅 Processing event: ${event.name} (${event.slug})`);

      // Find an admin user for this event to be the organization creator
      const eventAdmin = event.userEventRoles.find(uer => 
        uer.role.name === 'Admin' || uer.role.name === 'Event Admin'
      );

      if (!eventAdmin) {
        console.log(`⚠️  No admin found for event ${event.name}. Skipping...`);
        continue;
      }

      // Create organization for this event
      const orgSlug = `${event.slug}-org`;
      const orgName = `${event.name} Organization`;

      // Check if organization already exists (in case of partial migration)
      let organization = await prisma.organization.findUnique({
        where: { slug: orgSlug }
      });

      if (!organization) {
        organization = await prisma.organization.create({
          data: {
            name: orgName,
            slug: orgSlug,
            description: `Organization for ${event.name}`,
            website: event.websiteUrl,
            createdById: eventAdmin.userId,
          }
        });
        organizationsCreated++;
        console.log(`✅ Created organization: ${orgName}`);
      } else {
        console.log(`ℹ️  Organization already exists: ${orgName}`);
      }

      // Link event to organization
      await prisma.event.update({
        where: { id: event.id },
        data: { organizationId: organization.id }
      });

      // Create organization memberships for all event admins
      const eventAdmins = event.userEventRoles.filter(uer => 
        uer.role.name === 'Admin' || uer.role.name === 'Event Admin'
      );

      for (const admin of eventAdmins) {
        // Check if membership already exists
        const existingMembership = await prisma.organizationMembership.findUnique({
          where: {
            organizationId_userId: {
              organizationId: organization.id,
              userId: admin.userId
            }
          }
        });

        if (!existingMembership) {
          await prisma.organizationMembership.create({
            data: {
              organizationId: organization.id,
              userId: admin.userId,
              role: 'org_admin',
              createdById: eventAdmin.userId,
            }
          });
          console.log(`✅ Added ${admin.user.name} as org admin`);
        } else {
          console.log(`ℹ️  ${admin.user.name} is already an org member`);
        }
      }

      migratedCount++;
      console.log(`✅ Migrated event: ${event.name}`);
    }

    // Handle any remaining unmigrated events by creating a default organization
    const stillUnmigrated = await prisma.event.count({
      where: { organizationId: null }
    });

    if (stillUnmigrated > 0) {
      console.log(`\n⚠️  ${stillUnmigrated} events still need migration. Creating default organization...`);

      // Find a SuperAdmin or any admin user
      const superAdmin = await prisma.userEventRole.findFirst({
        include: { role: true, user: true },
        where: { role: { name: 'SuperAdmin' } }
      });

      const anyAdmin = await prisma.userEventRole.findFirst({
        include: { role: true, user: true },
        where: { role: { name: { in: ['Admin', 'Event Admin'] } } }
      });

      const creator = superAdmin || anyAdmin;

      if (!creator) {
        throw new Error('No admin user found to create default organization');
      }

      // Create default organization
      const defaultOrg = await prisma.organization.create({
        data: {
          name: 'Default Organization',
          slug: 'default-org',
          description: 'Default organization for migrated events',
          createdById: creator.userId,
        }
      });

      // Link remaining events to default organization
      await prisma.event.updateMany({
        where: { organizationId: null },
        data: { organizationId: defaultOrg.id }
      });

      // Add creator as org admin
      await prisma.organizationMembership.create({
        data: {
          organizationId: defaultOrg.id,
          userId: creator.userId,
          role: 'org_admin',
          createdById: creator.userId,
        }
      });

      console.log(`✅ Created default organization and migrated ${stillUnmigrated} events`);
      organizationsCreated++;
      migratedCount += stillUnmigrated;
    }

    console.log('\n🎉 Migration completed successfully!');
    console.log(`📊 Summary:`);
    console.log(`   - Organizations created: ${organizationsCreated}`);
    console.log(`   - Events migrated: ${migratedCount}`);
    console.log(`   - Total events now have organizations: ${await prisma.event.count({ where: { organizationId: { not: null } } })}`);

  } catch (error) {
    console.error('❌ Migration failed:', error);
    throw error;
  }
}

// Run migration if this script is executed directly
if (require.main === module) {
  migrateEventsToOrganizations()
    .then(() => {
      console.log('✅ Migration script completed');
      process.exit(0);
    })
    .catch((error) => {
      console.error('❌ Migration script failed:', error);
      process.exit(1);
    })
    .finally(async () => {
      await prisma.$disconnect();
    });
}

module.exports = { migrateEventsToOrganizations }; 
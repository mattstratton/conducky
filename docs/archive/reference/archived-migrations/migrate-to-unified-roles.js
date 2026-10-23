const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

/**
 * Migration script to populate unified role system from existing data
 * This script:
 * 1. Creates the new unified roles
 * 2. Migrates existing UserEventRole data to UserRole
 * 3. Migrates existing OrganizationMembership data to UserRole
 */
async function migrateToUnifiedRoles() {
  console.log('🔄 Starting migration to unified role system...');

  try {
    // Step 1: Create unified roles
    console.log('📝 Creating unified roles...');
    
    const unifiedRoles = [
      { name: 'system_admin', scope: 'system', level: 100, description: 'System administrator with global access' },
      { name: 'org_admin', scope: 'organization', level: 50, description: 'Organization administrator' },
      { name: 'org_viewer', scope: 'organization', level: 10, description: 'Organization viewer' },
      { name: 'event_admin', scope: 'event', level: 40, description: 'Event administrator' },
      { name: 'responder', scope: 'event', level: 20, description: 'Event responder' },
      { name: 'reporter', scope: 'event', level: 5, description: 'Event reporter' }
    ];

    for (const roleData of unifiedRoles) {
      await prisma.unifiedRole.upsert({
        where: { name: roleData.name },
        update: {},
        create: roleData
      });
      console.log(`✅ Role created: ${roleData.name}`);
    }

    // Step 2: Migrate existing event roles
    console.log('🔄 Migrating existing event roles...');
    
    const existingEventRoles = await prisma.userEventRole.findMany({
      include: {
        role: true,
        user: true,
        event: true
      }
    });

    for (const userEventRole of existingEventRoles) {
      let unifiedRoleName;
      
      // Map old role names to new unified role names
      switch (userEventRole.role.name) {
        case 'System Admin':
          unifiedRoleName = 'system_admin';
          break;
        case 'Event Admin':
          unifiedRoleName = 'event_admin';
          break;
        case 'Responder':
          unifiedRoleName = 'responder';
          break;
        case 'Reporter':
          unifiedRoleName = 'reporter';
          break;
        default:
          console.warn(`⚠️ Unknown role: ${userEventRole.role.name}`);
          continue;
      }

      const unifiedRole = await prisma.unifiedRole.findUnique({
        where: { name: unifiedRoleName }
      });

      if (!unifiedRole) {
        console.error(`❌ Unified role not found: ${unifiedRoleName}`);
        continue;
      }

      // For SuperAdmin, create system-level role (no scopeId)
      if (unifiedRoleName === 'system_admin') {
        await prisma.userRole.upsert({
          where: {
            user_role_unique: {
              userId: userEventRole.userId,
              roleId: unifiedRole.id,
              scopeType: 'system',
              scopeId: 'SYSTEM'
            }
          },
          update: {},
          create: {
            userId: userEventRole.userId,
            roleId: unifiedRole.id,
            scopeType: 'system',
            scopeId: 'SYSTEM',
            grantedAt: userEventRole.createdAt || new Date()
          }
        });
        console.log(`✅ Migrated ${unifiedRoleName} for user ${userEventRole.user.email}`);
      } else {
        // For event roles, create event-scoped role
        if (userEventRole.eventId) {
          await prisma.userRole.upsert({
            where: {
              user_role_unique: {
                userId: userEventRole.userId,
                roleId: unifiedRole.id,
                scopeType: 'event',
                scopeId: userEventRole.eventId
              }
            },
            update: {},
            create: {
              userId: userEventRole.userId,
              roleId: unifiedRole.id,
              scopeType: 'event',
              scopeId: userEventRole.eventId,
              grantedAt: userEventRole.createdAt || new Date()
            }
          });
          console.log(`✅ Migrated ${unifiedRoleName} for user ${userEventRole.user.email} in event ${userEventRole.event?.name || userEventRole.eventId}`);
        }
      }
    }

    // Step 3: Migrate existing organization memberships
    console.log('🔄 Migrating existing organization memberships...');
    
    const existingOrgMemberships = await prisma.organizationMembership.findMany({
      include: {
        user: true,
        organization: true
      }
    });

    for (const membership of existingOrgMemberships) {
      const unifiedRoleName = membership.role; // org_admin or org_viewer
      
      const unifiedRole = await prisma.unifiedRole.findUnique({
        where: { name: unifiedRoleName }
      });

      if (!unifiedRole) {
        console.error(`❌ Unified role not found: ${unifiedRoleName}`);
        continue;
      }

      await prisma.userRole.upsert({
        where: {
          user_role_unique: {
            userId: membership.userId,
            roleId: unifiedRole.id,
            scopeType: 'organization',
            scopeId: membership.organizationId
          }
        },
        update: {},
        create: {
          userId: membership.userId,
          roleId: unifiedRole.id,
          scopeType: 'organization',
          scopeId: membership.organizationId,
          grantedById: membership.createdById,
          grantedAt: membership.createdAt || new Date()
        }
      });
      console.log(`✅ Migrated ${unifiedRoleName} for user ${membership.user.email} in org ${membership.organization.name}`);
    }

    // Step 4: Add temporary system_admin access to all orgs for existing system_admins
    console.log('🔄 Adding temporary org_admin access for system_admins...');
    
    const systemAdminRole = await prisma.unifiedRole.findUnique({
      where: { name: 'system_admin' }
    });
    
    const orgAdminRole = await prisma.unifiedRole.findUnique({
      where: { name: 'org_admin' }
    });

    if (systemAdminRole && orgAdminRole) {
      const systemAdmins = await prisma.userRole.findMany({
        where: {
          roleId: systemAdminRole.id,
          scopeType: 'system'
        }
      });

      const allOrgs = await prisma.organization.findMany();

      for (const systemAdmin of systemAdmins) {
        for (const org of allOrgs) {
          await prisma.userRole.upsert({
            where: {
              user_role_unique: {
                userId: systemAdmin.userId,
                roleId: orgAdminRole.id,
                scopeType: 'organization',
                scopeId: org.id
              }
            },
            update: {},
            create: {
              userId: systemAdmin.userId,
              roleId: orgAdminRole.id,
              scopeType: 'organization',
              scopeId: org.id,
              grantedAt: new Date()
            }
          });
        }
        console.log(`✅ Added temporary org_admin access for system admin`);
      }
    }

    console.log('🎉 Migration to unified role system completed successfully!');
    
    // Print summary
    const roleCounts = await prisma.userRole.groupBy({
      by: ['scopeType'],
      _count: {
        id: true
      }
    });
    
    console.log('\n📊 Migration Summary:');
    for (const count of roleCounts) {
      console.log(`  ${count.scopeType}: ${count._count.id} roles`);
    }

  } catch (error) {
    console.error('❌ Migration failed:', error);
    throw error;
  }
}

// Only run if called directly (not imported)
if (require.main === module) {
  migrateToUnifiedRoles()
    .catch(e => {
      console.error('❌ Error migrating to unified roles:', e);
      process.exit(1);
    })
    .finally(async () => {
      await prisma.$disconnect();
    });
}

module.exports = { migrateToUnifiedRoles }; 
#!/usr/bin/env node
/*
  Backfill Script: Assign Org Admins to Event Admins
  - For each event with an organization, grant `event_admin` to all current org admins
  - Idempotent and safe to re-run
  - Supports --dry-run to preview actions
*/
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function main() {
  const args = process.argv.slice(2);
  const isDryRun = args.includes('--dry-run');

  console.log(`\nAssigning Org Admins to Event Admins${isDryRun ? ' (dry-run)' : ''}...`);

  const events = await prisma.event.findMany({
    where: { organizationId: { not: null } },
    select: { id: true, name: true, organizationId: true, slug: true }
  });

  let totalAssignments = 0;
  for (const event of events) {
    const orgAdmins = await prisma.userRole.findMany({
      where: {
        scopeType: 'organization',
        scopeId: event.organizationId,
        role: { name: 'org_admin' }
      },
      select: { userId: true }
    });

    if (orgAdmins.length === 0) {
      continue;
    }

    const eventAdminRole = await prisma.unifiedRole.findUnique({ where: { name: 'event_admin' } });
    if (!eventAdminRole) {
      console.error('❌ unifiedRole "event_admin" not found. Aborting.');
      process.exit(1);
    }

    for (const { userId } of orgAdmins) {
      const existing = await prisma.userRole.findUnique({
        where: {
          user_role_unique: {
            userId,
            roleId: eventAdminRole.id,
            scopeType: 'event',
            scopeId: event.id
          }
        }
      });

      if (!existing) {
        console.log(`→ Grant event_admin to user ${userId} for event ${event.slug}`);
        if (!isDryRun) {
          await prisma.userRole.create({
            data: {
              userId,
              roleId: eventAdminRole.id,
              scopeType: 'event',
              scopeId: event.id,
              grantedAt: new Date()
            }
          });
        }
        totalAssignments += 1;
      }
    }
  }

  console.log(`\nDone. ${isDryRun ? '(dry-run) ' : ''}New assignments: ${totalAssignments}`);
}

main()
  .catch((e) => {
    console.error('❌ Error running backfill:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });



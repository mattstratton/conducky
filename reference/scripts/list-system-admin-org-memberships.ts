/*
  Script: list-system-admin-org-memberships.ts
  Purpose: Lists organizations where users who are System Admins also hold org_admin solely due to historical auto-assignment.
  Usage: Run inside the backend container with ts-node or compile to JS.

  Non-destructive: Outputs a report only. Do not auto-remove memberships.
*/

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  // Find all system admins
  const sysAdminUserIds = await prisma.userRole.findMany({
    where: { scopeType: 'system' as any },
    include: { role: true },
    distinct: ['userId']
  }).then(rows => rows.filter(r => r.role?.name === 'system_admin').map(r => r.userId));

  const results: Array<{
    userId: string;
    organizationId: string;
    organizationName: string;
    role: string;
    grantedAt: Date;
    grantedById: string | null;
  }> = [];

  for (const userId of sysAdminUserIds) {
    const orgRoles = await prisma.userRole.findMany({
      where: { userId, scopeType: 'organization' as any },
      include: { role: true, organization: true } as any,
    });
    for (const ur of orgRoles) {
      if (ur.role?.name === 'org_admin') {
        results.push({
          userId,
          organizationId: ur.scopeId,
          organizationName: (ur as any).organization?.name || '(unknown)',
          role: ur.role.name,
          grantedAt: ur.grantedAt as Date,
          grantedById: ur.grantedById,
        });
      }
    }
  }

  // Print report
  console.log('\nSystem Admin users with org_admin memberships (review):');
  if (results.length === 0) {
    console.log('None found.');
    return;
  }
  for (const r of results) {
    console.log(`- userId=${r.userId} orgId=${r.organizationId} orgName="${r.organizationName}" role=${r.role} grantedAt=${r.grantedAt.toISOString()} grantedBy=${r.grantedById || 'unknown'}`);
  }
}

main().finally(async () => {
  await prisma.$disconnect();
});



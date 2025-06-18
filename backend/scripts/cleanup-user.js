#!/usr/bin/env node

/**
 * User Cleanup Script - Removes a user and all their data
 * Usage: docker-compose exec backend node scripts/cleanup-user.js <email>
 */

const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function cleanupUser(email) {
  try {
    console.log(`🔍 Looking for user: ${email}`);
    
    const user = await prisma.user.findUnique({
      where: { email },
      include: {
        roles: true,
        socialAccounts: true,
        reports: true,
        comments: true,
        evidenceFiles: true,
        notifications: true,
        passwordResetTokens: true,
      }
    });

    if (!user) {
      console.log(`❌ User not found: ${email}`);
      return;
    }

    console.log(`👤 Found user: ${user.name} (${user.email})`);
    console.log(`📊 Data to clean: ${user.roles.length} roles, ${user.socialAccounts.length} social accounts`);

    console.log(`🧹 Cleaning up user data...`);

    // Delete in proper order to respect foreign key constraints
    await prisma.evidenceFile.deleteMany({ where: { uploaderId: user.id } });
    await prisma.comment.deleteMany({ where: { authorId: user.id } });
    await prisma.notification.deleteMany({ where: { userId: user.id } });
    await prisma.passwordResetToken.deleteMany({ where: { userId: user.id } });
    await prisma.report.deleteMany({ where: { reporterId: user.id } });
    await prisma.eventRole.deleteMany({ where: { userId: user.id } });
    await prisma.socialAccount.deleteMany({ where: { userId: user.id } });
    await prisma.user.delete({ where: { id: user.id } });

    console.log(`🎉 Successfully deleted user: ${user.name} (${email})`);

  } catch (error) {
    console.error(`❌ Error cleaning up user:`, error.message);
  } finally {
    await prisma.$disconnect();
  }
}

const email = process.argv[2];
if (!email) {
  console.log(`❌ Usage: node scripts/cleanup-user.js <email>`);
  console.log(`   Example: node scripts/cleanup-user.js matt.stratton@gmail.com`);
  process.exit(1);
}

cleanupUser(email); 
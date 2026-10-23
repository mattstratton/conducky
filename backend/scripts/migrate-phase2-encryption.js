#!/usr/bin/env node

/**
 * Migration Script: Phase 2 Encryption
 * 
 * This script encrypts existing Event.contactEmail data in the database.
 * It uses the secure encryption utility with unique salts per field.
 * 
 * Usage:
 *   node scripts/migrate-phase2-encryption.js [--dry-run]
 * 
 * Options:
 *   --dry-run  Show what would be migrated without making changes
 */

const { createPrismaClient } = require('../prisma/db');
const { encryptField, isEncrypted } = require('../dist/src/utils/encryption');

const prisma = createPrismaClient();

// Parse command line arguments
const isDryRun = process.argv.includes('--dry-run');

async function migratePhase2Encryption() {
  console.log(`🔄 Starting Phase 2 encryption migration${isDryRun ? ' (DRY RUN)' : ''}...`);
  console.log(`📅 Started at: ${new Date().toISOString()}`);
  
  try {
    // Get all events with contactEmail data
    const events = await prisma.event.findMany({
      where: {
        contactEmail: {
          not: null
        }
      },
      select: {
        id: true,
        name: true,
        slug: true,
        contactEmail: true
      }
    });

    console.log(`\n📊 Found ${events.length} events with contactEmail data`);
    
    if (events.length === 0) {
      console.log('✅ No events with contactEmail found. Migration complete!');
      return;
    }

    // Filter events that need encryption
    const eventsToEncrypt = events.filter(event => 
      event.contactEmail && !isEncrypted(event.contactEmail)
    );

    console.log(`📝 Events needing encryption: ${eventsToEncrypt.length}`);
    console.log(`✅ Events already encrypted: ${events.length - eventsToEncrypt.length}`);

    if (eventsToEncrypt.length === 0) {
      console.log('✅ All event contactEmails are already encrypted. Migration complete!');
      return;
    }

    if (isDryRun) {
      console.log('\n📋 DRY RUN - Events that would be encrypted:');
      eventsToEncrypt.forEach((event, index) => {
        console.log(`  ${index + 1}. Event: ${event.name} (${event.slug})`);
        console.log(`     Contact Email: ${event.contactEmail}`);
      });
      console.log('\n💡 Run without --dry-run to perform the actual migration');
      return;
    }

    // Perform the migration
    console.log('\n🔐 Starting encryption process...');
    
    let successCount = 0;
    let errorCount = 0;
    
    for (const event of eventsToEncrypt) {
      try {
        console.log(`Processing event: ${event.name} (${event.slug})`);
        
        // Encrypt the contactEmail
        const encryptedContactEmail = encryptField(event.contactEmail);
        
        // Update the event in the database
        await prisma.event.update({
          where: { id: event.id },
          data: { contactEmail: encryptedContactEmail }
        });
        
        successCount++;
        console.log(`  ✅ Successfully encrypted contactEmail`);
        
      } catch (error) {
        errorCount++;
        console.error(`  ❌ Error encrypting event ${event.name}:`, error.message);
      }
    }

    console.log('\n📊 Migration Summary:');
    console.log(`  ✅ Successfully encrypted: ${successCount} events`);
    console.log(`  ❌ Errors: ${errorCount} events`);
    console.log(`  📧 Total contactEmails processed: ${successCount + errorCount}`);
    
    if (errorCount === 0) {
      console.log('\n🎉 Phase 2 encryption migration completed successfully!');
    } else {
      console.log('\n⚠️  Migration completed with some errors. Please review the error messages above.');
      process.exit(1);
    }

  } catch (error) {
    console.error('\n💥 Migration failed with error:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
    console.log(`📅 Finished at: ${new Date().toISOString()}`);
  }
}

// Run the migration
if (require.main === module) {
  migratePhase2Encryption()
    .catch((error) => {
      console.error('💥 Fatal error:', error);
      process.exit(1);
    });
}

module.exports = { migratePhase2Encryption }; 
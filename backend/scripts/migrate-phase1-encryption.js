const { createPrismaClient } = require('../prisma/db');
const { encryptField, decryptField, isEncrypted } = require('../dist/src/utils/encryption');

const prisma = createPrismaClient();

/**
 * Migration script for Phase 1 database encryption
 * Encrypts existing incident and comment data in place
 */
async function migratePhase1Encryption() {
  const isDryRun = process.argv.includes('--dry-run');
  
  console.log('🔐 Starting Phase 1 database encryption migration...');
  console.log('📋 This will encrypt incident and comment data that is not already encrypted');
  
  if (isDryRun) {
    console.log('🧪 DRY RUN MODE - No changes will be made');
  }
  
  try {
    // Start with incident data
    console.log('\n📊 Analyzing incident data...');
    const incidents = await prisma.incident.findMany({
      select: {
        id: true,
        description: true,
        parties: true,
        location: true
      }
    });
    
    console.log(`Found ${incidents.length} incidents to process`);
    
    let incidentUpdateCount = 0;
    
    for (const incident of incidents) {
      const updates = {};
      let needsUpdate = false;
      
      // Check and encrypt description
      if (incident.description && !isEncrypted(incident.description)) {
        updates.description = encryptField(incident.description);
        needsUpdate = true;
      }
      
      // Check and encrypt parties
      if (incident.parties && !isEncrypted(incident.parties)) {
        updates.parties = encryptField(incident.parties);
        needsUpdate = true;
      }
      
      // Check and encrypt location
      if (incident.location && !isEncrypted(incident.location)) {
        updates.location = encryptField(incident.location);
        needsUpdate = true;
      }
      
      if (needsUpdate) {
        incidentUpdateCount++;
        console.log(`🔒 Incident ${incident.id}: encrypting ${Object.keys(updates).join(', ')}`);
        
        if (!isDryRun) {
          await prisma.incident.update({
            where: { id: incident.id },
            data: updates
          });
        }
      }
    }
    
    console.log(`\n📈 Incidents processed: ${incidentUpdateCount} of ${incidents.length} needed encryption`);
    
    // Now process comment data
    console.log('\n💬 Analyzing comment data...');
    const comments = await prisma.incidentComment.findMany({
      select: {
        id: true,
        body: true
      }
    });
    
    console.log(`Found ${comments.length} comments to process`);
    
    let commentUpdateCount = 0;
    
    for (const comment of comments) {
      if (comment.body && !isEncrypted(comment.body)) {
        commentUpdateCount++;
        console.log(`🔒 Comment ${comment.id}: encrypting body`);
        
        if (!isDryRun) {
          await prisma.incidentComment.update({
            where: { id: comment.id },
            data: {
              body: encryptField(comment.body)
            }
          });
        }
      }
    }
    
    console.log(`\n📈 Comments processed: ${commentUpdateCount} of ${comments.length} needed encryption`);
    
    // Summary
    console.log('\n✅ Phase 1 encryption migration completed successfully!');
    console.log(`📊 Summary:`);
    console.log(`   - Incidents processed: ${incidentUpdateCount}/${incidents.length}`);
    console.log(`   - Comments processed: ${commentUpdateCount}/${comments.length}`);
    
    if (isDryRun) {
      console.log('🧪 This was a dry run - no actual changes were made');
      console.log('💡 Run without --dry-run to execute the migration');
    } else {
      console.log('✨ All data has been encrypted and is now secure!');
    }
    
  } catch (error) {
    console.error('❌ Migration failed:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

/**
 * Validation function to verify encryption was successful
 */
async function validateEncryption() {
  console.log('\n🔍 Validating encryption...');
  
  try {
    // Check incidents
    const incidents = await prisma.incident.findMany({
      select: {
        id: true,
        description: true,
        parties: true,
        location: true
      },
      take: 5 // Sample a few
    });
    
    let validationErrors = 0;
    
    for (const incident of incidents) {
      // Check if non-null fields are encrypted
      if (incident.description && !isEncrypted(incident.description)) {
        console.warn(`⚠️  Incident ${incident.id}: description is not encrypted`);
        validationErrors++;
      }
      if (incident.parties && !isEncrypted(incident.parties)) {
        console.warn(`⚠️  Incident ${incident.id}: parties is not encrypted`);
        validationErrors++;
      }
      if (incident.location && !isEncrypted(incident.location)) {
        console.warn(`⚠️  Incident ${incident.id}: location is not encrypted`);
        validationErrors++;
      }
    }
    
    // Check comments
    const comments = await prisma.incidentComment.findMany({
      select: {
        id: true,
        body: true
      },
      take: 5 // Sample a few
    });
    
    for (const comment of comments) {
      if (comment.body && !isEncrypted(comment.body)) {
        console.warn(`⚠️  Comment ${comment.id}: body is not encrypted`);
        validationErrors++;
      }
    }
    
    if (validationErrors === 0) {
      console.log('✅ Validation passed - all sampled data is properly encrypted');
    } else {
      console.error(`❌ Validation failed - ${validationErrors} encryption issues found`);
    }
    
  } catch (error) {
    console.error('❌ Validation error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

// Main execution
if (require.main === module) {
  const command = process.argv[2];
  
  if (command === 'validate') {
    validateEncryption();
  } else {
    migratePhase1Encryption();
  }
}

module.exports = {
  migratePhase1Encryption,
  validateEncryption
}; 
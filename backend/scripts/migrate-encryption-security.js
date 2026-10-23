const { createPrismaClient } = require('../prisma/db');
const { encryptField, decryptField, isLegacyEncrypted, isEncrypted } = require('../dist/src/utils/encryption');

const prisma = createPrismaClient();

/**
 * Migration script to fix encryption security vulnerability #304
 * Re-encrypts existing encrypted fields in system settings with unique salts instead of fixed salt
 */
async function migrateEncryptionSecurity() {
  const isDryRun = process.argv.includes('--dry-run');
  
  console.log('🔐 Starting encryption security migration...');
  console.log('📋 This will re-encrypt system settings that contain encrypted data');
  
  if (isDryRun) {
    console.log('🧪 DRY RUN MODE - No changes will be made');
  }
  
  try {
    // Get system settings that might contain encrypted data
    // Based on codebase analysis: sensitive fields in email, googleOAuth, githubOAuth settings
    console.log('📖 Fetching existing system settings...');
    const systemSettings = await prisma.systemSetting.findMany({
      where: {
        key: {
          in: ['email', 'googleOAuth', 'githubOAuth']
        }
      }
    });

    if (systemSettings.length === 0) {
      console.log('✅ No relevant system settings found');
      return;
    }

    console.log(`📋 Found ${systemSettings.length} system settings to check`);
    
    let migrated = 0;
    let skipped = 0;
    let errors = 0;

    for (const setting of systemSettings) {
      try {
        console.log(`🔄 Processing setting: ${setting.key}...`);
        
        if (!setting.value) {
          console.log(`⏭️  Setting ${setting.key} has no value - skipping`);
          skipped++;
          continue;
        }

        let needsReencryption = false;
        let parsedValue;
        
        try {
          // Parse JSON value to check for encrypted fields
          parsedValue = JSON.parse(setting.value);
        } catch (parseError) {
          console.log(`⚠️  Setting ${setting.key} is not valid JSON - skipping`);
          skipped++;
          continue;
        }

        // Check for encrypted fields based on setting type
        const encryptedFields = [];
        
        if (setting.key === 'email' && parsedValue.smtpPassword) {
          if (isLegacyEncrypted(parsedValue.smtpPassword)) {
            encryptedFields.push('smtpPassword');
            needsReencryption = true;
          }
        }
        
        if ((setting.key === 'googleOAuth' || setting.key === 'githubOAuth')) {
          if (parsedValue.clientSecret && isLegacyEncrypted(parsedValue.clientSecret)) {
            encryptedFields.push('clientSecret');
            needsReencryption = true;
          }
        }

        if (!needsReencryption) {
          console.log(`⏭️  Setting ${setting.key} has no legacy encrypted fields - skipping`);
          skipped++;
          continue;
        }

        console.log(`🔓 Found ${encryptedFields.length} encrypted field(s) in ${setting.key}: ${encryptedFields.join(', ')}`);
        
        // Decrypt and re-encrypt each field
        for (const field of encryptedFields) {
          console.log(`🔄 Re-encrypting ${setting.key}.${field}...`);
          
          const decrypted = decryptField(parsedValue[field]);
          const reencrypted = encryptField(decrypted);
          parsedValue[field] = reencrypted;
        }
        
        if (!isDryRun) {
          console.log(`💾 Updating ${setting.key} in database...`);
          
          // Update in database
          await prisma.systemSetting.update({
            where: { id: setting.id },
            data: { value: JSON.stringify(parsedValue) }
          });
        }
        
        console.log(`✅ Successfully processed ${setting.key} (re-encrypted ${encryptedFields.length} field(s))`);
        migrated++;
        
      } catch (error) {
        console.error(`❌ Error processing setting ${setting.key}:`, error.message);
        errors++;
      }
    }

    // Summary
    console.log('\n📈 Migration Summary:');
    console.log(`   ✅ Settings migrated: ${migrated}`);
    console.log(`   ⏭️  Settings skipped: ${skipped}`);
    console.log(`   ❌ Settings with errors: ${errors}`);
    
    if (errors > 0) {
      throw new Error(`❌ ${errors} settings failed migration. Please check the logs above.`);
    }
    
    if (migrated > 0) {
      if (isDryRun) {
        console.log('\n🧪 DRY RUN COMPLETE - No actual changes were made');
        console.log('🔒 Run without --dry-run to apply the encryption security fix.');
      } else {
        console.log('\n🎉 Encryption security migration completed successfully!');
        console.log('🔒 All system settings now use unique salts for enhanced security.');
      }
    } else {
      console.log('\n✅ All system settings were already using secure encryption or had no encrypted fields.');
    }
    
    // Verification step (only if not dry run and we migrated something)
    if (!isDryRun && migrated > 0) {
      console.log('\n🔍 Verification: Testing decryption of migrated settings...');
      let verificationFailures = 0;
      
      for (const setting of systemSettings) {
        try {
          const updated = await prisma.systemSetting.findUnique({
            where: { id: setting.id }
          });
          
          if (updated?.value) {
            const parsedValue = JSON.parse(updated.value);
            
            // Test decryption of known encrypted fields
            if (setting.key === 'email' && parsedValue.smtpPassword && isEncrypted(parsedValue.smtpPassword)) {
              decryptField(parsedValue.smtpPassword);
              console.log(`✅ Verification passed for ${setting.key}.smtpPassword`);
            }
            
            if ((setting.key === 'googleOAuth' || setting.key === 'githubOAuth') && 
                parsedValue.clientSecret && isEncrypted(parsedValue.clientSecret)) {
              decryptField(parsedValue.clientSecret);
              console.log(`✅ Verification passed for ${setting.key}.clientSecret`);
            }
          }
        } catch (error) {
          console.error(`❌ Verification failed for ${setting.key}:`, error.message);
          verificationFailures++;
        }
      }
      
      if (verificationFailures > 0) {
        throw new Error(`❌ ${verificationFailures} settings failed verification. Migration may be incomplete.`);
      }
      
      console.log('\n🎉 All verifications passed! Migration completed successfully.');
    }
    
  } catch (error) {
    console.error('❌ Migration failed:', error);
    throw error;
  }
}

/**
 * Rollback function in case migration needs to be reverted
 * NOTE: This is only possible if the migration hasn't been committed
 */
async function rollbackEncryptionMigration() {
  console.log('⚠️  Rollback is not supported for this migration.');
  console.log('📝 The migration maintains backward compatibility, so no rollback is needed.');
  console.log('🔄 If issues occur, the decrypt function supports both old and new formats.');
}

// Main execution
async function main() {
  const command = process.argv[2];
  
  try {
    if (command === '--rollback') {
      await rollbackEncryptionMigration();
    } else {
      await migrateEncryptionSecurity();
    }
  } catch (error) {
    console.error('💥 Script failed:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

if (require.main === module) {
  main();
}

module.exports = {
  migrateEncryptionSecurity,
  rollbackEncryptionMigration
}; 
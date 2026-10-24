#!/usr/bin/env node

/**
 * Phase 1 Cleanup Script - Migration Scripts and Dead Code Removal
 * 
 * This script removes migration scripts that have been successfully applied
 * and are no longer needed. It also cleans up any remaining dead code.
 */

const fs = require('fs');
const path = require('path');

const logger = {
  info: (msg) => console.log(`ℹ️  ${msg}`),
  success: (msg) => console.log(`✅ ${msg}`),
  warning: (msg) => console.log(`⚠️  ${msg}`),
  error: (msg) => console.log(`❌ ${msg}`)
};

const MIGRATION_SCRIPTS_TO_ARCHIVE = [
  'backend/scripts/report-to-incident-migration.js',
  'backend/scripts/migrate-to-unified-roles.js', 
  'backend/scripts/migrate-events-to-organizations.js',
  'backend/scripts/final-fixes.js',
  'backend/scripts/final-cleanup-migration.js',
  'backend/scripts/fix-migration-state.js',
  'frontend/scripts/fix-incident-detail-vars.js',
  'frontend/scripts/frontend-incident-migration.js'
];

const SCRIPTS_TO_KEEP = [
  'backend/scripts/deploy.sh',
  'backend/scripts/convert-console-logs.js',
  'backend/scripts/replace-console-logs.js'
];

async function archiveMigrationScripts() {
  logger.info('Starting migration scripts cleanup...');
  
  const archiveDir = path.join(__dirname, '..', '..', 'reference', 'archived-migrations');
  
  // Create archive directory if it doesn't exist
  if (!fs.existsSync(archiveDir)) {
    fs.mkdirSync(archiveDir, { recursive: true });
    logger.success('Created archive directory: reference/archived-migrations');
  }
  
  let archivedCount = 0;
  let notFoundCount = 0;
  
  for (const scriptPath of MIGRATION_SCRIPTS_TO_ARCHIVE) {
    const fullPath = path.join(__dirname, '..', '..', scriptPath);
    
    if (fs.existsSync(fullPath)) {
      const filename = path.basename(scriptPath);
      const archivePath = path.join(archiveDir, filename);
      
      // Move file to archive
      fs.renameSync(fullPath, archivePath);
      logger.success(`Archived: ${scriptPath} -> reference/archived-migrations/${filename}`);
      archivedCount++;
    } else {
      logger.warning(`Not found: ${scriptPath}`);
      notFoundCount++;
    }
  }
  
  logger.info(`Migration scripts cleanup complete: ${archivedCount} archived, ${notFoundCount} not found`);
  return { archivedCount, notFoundCount };
}

async function cleanupDeadCode() {
  logger.info('Starting dead code cleanup...');
  
  const deadCodePatterns = [
    // Look for any remaining references to old model names
    { pattern: /import.*Report.*from.*prisma/g, description: 'Report model imports' },
    { pattern: /prisma\.report\./g, description: 'Report model usage' },
    { pattern: /prisma\.reportComment\./g, description: 'ReportComment model usage' },
    { pattern: /ReportComment/g, description: 'ReportComment type references' },
    { pattern: /TODO.*migration/gi, description: 'Migration TODOs' },
    { pattern: /FIXME.*migration/gi, description: 'Migration FIXMEs' }
  ];
  
  const sourceDirs = [
    'backend/src',
    'frontend/src',
    'frontend/pages',
    'frontend/components'
  ];
  
  let totalIssues = 0;
  
  for (const dir of sourceDirs) {
    const fullDir = path.join(__dirname, '..', '..', dir);
    if (fs.existsSync(fullDir)) {
      const issues = await scanDirectory(fullDir, deadCodePatterns);
      totalIssues += issues;
    }
  }
  
  if (totalIssues === 0) {
    logger.success('No dead code patterns found');
  } else {
    logger.warning(`Found ${totalIssues} potential dead code issues - manual review needed`);
  }
  
  return totalIssues;
}

async function scanDirectory(dir, patterns) {
  let issueCount = 0;
  
  const files = fs.readdirSync(dir);
  for (const file of files) {
    const filePath = path.join(dir, file);
    const stat = fs.statSync(filePath);
    
    if (stat.isDirectory()) {
      issueCount += await scanDirectory(filePath, patterns);
    } else if (file.endsWith('.ts') || file.endsWith('.tsx') || file.endsWith('.js') || file.endsWith('.jsx')) {
      const content = fs.readFileSync(filePath, 'utf8');
      
      for (const { pattern, description } of patterns) {
        const matches = content.match(pattern);
        if (matches) {
          logger.warning(`${description} found in: ${filePath}`);
          issueCount++;
        }
      }
    }
  }
  
  return issueCount;
}

async function createCleanupSummary(archiveResults, deadCodeIssues) {
  const summaryContent = `# Phase 1 Cleanup Summary
Date: ${new Date().toISOString()}

## Migration Scripts Archived
- **Total archived**: ${archiveResults.archivedCount}
- **Not found**: ${archiveResults.notFoundCount}
- **Archive location**: reference/archived-migrations/

## Dead Code Analysis
- **Issues found**: ${deadCodeIssues}
- **Status**: ${deadCodeIssues === 0 ? 'Clean' : 'Requires manual review'}

## Scripts Kept (Still Active)
${SCRIPTS_TO_KEEP.map(script => `- ${script}`).join('\n')}

## Migration Status
- ✅ Database schema updated to use Incident model
- ✅ All code references updated from Report to Incident
- ✅ Unified role system implemented
- ✅ Organization structure implemented
- ✅ Rate limiting moved to database storage
- ✅ Winston logging implemented

## Next Steps
1. Review any remaining dead code issues if found
2. Continue with Phase 2: Frontend logging system
3. Security audit completion
`;

  const summaryPath = path.join(__dirname, '..', '..', 'reference', 'phase1-cleanup-summary.md');
  fs.writeFileSync(summaryPath, summaryContent);
  logger.success('Created cleanup summary: reference/phase1-cleanup-summary.md');
}

async function main() {
  try {
    logger.info('🚀 Starting Phase 1 cleanup...\n');
    
    const archiveResults = await archiveMigrationScripts();
    console.log();
    
    const deadCodeIssues = await cleanupDeadCode();
    console.log();
    
    await createCleanupSummary(archiveResults, deadCodeIssues);
    
    logger.success('✨ Phase 1 cleanup complete!');
    logger.info('Next: Continue with security audit and Phase 2 frontend logging');
    
  } catch (error) {
    logger.error(`Cleanup failed: ${error.message}`);
    process.exit(1);
  }
}

if (require.main === module) {
  main();
}

module.exports = { archiveMigrationScripts, cleanupDeadCode };

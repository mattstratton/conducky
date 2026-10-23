#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

console.log('🚀 Starting Report-to-Incident Migration...\n');

// Define all the replacements to apply
const replacements = [
  // Prisma client references
  { pattern: /prisma\.report\b/g, replacement: 'prisma.incident' },
  { pattern: /prisma\.reportComment\b/g, replacement: 'prisma.incidentComment' },
  
  // TypeScript types from Prisma
  { pattern: /Prisma\.ReportCommentWhereInput/g, replacement: 'Prisma.IncidentCommentWhereInput' },
  { pattern: /Prisma\.ReportCommentOrderByWithRelationInput/g, replacement: 'Prisma.IncidentCommentOrderByWithRelationInput' },
  
  // Database field references in includes/counts
  { pattern: /reports:\s*true/g, replacement: 'incidents: true' },
  { pattern: /_count\.reports/g, replacement: '_count.incidents' },
  
  // Variable and property names
  { pattern: /reportId(?=[,\s:;})\]])/g, replacement: 'incidentId' },
  { pattern: /'reportId'/g, replacement: "'incidentId'" },
  { pattern: /"reportId"/g, replacement: '"incidentId"' },
  
  // Method names
  { pattern: /getReportComments/g, replacement: 'getIncidentComments' },
  
  // Notification enum values
  { pattern: /'report_submitted'/g, replacement: "'incident_submitted'" },
  { pattern: /'report_assigned'/g, replacement: "'incident_assigned'" },
  { pattern: /'report_status_changed'/g, replacement: "'incident_status_changed'" },
  { pattern: /'report_comment_added'/g, replacement: "'incident_comment_added'" },
  { pattern: /"report_submitted"/g, replacement: '"incident_submitted"' },
  { pattern: /"report_assigned"/g, replacement: '"incident_assigned"' },
  { pattern: /"report_status_changed"/g, replacement: '"incident_status_changed"' },
  { pattern: /"report_comment_added"/g, replacement: '"incident_comment_added"' },
  
  // Variable declarations and assignments
  { pattern: /const\s+report\s*=/g, replacement: 'const incident =' },
  { pattern: /let\s+report\s*=/g, replacement: 'let incident =' },
  { pattern: /const\s+reports\s*=/g, replacement: 'const incidents =' },
  { pattern: /let\s+reports\s*=/g, replacement: 'let incidents =' },
  
  // Return data objects
  { pattern: /data:\s*{\s*reports\s*}/g, replacement: 'data: { incidents }' },
  { pattern: /data:\s*{\s*report\s*}/g, replacement: 'data: { incident }' },
  
  // URL paths
  { pattern: /\/api\/reports/g, replacement: '/api/incidents' },
];

// Files to process
const filesToProcess = [
  'src/services/comment.service.ts',
  'src/services/event.service.ts', 
  'src/services/user.service.ts',
  'src/services/notification.service.ts',
  'src/services/user-notification-settings.service.ts',
  'src/services/incident.service.ts',
  'src/routes/admin.routes.ts',
  'src/routes/event.routes.ts',
  'src/routes/user.routes.ts',
  'src/controllers/organization.controller.ts',
  'src/utils/notifications.ts',
  'index.ts'
];

function processFile(filePath) {
  console.log(`Processing: ${filePath}`);
  
  if (!fs.existsSync(filePath)) {
    console.log(`  Skipped: File not found`);
    return;
  }

  let content = fs.readFileSync(filePath, 'utf8');
  const originalContent = content;

  // Apply all replacements
  for (const { pattern, replacement } of replacements) {
    content = content.replace(pattern, replacement);
  }

  // Additional context-sensitive fixes
  content = applyContextSensitiveFixes(content, filePath);

  if (content !== originalContent) {
    fs.writeFileSync(filePath, content);
    console.log(`  ✅ Updated`);
  } else {
    console.log(`  ⏭️  No changes needed`);
  }
}

function applyContextSensitiveFixes(content, filePath) {
  // Fix variable references that need context
  content = content.replace(/(\s+)report(\.(?!id\s*,|eventId|reporterId|assignedResponderId))/g, '$1incident$2');
  content = content.replace(/(\s+)reports(\.)/g, '$1incidents$2');
  
  // Fix conditional checks
  content = content.replace(/if\s*\(\s*!report\s*\)/g, 'if (!incident)');
  content = content.replace(/if\s*\(\s*report\s*\)/g, 'if (incident)');
  content = content.replace(/if\s*\(\s*!reports\s*\)/g, 'if (!incidents)');
  content = content.replace(/if\s*\(\s*reports\s*\)/g, 'if (incidents)');
  
  // Fix function parameters and arrow functions
  content = content.replace(/\(\s*report\s*\)/g, '(incident)');
  content = content.replace(/\(\s*reports\s*\)/g, '(incidents)');
  content = content.replace(/=>\s*report\s*\./g, '=> incident.');
  content = content.replace(/=>\s*reports\s*\./g, '=> incidents.');
  content = content.replace(/report\s*=>/g, 'incident =>');
  content = content.replace(/reports\s*=>/g, 'incidents =>');
  
  // File-specific fixes
  if (filePath.includes('index.ts')) {
    content = content.replace(/evidence\.incident\?\.eventId/g, 'evidence.incidentId');
  }
  
  if (filePath.includes('comment.service.ts')) {
    content = content.replace(/reportId:\s*string;/g, 'incidentId: string;');
  }

  return content;
}

// Run the migration
const backendDir = process.cwd();

for (const file of filesToProcess) {
  const fullPath = path.join(backendDir, file);
  processFile(fullPath);
}

console.log('\n✅ Migration completed!');
console.log('\n🔧 Running TypeScript compilation check...');

try {
  execSync('npm run build', { stdio: 'inherit' });
  console.log('\n🎉 TypeScript compilation successful!');
} catch (error) {
  console.log('\n⚠️  TypeScript compilation failed. Manual fixes may be needed.');
  console.log('Run "npm run build" to see remaining errors.');
} 
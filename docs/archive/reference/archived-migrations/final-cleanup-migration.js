#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

console.log('🔧 Running final cleanup migration...\n');

const specificFixes = [
  // Fix database includes that still reference old field names
  {
    file: 'index.ts',
    replacements: [
      { pattern: /report:\s*{/g, replacement: 'incident: {' }
    ]
  },
  
  // Fix admin routes
  {
    file: 'src/routes/admin.routes.ts', 
    replacements: [
      { pattern: /reports:\s*{/g, replacement: 'incidents: {' },
      { pattern: /event\.reports/g, replacement: 'event.incidents' },
      { pattern: /const\s+reportDates/g, replacement: 'const incidentDates' },
      { pattern: /id:\s*report\.id/g, replacement: 'id: incident.id' }
    ]
  },
  
  // Fix event routes - data access patterns
  {
    file: 'src/routes/event.routes.ts',
    replacements: [
      { pattern: /result\.data\?\.report/g, replacement: 'result.data?.incident' },
      { pattern: /result\.data\.report/g, replacement: 'result.data.incident' },
      { pattern: /incidentResult\.data\?\.report/g, replacement: 'incidentResult.data?.incident' },
      { pattern: /incidentResult\.data!\.report/g, replacement: 'incidentResult.data!.incident' },
      { pattern: /result\.data!\.reports/g, replacement: 'result.data!.incidents' },
      { pattern: /const\s+incident\s*=\s*incidentResult\.data!\.incident;[\s\S]*?const\s+isReporter\s*=\s*report\.reporterId/g, 
                replacement: 'const incident = incidentResult.data!.incident;\n    const isReporter = incident.reporterId' },
      { pattern: /const\s+incident\s*=\s*incidentResult\.data!\.incident;[\s\S]*?const\s+isAssigned\s*=\s*report\.assignedResponderId/g, 
                replacement: 'const incident = incidentResult.data!.incident;\n    const isAssigned = incident.assignedResponderId' }
    ]
  },
  
  // Fix user routes
  {
    file: 'src/routes/user.routes.ts',
    replacements: [
      { pattern: /report:\s*{/g, replacement: 'incident: {' }
    ]
  },
  
  // Fix comment service
  {
    file: 'src/services/comment.service.ts',
    replacements: [
      { pattern: /report:\s*{/g, replacement: 'incident: {' },
      { pattern: /const\s+isReporter\s*=\s*report\.reporterId/g, replacement: 'const isReporter = incident.reporterId' },
      { pattern: /const\s+isAssigned\s*=\s*report\.assignedResponderId/g, replacement: 'const isAssigned = incident.assignedResponderId' }
    ]
  },
  
  // Fix event service
  {
    file: 'src/services/event.service.ts',
    replacements: [
      { pattern: /report:\s*{\s*eventId\s*}/g, replacement: 'incident: { eventId }' },
      { pattern: /report:\s*{/g, replacement: 'incident: {' },
      { pattern: /c\.report\./g, replacement: 'c.incident.' },
      { pattern: /\(report\.createdAt/g, replacement: '(incident.createdAt' },
      { pattern: /\.includes\(report\.state\)/g, replacement: '.includes(incident.state)' },
      { pattern: /id:\s*report\.id/g, replacement: 'id: incident.id' }
    ]
  },
  
  // Fix incident service - remaining variable issues
  {
    file: 'src/services/incident.service.ts',
    replacements: [
      { pattern: /if\s*\(\s*!report\s*\|\|/g, replacement: 'if (!incident ||' },
      { pattern: /report\.eventId/g, replacement: 'incident.eventId' },
      { pattern: /report\.state/g, replacement: 'incident.state' },
      { pattern: /report\.reporterId/g, replacement: 'incident.reporterId' },
      { pattern: /report\.assignedResponderId/g, replacement: 'incident.assignedResponderId' },
      { pattern: /report\.id/g, replacement: 'incident.id' },
      { pattern: /report\.comments/g, replacement: 'incident.comments' },
      { pattern: /tx\.report\./g, replacement: 'tx.incident.' },
      { pattern: /incidentId:\s*report\.id/g, replacement: 'incidentId: incident.id' },
      { pattern: /eventRoles\.get\(report\.eventId\)/g, replacement: 'eventRoles.get(incident.eventId)' },
      { pattern: /report\.assignedResponderId\s*===/g, replacement: 'incident.assignedResponderId ===' },
      { pattern: /reportWithoutComments\s*}\s*=\s*report/g, replacement: 'incidentWithoutComments } = incident' }
    ]
  },
  
  // Fix notification service
  {
    file: 'src/services/notification.service.ts',
    replacements: [
      { pattern: /report:\s*{/g, replacement: 'incident: {' },
      { pattern: /incidentId\s*=\s*null/g, replacement: 'reportId = null' },
      { pattern: /report\.reporterId/g, replacement: 'incident.reporterId' },
      { pattern: /report\.assignedResponderId/g, replacement: 'incident.assignedResponderId' },
      { pattern: /report\.eventId/g, replacement: 'incident.eventId' },
      { pattern: /report\.title/g, replacement: 'incident.title' },
      { pattern: /report\.event/g, replacement: 'incident.event' },
      { pattern: /report\.id/g, replacement: 'incident.id' },
      { pattern: /incidentId:\s*report\.id/g, replacement: 'reportId: incident.id' }
    ]
  },
  
  // Fix user service
  {
    file: 'src/services/user.service.ts',
    replacements: [
      { pattern: /report:\s*{/g, replacement: 'incident: {' },
      { pattern: /eventRoles\.get\(report\.eventId\)/g, replacement: 'eventRoles.get(incident.eventId)' },
      { pattern: /report\.comments/g, replacement: 'incident.comments' },
      { pattern: /report\.assignedResponderId/g, replacement: 'incident.assignedResponderId' },
      { pattern: /reportWithoutComments\s*}\s*=\s*report/g, replacement: 'incidentWithoutComments } = incident' },
      { pattern: /report\.event/g, replacement: 'incident.event' },
      { pattern: /comment\.report\./g, replacement: 'comment.incident.' },
      { pattern: /incidentId:\s*incident\.id/g, replacement: 'reportId: incident.id' },
      { pattern: /incidentId:\s*comment\.incidentId/g, replacement: 'reportId: comment.incidentId' }
    ]
  },
  
  // Fix utils/notifications
  {
    file: 'src/utils/notifications.ts',
    replacements: [
      { pattern: /incidentId\s*=\s*null/g, replacement: 'reportId = null' },
      { pattern: /scopeId:\s*report\.eventId/g, replacement: 'scopeId: incident.eventId' },
      { pattern: /report\.event/g, replacement: 'incident.event' },
      { pattern: /report\.id/g, replacement: 'incident.id' },
      { pattern: /incidentId:\s*report\.id/g, replacement: 'reportId: incident.id' }
    ]
  }
];

function applySpecificFixes() {
  const backendDir = process.cwd();
  
  for (const { file, replacements } of specificFixes) {
    const fullPath = path.join(backendDir, file);
    
    if (!fs.existsSync(fullPath)) {
      console.log(`Skipped: ${file} (not found)`);
      continue;
    }
    
    console.log(`Processing: ${file}`);
    let content = fs.readFileSync(fullPath, 'utf8');
    const originalContent = content;
    
    for (const { pattern, replacement } of replacements) {
      content = content.replace(pattern, replacement);
    }
    
    if (content !== originalContent) {
      fs.writeFileSync(fullPath, content);
      console.log(`  ✅ Updated`);
    } else {
      console.log(`  ⏭️  No changes needed`);
    }
  }
}

// Apply the specific fixes
applySpecificFixes();

console.log('\n✅ Final cleanup completed!');
console.log('🔧 Running TypeScript compilation check...');

const { execSync } = require('child_process');
try {
  execSync('npm run build', { stdio: 'inherit' });
  console.log('\n🎉 TypeScript compilation successful!');
} catch (error) {
  console.log('\n⚠️  Some errors may still remain. Check the output above.');
} 
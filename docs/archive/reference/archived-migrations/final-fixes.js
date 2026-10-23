#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

console.log('🎯 Applying final targeted fixes...\n');

// Read and replace specific content blocks
function replaceInFile(filePath, replacements) {
  if (!fs.existsSync(filePath)) {
    console.log(`Skipped: ${filePath} (not found)`);
    return;
  }
  
  let content = fs.readFileSync(filePath, 'utf8');
  const originalContent = content;
  
  for (const { old, new: replacement } of replacements) {
    content = content.replace(old, replacement);
  }
  
  if (content !== originalContent) {
    fs.writeFileSync(filePath, content);
    console.log(`✅ Updated: ${path.basename(filePath)}`);
  } else {
    console.log(`⏭️  No changes: ${path.basename(filePath)}`);
  }
}

// Fix admin routes - reportDates variable
replaceInFile('src/routes/admin.routes.ts', [
  {
    old: /const incidentDates = event\.incidents\.map\(r => r\.createdAt\);\s*const allDates = \[\.\.\.reportDates/,
    new: 'const incidentDates = event.incidents.map(r => r.createdAt);\n      const allDates = [...incidentDates'
  }
]);

// Fix event routes - specific variable references in loops
replaceInFile('src/routes/event.routes.ts', [
  {
    old: /const oldAssignedUserId = currentIncident\.data\?\.report\?\.assignedResponderId;/,
    new: 'const oldAssignedUserId = currentIncident.data?.incident?.assignedResponderId;'
  },
  {
    old: /const oldState = currentIncident\.data\?\.report\?\.state;/,
    new: 'const oldState = currentIncident.data?.incident?.state;'
  },
  {
    old: /const reportUrl = `\$\{req\.protocol\}:\/\/\$\{req\.get\('host'\)\}\/events\/\$\{slug\}\/incidents\/\$\{report\.id\}`;/,
    new: 'const reportUrl = `${req.protocol}://${req.get(\'host\')}/events/${slug}/incidents/${incident.id}`;'
  },
  {
    old: /incidents\.forEach\(incident => \{\s*csv\.push\(\[\s*report\.id,/,
    new: 'incidents.forEach(incident => {\n        csv.push([\n          incident.id,'
  },
  {
    old: /`"\$\{report\.title\.replace\(\/\"\/g, '""'\)\}"`,/,
    new: '`"${incident.title.replace(/"/g, \'""\')}"`,'
  },
  {
    old: /new Date\(report\.createdAt\)\.toISOString\(\),/,
    new: 'new Date(incident.createdAt).toISOString(),'
  },
  {
    old: /`"\$\{report\.description\.replace\(\/\"\/g, '""'\)\}"`,/,
    new: '`"${incident.description.replace(/"/g, \'""\')}"`,'
  },
  {
    old: /textContent \+= `ID: \$\{report\.id\}\\n`;/,
    new: 'textContent += `ID: ${incident.id}\\n`;'
  },
  {
    old: /textContent \+= `Title: \$\{report\.title\}\\n`;/,
    new: 'textContent += `Title: ${incident.title}\\n`;'
  },
  {
    old: /textContent \+= `Type: \$\{report\.type\}\\n`;/,
    new: 'textContent += `Type: ${incident.type}\\n`;'
  },
  {
    old: /textContent \+= `Status: \$\{report\.state\}\\n`;/,
    new: 'textContent += `Status: ${incident.state}\\n`;'
  },
  {
    old: /textContent \+= `Severity: \$\{report\.severity \|\| 'Not specified'\}\\n`;/,
    new: 'textContent += `Severity: ${incident.severity || \'Not specified\'}\\n`;'
  },
  {
    old: /textContent \+= `Reporter: \$\{report\.reporter\?\.name \|\| 'Unknown'\}\\n`;/,
    new: 'textContent += `Reporter: ${incident.reporter?.name || \'Unknown\'}\\n`;'
  },
  {
    old: /textContent \+= `Assigned: \$\{report\.assignedResponder\?\.name \|\| 'Unassigned'\}\\n`;/,
    new: 'textContent += `Assigned: ${incident.assignedResponder?.name || \'Unassigned\'}\\n`;'
  },
  {
    old: /textContent \+= `Created: \$\{new Date\(report\.createdAt\)\.toISOString\(\)\}\\n`;/,
    new: 'textContent += `Created: ${new Date(incident.createdAt).toISOString()}\\n`;'
  },
  {
    old: /textContent \+= `Description: \$\{report\.description\}\\n`;/,
    new: 'textContent += `Description: ${incident.description}\\n`;'
  },
  {
    old: /if \(isReporter && report\.reporterId !== user\.id\) \{/,
    new: 'if (isReporter && incident.reporterId !== user.id) {'
  }
]);

// Fix incident service - reportWithoutComments variable
replaceInFile('src/services/incident.service.ts', [
  {
    old: /reportWithoutComments/g,
    new: 'incidentWithoutComments'
  }
]);

// Fix user service - reportWithoutComments variable  
replaceInFile('src/services/user.service.ts', [
  {
    old: /reportWithoutComments/g,
    new: 'incidentWithoutComments'
  },
  {
    old: /incidentId: log\.targetType === 'Report'/,
    new: 'reportId: log.targetType === \'Report\''
  }
]);

// Fix notification service - incidentId parameter issue
replaceInFile('src/services/notification.service.ts', [
  {
    old: /async createNotification\(\{\s*userId,\s*type,\s*priority = 'normal',\s*title,\s*message,\s*eventId = null,\s*reportId = null,\s*incidentId,/,
    new: 'async createNotification({\n    userId,\n    type,\n    priority = \'normal\',\n    title,\n    message,\n    eventId = null,\n    reportId = null,'
  }
]);

// Fix utils/notifications - incidentId parameter issue
replaceInFile('src/utils/notifications.ts', [
  {
    old: /reportId = null,\s*incidentId,/,
    new: 'reportId = null,'
  },
  {
    old: /incidentId: incident\.id,/,
    new: 'reportId: incident.id,'
  }
]);

console.log('\n✅ Final fixes applied!');
console.log('🔧 Running final TypeScript compilation check...');

const { execSync } = require('child_process');
try {
  execSync('npm run build', { stdio: 'inherit' });
  console.log('\n🎉 All compilation errors fixed!');
} catch (error) {
  console.log('\n⚠️  Please check any remaining errors manually.');
} 
#!/usr/bin/env node

const fs = require('fs');

console.log('🔧 Fixing remaining report variables in incident detail page...\n');

const filePath = './pages/events/[eventSlug]/incidents/[incidentId]/index.tsx';

if (!fs.existsSync(filePath)) {
  console.log('❌ File not found:', filePath);
  process.exit(1);
}

let content = fs.readFileSync(filePath, 'utf8');

// Specific replacements for remaining report references
const replacements = [
  // Variable references that should be incident
  { pattern: /\breport\./g, replacement: 'incident.' },
  { pattern: /\breport\?/g, replacement: 'incident?' },
  { pattern: /\bsetReport\(/g, replacement: 'setIncident(' },
  
  // Fix API endpoints that still use report
  { pattern: /\/incidents\/\$\{incidentId\}\/state-history/g, replacement: '/incidents/${incidentId}/state-history' },
  { pattern: /\/incidents\/\$\{incidentId\}\/state/g, replacement: '/incidents/${incidentId}/state' },
  { pattern: /\/incidents\/\$\{incidentId\}\/comments/g, replacement: '/incidents/${incidentId}/comments' },
  { pattern: /\/incidents\/\$\{incidentId\}\/evidence/g, replacement: '/incidents/${incidentId}/evidence' },
  { pattern: /\/incidents\/\$\{incidentId\}\/title/g, replacement: '/incidents/${incidentId}/title' },
];

const originalContent = content;

for (const { pattern, replacement } of replacements) {
  content = content.replace(pattern, replacement);
}

if (content !== originalContent) {
  fs.writeFileSync(filePath, content);
  console.log('✅ Updated incident detail page variables');
} else {
  console.log('⏭️  No changes needed');
}

console.log('\n🎯 Variable fix complete!'); 
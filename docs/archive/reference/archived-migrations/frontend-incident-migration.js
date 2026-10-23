#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

console.log('🎨 Starting Frontend Report-to-Incident Migration...\n');

// Define all the replacements to apply
const replacements = [
  // API endpoint calls
  { pattern: /\/api\/reports\b/g, replacement: '/api/incidents' },
  { pattern: /\/api\/events\/([^/]+)\/reports\b/g, replacement: '/api/events/$1/incidents' },
  
  // Page routes and navigation
  { pattern: /\/reports\/new\b/g, replacement: '/incidents/new' },
  { pattern: /\/reports\/([^/\s"'`]+)/g, replacement: '/incidents/$1' },
  { pattern: /\/my-incidents\b/g, replacement: '/my-incidents' },
  { pattern: /\/dashboard\/reports\b/g, replacement: '/dashboard/incidents' },
  
  // Component imports
  { pattern: /from ['"`](.*)\/reports\/(.*)['"`]/g, replacement: "from '$1/incidents/$2'" },
  { pattern: /from ['"`](.*)\/incident-detail\/(.*)['"`]/g, replacement: "from '$1/incident-detail/$2'" },
  { pattern: /from ['"`](.*)ReportForm['"`]/g, replacement: "from '$1IncidentForm'" },
  { pattern: /from ['"`](.*)ReportDetailView['"`]/g, replacement: "from '$1IncidentDetailView'" },
  
  // React component references
  { pattern: /<IncidentForm\b/g, replacement: '<IncidentForm' },
  { pattern: /<\/ReportForm>/g, replacement: '</IncidentForm>' },
  { pattern: /<IncidentDetailView\b/g, replacement: '<IncidentDetailView' },
  { pattern: /<\/ReportDetailView>/g, replacement: '</IncidentDetailView>' },
  { pattern: /<EnhancedIncidentList\b/g, replacement: '<EnhancedIncidentList' },
  { pattern: /<\/EnhancedReportList>/g, replacement: '</EnhancedIncidentList>' },
  
  // Function and variable names
  { pattern: /const\s+\[reports?,\s*setReports?\]/g, replacement: 'const [incidents, setIncidents]' },
  { pattern: /const\s+\[selectedIncident,\s*setSelectedReport\]/g, replacement: 'const [selectedIncident, setSelectedIncident]' },
  { pattern: /onEditIncident\b/g, replacement: 'onEditIncident' },
  { pattern: /handleIncidentSubmit\b/g, replacement: 'handleIncidentSubmit' },
  { pattern: /canEditIncident\b/g, replacement: 'canEditIncident' },
  
  // State and hooks  
  { pattern: /useReports\(/g, replacement: 'useIncidents(' },
  { pattern: /useReport\(/g, replacement: 'useIncident(' },
  { pattern: /incident:/g, replacement: 'incident:' },
  { pattern: /incidents:/g, replacement: 'incidents:' },
  
  // TypeScript interfaces and types
  { pattern: /interface\s+Report\b/g, replacement: 'interface Incident' },
  { pattern: /type\s+Report\b/g, replacement: 'type Incident' },
  { pattern: /IncidentState\b/g, replacement: 'IncidentState' },
  { pattern: /IncidentType\b/g, replacement: 'IncidentType' },
  { pattern: /IncidentSeverity\b/g, replacement: 'IncidentSeverity' },
  
  // UI Text and Labels
  { pattern: /"Submit an Incident"/g, replacement: '"Submit an Incident"' },
  { pattern: /"Submit Incident"/g, replacement: '"Submit Incident"' },
  { pattern: /"New Incident"/g, replacement: '"New Incident"' },
  { pattern: /"My Incidents"/g, replacement: '"My Incidents"' },
  { pattern: /"All Incidents"/g, replacement: '"All Incidents"' },
  { pattern: /"Event Incidents"/g, replacement: '"Event Incidents"' },
  { pattern: /"Submit New Incident"/g, replacement: '"Submit New Incident"' },
  { pattern: /"Back to Incidents"/g, replacement: '"Back to Incidents"' },
  { pattern: /"View Incidents"/g, replacement: '"View Incidents"' },
  { pattern: /"edit incident"/g, replacement: '"edit incident"' },
  { pattern: /"Report an incident"/g, replacement: '"Report an incident"' }, // Keep this as-is (verb usage)
  
  // Placeholders and search text
  { pattern: /"Search pages, events, reports\.\.\."/g, replacement: '"Search pages, events, incidents..."' },
  { pattern: /'Search pages, events, reports\.\.\.'/g, replacement: "'Search pages, events, incidents...'" },
  
  // Function names and descriptions
  { pattern: /onQuickIncidentOpen/g, replacement: 'onQuickIncidentOpen' },
  { pattern: /handleQuickIncident/g, replacement: 'handleQuickIncident' },
  { pattern: /'Submit incident for'/g, replacement: "'Submit incident for'" },
  { pattern: /'Quick submit incident'/g, replacement: "'Quick submit incident'" },
  { pattern: /'Go to all incidents'/g, replacement: "'Go to all incidents'" },
  
  // Page and component names in comments and JSDoc
  { pattern: /EventIncidentsPage/g, replacement: 'EventIncidentsPage' },
  { pattern: /MyEventIncidentsPage/g, replacement: 'MyEventIncidentsPage' },
  { pattern: /NewIncident/g, replacement: 'NewIncident' },
  
  // Variable declarations
  { pattern: /incidentId\b/g, replacement: 'incidentId' },
  { pattern: /incidentIds\b/g, replacement: 'incidentIds' },
  { pattern: /selectedIncident\b/g, replacement: 'selectedIncident' },
  
  // Object properties in API responses
  { pattern: /\.incident\b/g, replacement: '.incident' },
  { pattern: /\.incidents\b/g, replacement: '.incidents' },
  
  // CSS classes and test selectors  
  { pattern: /incident-detail/g, replacement: 'incident-detail' },
  { pattern: /incident-form/g, replacement: 'incident-form' },
  { pattern: /incident-list/g, replacement: 'incident-list' },
  
  // Accessibility and test labels
  { pattern: /aria-label=".*incident.*"/gi, replacement: (match) => match.replace(/report/gi, 'incident') },
  { pattern: /data-testid=".*incident.*"/gi, replacement: (match) => match.replace(/report/gi, 'incident') },
];

// Track file renames needed
const fileRenames = [
  // Component files
  { from: 'components/ReportForm.tsx', to: 'components/IncidentForm.tsx' },
  { from: 'components/ReportForm.test.tsx', to: 'components/IncidentForm.test.tsx' },
  { from: 'components/ReportDetailView.tsx', to: 'components/IncidentDetailView.tsx' },
  { from: 'components/ReportDetailView.test.tsx', to: 'components/IncidentDetailView.test.tsx' },
  
  // Component directories
  { from: 'components/reports/', to: 'components/incidents/' },
  { from: 'components/incident-detail/', to: 'components/incident-detail/' },
  { from: 'incident-detail/', to: 'incident-detail/' }, // Root level directory
  
  // Page files
  { from: 'pages/events/[eventSlug]/my-incidents.tsx', to: 'pages/events/[eventSlug]/my-incidents.tsx' },
  { from: 'pages/events/[eventSlug]/reports/', to: 'pages/events/[eventSlug]/incidents/' },
  { from: 'pages/dashboard/incidents.tsx', to: 'pages/dashboard/incidents.tsx' },
];

// Function to apply text replacements to file content
function applyReplacements(content) {
  let modifiedContent = content;
  
  for (const { pattern, replacement } of replacements) {
    modifiedContent = modifiedContent.replace(pattern, replacement);
  }
  
  return modifiedContent;
}

// Function to process a single file
function processFile(filePath) {
  if (!fs.existsSync(filePath)) {
    return false;
  }
  
  const content = fs.readFileSync(filePath, 'utf8');
  const modifiedContent = applyReplacements(content);
  
  if (content !== modifiedContent) {
    fs.writeFileSync(filePath, modifiedContent);
    return true;
  }
  
  return false;
}

// Get all frontend files to process
function getAllFrontendFiles() {
  const files = [];
  
  function scanDirectory(dir) {
    if (!fs.existsSync(dir)) return;
    
    const entries = fs.readdirSync(dir);
    
    for (const entry of entries) {
      const fullPath = path.join(dir, entry);
      const stat = fs.statSync(fullPath);
      
      if (stat.isDirectory()) {
        // Skip node_modules, .next, coverage directories
        if (!['node_modules', '.next', 'coverage', '.git'].includes(entry)) {
          scanDirectory(fullPath);
        }
      } else if (stat.isFile()) {
        // Process TypeScript, JavaScript, and JSX files
        if (/\.(tsx?|jsx?|mdx?)$/.test(entry)) {
          files.push(fullPath);
        }
      }
    }
  }
  
  scanDirectory('./');
  return files;
}

// Main migration execution
console.log('📁 Processing frontend files...');
const files = getAllFrontendFiles();
let modifiedCount = 0;

for (const file of files) {
  if (processFile(file)) {
    modifiedCount++;
    console.log(`✅ Updated: ${path.relative('./', file)}`);
  }
}

console.log(`\n📊 Migration Summary:`);
console.log(`- Files processed: ${files.length}`);
console.log(`- Files modified: ${modifiedCount}`);

console.log(`\n📋 File Renames Required (manual step):`);
fileRenames.forEach(rename => {
  console.log(`📝 Rename: ${rename.from} → ${rename.to}`);
});

console.log(`\n🎯 Frontend migration text replacements complete!`);
console.log(`📌 Next steps:`);
console.log(`   1. Manually rename files and directories listed above`);
console.log(`   2. Update any import paths that may have broken`);
console.log(`   3. Test frontend compilation`);
console.log(`   4. Run frontend tests\n`); 
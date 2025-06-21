#!/usr/bin/env node

/**
 * Build script for Conducky documentation
 * Handles API documentation generation with fallbacks for deployment environments
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const BACKEND_SWAGGER_PATH = '../backend/swagger.json';
const API_DOCS_PATH = './docs/api';

function log(message, type = 'info') {
  const timestamp = new Date().toISOString();
  const prefix = type === 'error' ? '❌' : type === 'warning' ? '⚠️' : '✅';
  console.log(`${prefix} [${timestamp}] ${message}`);
}

function checkBackendSwagger() {
  const swaggerPath = path.resolve(__dirname, BACKEND_SWAGGER_PATH);
  return fs.existsSync(swaggerPath);
}

function generateApiDocs() {
  try {
    log('Starting API documentation generation...');
    
    // Check if backend swagger.json exists
    if (!checkBackendSwagger()) {
      log('Backend swagger.json not found, skipping API docs generation', 'warning');
      return false;
    }
    
    // Clean existing API docs
    try {
      execSync('npm run clean-api-docs', { stdio: 'pipe' });
      log('Cleaned existing API documentation');
    } catch (error) {
      log('No existing API docs to clean', 'warning');
    }
    
    // Generate API docs
    execSync('npm run gen-api-docs conducky', { stdio: 'inherit' });
    log('API documentation generated successfully');
    return true;
    
  } catch (error) {
    log(`API documentation generation failed: ${error.message}`, 'error');
    return false;
  }
}

function createFallbackApiDocs() {
  log('Creating fallback API documentation...');
  
  const apiDocsDir = path.resolve(__dirname, API_DOCS_PATH);
  
  // Ensure API docs directory exists
  if (!fs.existsSync(apiDocsDir)) {
    fs.mkdirSync(apiDocsDir, { recursive: true });
  }
  
  // Create a basic API documentation page
  const fallbackContent = `---
id: conducky-api
title: Conducky API
description: API documentation for Conducky
sidebar_label: API Reference
---

# Conducky API Documentation

The API documentation is currently being generated. Please check back later or refer to the [Developer Documentation](/developer-docs/api-documentation) for setup instructions.

## Available Endpoints

The Conducky API provides the following main endpoint categories:

### Authentication
- \`POST /api/auth/login\` - User login
- \`POST /api/auth/logout\` - User logout  
- \`GET /api/auth/session\` - Get session status

### Events
- \`GET /api/events\` - List events
- \`POST /api/events\` - Create event
- \`GET /api/events/{slug}\` - Get event details

### Reports
- \`GET /api/events/{slug}/reports\` - List reports for event
- \`POST /api/events/{slug}/reports\` - Create new report
- \`GET /api/reports/{id}\` - Get report details

### Users
- \`GET /api/users\` - List users (SuperAdmin only)
- \`POST /api/users\` - Create user
- \`GET /api/users/{id}\` - Get user details

For detailed API documentation with interactive examples, please ensure the backend OpenAPI specification is available during the build process.

## Setup

To generate complete API documentation:

1. Ensure the backend server is configured with OpenAPI/Swagger
2. Run \`npm run generate-docs\` in the backend directory
3. Run \`npm run gen-api-docs conducky\` in the website directory
4. Rebuild the documentation site

For more information, see the [API Documentation Setup Guide](/developer-docs/api-documentation).
`;

  const fallbackPath = path.join(apiDocsDir, 'conducky-api.info.mdx');
  fs.writeFileSync(fallbackPath, fallbackContent);
  
  // Create sidebar.ts file
  const sidebarContent = `export default [
  {
    type: "doc",
    id: "conducky-api",
    label: "API Reference",
    className: "api-method"
  }
];
`;
  
  const sidebarPath = path.join(apiDocsDir, 'sidebar.ts');
  fs.writeFileSync(sidebarPath, sidebarContent);
  
  log('Fallback API documentation created');
}

function main() {
  log('Starting documentation build process...');
  
  // Try to generate API docs, create fallback if it fails
  const apiDocsGenerated = generateApiDocs();
  
  if (!apiDocsGenerated) {
    log('Falling back to basic API documentation', 'warning');
    createFallbackApiDocs();
  }
  
  log('Documentation build preparation complete');
  
  // Exit with success code regardless of API docs generation
  // This ensures the main Docusaurus build can continue
  process.exit(0);
}

// Run the script
if (require.main === module) {
  main();
}

module.exports = { generateApiDocs, createFallbackApiDocs, checkBackendSwagger }; 
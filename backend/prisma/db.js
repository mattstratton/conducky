// Prisma 7 generates a TypeScript client, so plain-node seed and maintenance
// scripts load it through ts-node. Usage: const { createPrismaClient } = require('./db');
require('ts-node/register/transpile-only');
module.exports = require('../src/config/prisma-client');

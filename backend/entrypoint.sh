#!/bin/sh
set -e

# Install dependencies if needed (for dev, since node_modules is a volume)
if [ ! -d "node_modules" ]; then
  npm install
fi

# Generate Prisma client and run migrations
echo "Generating Prisma client..."
npx prisma generate
echo "Running Prisma migrations..."
npx prisma migrate deploy

echo "Building TypeScript..."
npm run build

echo "Starting TypeScript backend server..."
npm run start:ts 
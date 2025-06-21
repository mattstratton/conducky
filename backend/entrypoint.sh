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

# Always ensure roles are seeded correctly
echo "Seeding roles..."
npm run seed:roles

# Always ensure email templates are available (needed for both dev and prod)
echo "Ensuring email templates are available..."
mkdir -p /app/dist/email-templates
cp -r /app/email-templates/* /app/dist/email-templates/

if [ "$NODE_ENV" = "production" ]; then
  echo "Building TypeScript for production..."
  npm run build
  echo "Starting TypeScript backend server (production)..."
  npm run start:ts
else
  echo "Starting TypeScript backend server (development with live reload)..."
  npm run dev:ts
fi 
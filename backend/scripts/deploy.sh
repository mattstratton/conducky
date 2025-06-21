#!/bin/bash

# Railway deployment script
# This script ensures that both migrations and seeding are run during deployment

echo "🚀 Starting Railway deployment..."

# Run database migrations
echo "📦 Running database migrations..."
npx prisma migrate deploy

# Check if migrations were successful
if [ $? -eq 0 ]; then
    echo "✅ Migrations completed successfully"
else
    echo "❌ Migrations failed"
    exit 1
fi

# Run essential roles seeding (safe for production)
echo "🔑 Running essential roles seeding..."
npm run seed:roles

# Check if roles seeding was successful
if [ $? -eq 0 ]; then
    echo "✅ Roles seeding completed successfully"
else
    echo "⚠️  Roles seeding failed (this might be expected if roles already exist)"
    # Don't exit on seeding failure as it might just mean roles already exist
fi

# Build the application
echo "🔨 Building application..."
npm run build

# Check if build was successful
if [ $? -eq 0 ]; then
    echo "✅ Build completed successfully"
else
    echo "❌ Build failed"
    exit 1
fi

echo "🎉 Railway deployment completed successfully!" 
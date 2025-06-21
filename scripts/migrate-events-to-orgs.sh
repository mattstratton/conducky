#!/bin/bash

# Migration Script: Events to Organizations
# This script runs the migration in Docker Compose environments

set -e

echo "🔄 Starting Events to Organizations Migration..."

# Check if we're in the right directory
if [ ! -f "docker-compose.yml" ]; then
    echo "❌ Error: docker-compose.yml not found. Please run this script from the project root."
    exit 1
fi

# Check if backend container is running
if ! docker-compose ps backend | grep -q "Up"; then
    echo "❌ Error: Backend container is not running. Please start with 'docker-compose up -d'"
    exit 1
fi

echo "📊 Running migration in backend container..."

# Run the migration script in the backend container
docker-compose exec backend npm run migrate:events-to-orgs

echo "✅ Migration completed!"
echo ""
echo "📋 Next steps:"
echo "   - Check the migration output above for any issues"
echo "   - Verify your application works correctly with the new organization structure"
echo "   - Test organization and event functionality"
echo ""
echo "🔍 To verify the migration:"
echo "   - Login as SuperAdmin: superadmin@test.com / superpass"
echo "   - Visit: http://localhost:3001/admin/organizations"
echo "   - Check that all events are now linked to organizations" 
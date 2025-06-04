#!/bin/sh

set -e

echo "Stopping all containers..."
docker-compose down

echo
read -p "Do you want to prune Docker system (this will remove all volumes, including your DB data)? [y/N] " PRUNE
if [ "$PRUNE" = "y" ] || [ "$PRUNE" = "Y" ]; then
  docker system prune -af --volumes
fi

echo "\nRemoving backend/node_modules..."
rm -rf backend/node_modules

echo "\nRebuilding backend container..."
docker-compose build backend

echo "\nStarting stack..."
docker-compose up -d

echo "\nGenerating Prisma client in backend container..."
docker-compose exec backend npx prisma generate

echo
read -p "Do you want to run the seed script (populate default roles)? [y/N] " SEED
if [ "$SEED" = "y" ] || [ "$SEED" = "Y" ]; then
  docker-compose exec backend npm run seed
fi

echo "\nDone! Your environment is refreshed." 
#!/usr/bin/env bash
set -euo pipefail

# Safe wrapper to apply migrations non-destructively in Docker Compose
# Usage: bash -c "./scripts/db-apply.sh"

echo "Applying Prisma migrations (non-destructive) via docker compose..."
docker compose exec backend npx prisma migrate deploy | cat
echo "Done."



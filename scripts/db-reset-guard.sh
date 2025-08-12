#!/usr/bin/env bash
set -euo pipefail

# Hard guard against destructive resets in non-test environments

ENV=${NODE_ENV:-development}

if [[ "$ENV" != "test" ]]; then
  echo "Refusing to run prisma migrate reset when NODE_ENV=$ENV."
  echo "This command is destructive. Use migrate deploy instead."
  exit 1
fi

echo "Running prisma migrate reset in test environment..."
docker compose exec -T backend npx prisma migrate reset --force --skip-generate --skip-seed | cat



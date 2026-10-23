#!/usr/bin/env bash
# Claude Code PreToolUse hook (Edit|Write): block edits to Prisma migrations that
# already exist on origin/main. Applied migrations are checksummed; editing one
# breaks `prisma migrate deploy` for every existing install. New migrations on
# the current branch are fine to edit.
set -uo pipefail

file_path=$(jq -r '.tool_input.file_path // empty' 2>/dev/null)
[[ -z "$file_path" ]] && exit 0

case "$file_path" in
  */backend/prisma/migrations/*/migration.sql)
    root=$(git rev-parse --show-toplevel 2>/dev/null) || exit 0
    rel="${file_path#"$root"/}"
    if git cat-file -e "origin/main:$rel" 2>/dev/null; then
      echo "BLOCKED: $rel is already on main and may be applied in deployed databases." >&2
      echo "Create a NEW migration: docker compose exec backend npx prisma migrate dev --name <what_changed>" >&2
      exit 2
    fi
    ;;
esac
exit 0

#!/usr/bin/env bash
# Claude Code PreToolUse hook (Bash): block pushes from main and destructive
# docker/prisma commands. Reads the tool call JSON on stdin; exit 2 blocks.
set -uo pipefail

cmd=$(jq -r '.tool_input.command // empty' 2>/dev/null)
[[ -z "$cmd" ]] && exit 0

block() { echo "BLOCKED: $1" >&2; exit 2; }

if [[ "$cmd" == *"git push"* ]]; then
  branch=$(git rev-parse --abbrev-ref HEAD 2>/dev/null || echo unknown)
  [[ "$branch" == "main" ]] && block "on 'main'. Branch and open a PR instead."
  # Only the `git push ...` segment: `&& gh pr create --base main` must not trip this.
  push_seg=$(grep -oE 'git push[^;&|]*' <<<"$cmd" | head -1)
  [[ "$push_seg" =~ (^|[[:space:]])(main|HEAD:main|[^[:space:]]+:main)([[:space:]]|$) ]] && block "pushing to main. Use a PR."
fi

# Dev DB lives in the db_data volume. Wiping it needs an explicit human yes.
# Only the `docker compose down ...` segment: a later `grep -v` must not trip the -v check.
down_seg=$(grep -oE 'docker[[:space:]-]+(compose[[:space:]]+)?down[^;&|]*' <<<"$cmd")
if [[ "$down_seg" =~ (^|[[:space:]])(-v|--volumes)([[:space:]]|$) ]] \
  || [[ "$cmd" =~ docker[[:space:]]+(system|volume)[[:space:]]+prune ]] \
  || [[ "$cmd" =~ docker[[:space:]]+volume[[:space:]]+rm ]] \
  || [[ "$cmd" == *"scripts/refresh-dev.sh"* ]] \
  || [[ "$cmd" == *"npm run refresh-dev"* ]] \
  || [[ "$cmd" == *"prisma migrate reset"* ]] \
  || [[ "$cmd" == *"prisma db push --force-reset"* ]]; then
  block "destructive command (can wipe the dev database). Ask the user first; they can run it themselves with '! <cmd>'."
fi
exit 0

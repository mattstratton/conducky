#!/usr/bin/env bash
# Self-test for scripts/guard-bash.sh. Run: bash scripts/guard-bash.test.sh (exit 0 = all pass).
cd "$(dirname "$0")/.." || exit 1
fail=0
t(){ printf '%s' "$1" | bash scripts/guard-bash.sh >/dev/null 2>&1; got=$?; [[ $got == "$2" ]] && r=ok || { r=FAIL; fail=1; }; echo "$r exit=$got want=$2 :: $3"; }
# pushes
t '{"tool_input":{"command":"git push -u origin chore/x"}}' 0 "push feature branch"
t '{"tool_input":{"command":"git push -u origin chore/x 2>&1 | tail -4 && gh pr create --base main --head chore/x"}}' 0 "push + gh pr create --base main"
t '{"tool_input":{"command":"git push origin main"}}' 2 "push origin main"
t '{"tool_input":{"command":"git push origin HEAD:main"}}' 2 "push HEAD:main"
t '{"tool_input":{"command":"git push origin feature:main"}}' 2 "push feature:main"
t '{"tool_input":{"command":"git push -u origin main && echo hi"}}' 2 "push main then echo"
# docker down
t '{"tool_input":{"command":"docker compose down"}}' 0 "plain down"
t '{"tool_input":{"command":"docker compose down 2>&1 | grep -v level=warning | tail -4 && rm -rf backend/node_modules"}}' 0 "down piped to grep -v (the bug)"
t '{"tool_input":{"command":"docker compose down && docker compose up -d --build"}}' 0 "down then up"
t '{"tool_input":{"command":"docker compose ps"}}' 0 "compose ps"
t '{"tool_input":{"command":"docker compose down -v"}}' 2 "down -v"
t '{"tool_input":{"command":"docker compose down --volumes"}}' 2 "down --volumes"
t '{"tool_input":{"command":"docker-compose down --remove-orphans -v"}}' 2 "v1 down ... -v"
t '{"tool_input":{"command":"docker compose down -v && echo done"}}' 2 "down -v then echo"
t '{"tool_input":{"command":"docker compose down -v 2>&1 | tail"}}' 2 "down -v piped"
# other destructive
t '{"tool_input":{"command":"docker system prune -af"}}' 2 "system prune"
t '{"tool_input":{"command":"docker volume rm conducky_db_data"}}' 2 "volume rm"
t '{"tool_input":{"command":"bash scripts/refresh-dev.sh"}}' 2 "refresh-dev"
t '{"tool_input":{"command":"npx prisma migrate reset"}}' 2 "migrate reset"
exit $fail

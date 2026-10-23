---
name: pr
description: Run the pre-PR checks, commit, push the branch and open a PR. Use when the user says "create a PR", "open a PR", "let's PR this", or "push this".
---

# /pr

Do not skip or reorder. Stop and report on any failure; don't paper over it.

1. **Branch.** `git rev-parse --abbrev-ref HEAD`. If `main`, create a descriptive branch first (`fix/...`, `feature/...`, `chore/...`).
2. **Look at what's changing.** `git status`, `git diff origin/main...HEAD --stat`. Stage specific files only (never `git add -A`). Make sure no `.env`, key, coverage, `dist/` or `ctrf/` output is staged.
3. **Checks** (run in the containers; start the stack with `docker compose up -d` if needed). Run independent ones in parallel:
   - `docker compose exec backend npm run type-check`
   - `docker compose exec backend npm test`
   - `docker compose exec frontend npm test`
   - If frontend files changed: `docker compose exec frontend npx tsc --noEmit`, and report any *new* errors (a few old ones exist in test fixtures; see `docs/revival-plan.md`).
4. **Tests ship with code.** If the diff adds or changes behavior and no test changed, say so and ask before continuing.
5. **Docs.** Run `/docs-review` logic against the changed files. Fix required updates now.
6. **Reviewers** (only when relevant, run in parallel):
   - `security-reviewer` if the diff touches `backend/src/{routes,middleware,services,utils}`, `prisma/schema.prisma`, auth, uploads, or encryption.
   - `accessibility-reviewer` if the diff touches `.tsx`/CSS in `frontend/`.
   Fix critical findings; report warnings.
7. **Commit** with a clear message. Reference issues as `Closes #N`. End with the attribution line your system reminder specifies, if any.
8. **Push and open the PR**: `git push -u origin <branch>`, then `gh pr create` using `.github/pull_request_template.md`. Add a label (`bug`, `enhancement`, or `chore`) because release notes are built from labels. Open as **draft** unless the user says otherwise.
9. Report the PR URL and which checks passed, failed or were skipped. Never enable auto-merge.

Flags: `--docs-only` skips step 3's test runs and step 6.

---
name: implement-issue
description: Take a GitHub issue from reading through to a ready-to-PR branch. Use when the user says "implement #N", "work on issue N", "pick up this issue", or runs /implement-issue N.
---

# /implement-issue <number>

1. **Read the whole issue.** `gh issue view N --comments`, including linked issues. Requirements hide in comments. Check the code for evidence the work is already done or partially done.
2. **Check for overlap.** `gh issue list --search "<key nouns>"` for newer or duplicate issues. Raise any you find.
3. **Ask** only what the issue leaves ambiguous (scope, acceptance, edge cases). Zero questions is fine. If it's too vague to plan, suggest splitting or `superpowers:brainstorming` instead of guessing.
4. **Branch** from fresh `main`: `git fetch origin main && git switch -c <type>/<short-name> origin/main`.
5. **Plan briefly** (files to touch, tests to write, event-scoping/RBAC/encryption implications, docs to update). For anything non-trivial, show the plan and wait for a yes.
6. **Build test-first** (`superpowers:test-driven-development`): failing test, minimal code, green. Backend tests go in `backend/tests/`, frontend tests are co-located. Use `GLOSSARY.md` vocabulary.
7. **Verify** before claiming done (`superpowers:verification-before-completion`): backend build + tests, frontend tests, type-checks, and for UI work look at it in the browser at mobile width and with keyboard only.
8. **Docs**: update `website/docs/` for behavior, API, role or setup changes.
9. **Stop at the gate.** Summarize what changed and what you verified, then tell the user to run `/pr`. Don't push or open the PR yourself. Put `Closes #N` in the commit/PR text.

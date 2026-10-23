---
name: triage-issues
description: Walk GitHub issues on mattstratton/conducky one at a time and decide keep, relabel, consolidate or close. Use when the user says "triage", "clean up issues", "review the backlog", or runs /triage-issues.
---

# /triage-issues

Most of the backlog was filed in a June 2025 planning dump and hasn't been touched since. The default question for each issue is **"would we build this, and when?"**, not "is this a good idea?".

1. **Fetch.** `gh issue list --state open --limit 200 --json number,title,labels,createdAt,updatedAt,comments`. Optionally filter by label or `--search` if the user names a theme.
2. **Group first.** Before going one by one, cluster obvious duplicates and parent/child overlap (e.g. two issues for virus scanning, several a11y epics) and show the clusters. Propose a survivor per cluster.
3. **Per issue (or cluster), read the whole thing**: `gh issue view N --comments`. Check the code for evidence it's already done or no longer applicable before proposing anything; don't trust the checklist in the body.
4. **Ask once per issue, as a bundle:** `Suggest: <keep|close as done|close as duplicate of #N|close as won't do> · priority <now|next|later> · labels <...>. Accept, override or skip?`
   - Priorities are labels, not a ceremony: use `high-priority` for "next", nothing for "later".
   - Use `bug` / `enhancement` / `documentation` / `security` as the main labels; they drive release notes (`.github/release.yml`).
5. **Apply** with `gh issue edit` / `gh issue close --comment "<reason>"`. Always leave a one-line reason when closing. Never close without a user yes.
6. **Summary.** Counts kept/closed/merged, and the top 5 "next" items. Update the step 5 log in `docs/revival-plan.md`.

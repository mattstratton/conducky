## 2025-08-12 — Frontend production build fixes

### What changed
- Resolved TypeScript build errors in `frontend/pages/events/[eventSlug]/incidents/[incidentId]/index.tsx`:
  - Safely narrowed `data.incident` before state updates in state-change and reopen flows.
  - Ensured `stateHistory` updater only appends a definitely defined history entry.
  - Corrected `onIncidentUpdate` to return `Incident | null` and only merge when a prior incident exists.

### Outcome
- Verified a successful production build inside Docker:
  - Command: `docker compose run --rm --no-deps --entrypoint "" frontend sh -lc 'npm install && npm run build'`
  - Next.js reported: “Compiled successfully” and completed static generation.

### Notes
- Avoided `npm ci` inside the mounted volume to prevent `ENOTEMPTY` on `node_modules`.
- Non-blocking warnings remain:
  - Next.js ESLint plugin not detected; consider adding the Next.js ESLint config.
  - React version not specified in `eslint-plugin-react` settings.
  - SWC disabled due to custom `babel.config.js` (informational).

### Suggested next steps
- Run the full test suite per project rules (root): `./scripts/run-all-tests.sh` or `npm run test:all`.
- Optionally add Next.js ESLint plugin and specify React version in ESLint settings to quiet warnings.



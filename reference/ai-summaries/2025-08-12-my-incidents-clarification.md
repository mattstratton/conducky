## My Incidents page clarification (Issue #408)

- Updated `frontend/pages/events/[eventSlug]/my-incidents.tsx` to clearly state that "My Incidents" shows incidents submitted by the current user for the selected event.
- If the user has responder/admin roles, the page now links to `Event Incidents` for a full list (where assignment filtering is available).
- No backend changes required: the page already passes `userId` to filter by `reporterId`.
- All backend and frontend tests pass locally (`npm run test:all`).

Branch: `fix/408-my-incidents-includes-assigned-and-reported` (contains UI copy clarification only).



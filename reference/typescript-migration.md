# TypeScript Migration Checklist (Frontend)

  

This document tracks the migration of the frontend from JavaScript to TypeScript.

  

## Migration Steps

  

- [X] Install TypeScript and type definitions for React/Node

- [X] Add a `tsconfig.json` to the frontend directory

- [X] Pick a simple component (e.g., `Button`) and migrate it to `.tsx` with typed props

- [X] Update all imports of the migrated component (Button, Card, Input, Table, Avatar)

- [ ] Verify build and lint pass

- [ ] Document best practices for TypeScript in `/website/docs/developer-docs/frontend-typescript.md`

- [ ] Incrementally migrate other components/pages

  

## Component Migration Progress

  

- [X] Button

- [X] Card ([#140](https://github.com/mattstratton/conducky/issues/140))

- [X] Input ([#141](https://github.com/mattstratton/conducky/issues/141))

- [X] Table ([#142](https://github.com/mattstratton/conducky/issues/142))

- [X] Avatar ([#143](https://github.com/mattstratton/conducky/issues/143))

- [X] CoCTeamList ([#144](https://github.com/mattstratton/conducky/issues/144))

- [X] UserRegistrationForm ([#145](https://github.com/mattstratton/conducky/issues/145))

- [X] ReportForm ([#146](https://github.com/mattstratton/conducky/issues/146))

- [X] ReportDetailView ([#147](https://github.com/mattstratton/conducky/issues/147))

- [ ] All pages in `pages/` ([#148](https://github.com/mattstratton/conducky/issues/148))

  

Add more components/pages as needed. Check off each as it is migrated.

  

## Pages Migration Progress

  

- [ ] pages/_app.js

- [ ] pages/index.js

- [ ] pages/profile.js

- [ ] pages/admin.js

- [ ] pages/login.js

- [ ] pages/login.test.js

- [ ] pages/profile.test.js

- [ ] pages/invite/[code].js

- [ ] pages/event/[event-slug].js

- [ ] pages/event/[event-slug]/admin.js

- [ ] pages/event/[event-slug]/code-of-conduct.js

- [ ] pages/event/[event-slug]/user/index.js

- [ ] pages/event/[event-slug]/user/[user-id]/index.js

- [ ] pages/event/[event-slug]/report/[id].js

- [ ] pages/event/[event-slug]/report/index.js

- [ ] pages/event/[event-slug]/admin/reports.js

- [ ] pages/event/[event-slug]/admin/reports/user/[user-id].js

  

## Export Style Decision

  

- For the initial migration, we are keeping **default exports** for components (e.g., `export default Button;`) to minimize disruption and avoid breaking existing imports and the barrel file (`components/index.js`).

- **After the migration is complete**, we will:

- Switch all components to **named exports** (e.g., `export const Button = ...`)

- Update the barrel file to use `export * from './Button';` style re-exports

- Update all imports throughout the codebase to use named imports (e.g., `import { Button } from '../components'`)

  

This staged approach allows for a smooth migration with minimal breakage, followed by a modernization pass for best TypeScript practices.
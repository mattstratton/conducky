# Shadcn UI Migration & UI Improvement Checklist

## Background & Goals

We are migrating the frontend UI to use [Shadcn UI](https://ui.shadcn.com/) components for consistency, accessibility, and modern best practices. This will:
- Improve accessibility and UX
- Ensure consistent theming (including dark mode)
- Reduce custom UI code
- Leverage Tailwind and Radix primitives

**Current State:**
- Shadcn UI is installed and configured
- Button component POC is done (not yet used everywhere)
- Most UI is still using custom or legacy components

## Migration Plan & Checklist

### 0. CLI-First Approach ✅
- [x] Use `npx shadcn@latest add [component]` instead of copy/paste
- [x] Re-add existing components via CLI to ensure they're standard
- [x] Use `--overwrite` flag to update existing components
- [x] Use `npx shadcn@latest diff` to check for updates
- [x] Added core components: sheet, input, label, textarea, select, avatar, badge, tabs, toast
- [x] Added form component via CLI and updated UserRegistrationForm and ReportForm to use proper Shadcn Form pattern
- [x] Update ReportDetailView subcomponents to use proper Shadcn Form pattern

### 1. Card Component
- [x] Replace custom `Card` with Shadcn's Card component everywhere
- [x] Refactor usages for new API/styling
- [x] Remove old Card component if fully migrated

### 2. Dialogs/Modals
- [x] Identify all custom modals/dialogs (e.g., EventMetaEditor, EventMetaCard)
  - [x] Migrate Code of Conduct modal in EventMetaEditor to Shadcn Sheet for in-context viewing
  - [x] Migrate Code of Conduct modal in EventMetaCard to Shadcn Sheet for in-context viewing
  - [x] Add copy-link and open-link buttons in the Sheet to reference the dedicated page
  - [x] Create a dedicated public page for Code of Conduct at `/event/[slug]/code-of-conduct` (no auth required)
  - [x] Fix import issue in Code of Conduct page (Card component import)
  - [x] Improve Sheet UX: slide from right instead of left, add built-in close button
  - [ ] [Add more as discovered]
- [ ] Replace with Shadcn Dialog/AlertDialog where appropriate
- [ ] Use AlertDialog for destructive actions (deletes, confirmations)

### 3. Navigation
- [x] Migrate event-level navigation (EventNavBar) to Shadcn
  - [x] Mobile: Sheet
  - [x] Desktop: NavigationMenu
  - [x] Automated and manual tests complete
  - [x] Documentation updated
- [ ] Refactor navigation (EventNavBar, etc.) to use Shadcn NavigationMenu/Tabs
- [ ] Ensure mobile and desktop nav are accessible and consistent
- [x] Migrate mobile navigation to Shadcn Sheet (Header uses Sheet for mobile menu, replacing custom drawer)

### 4. UI Primitives (Button, Input, Avatar, etc.)
- [ ] Replace all custom primitives with Shadcn versions
- [x] Ensure Shadcn button is used everywhere
- [x] Ensure Shadcn Avatar is used everywhere
- [x] Ensure Shadcn Badge is used everywhere

### 5. Dark Mode
- [x] Remove custom theme logic (localStorage, etc.)
- [x] Implement Shadcn's dark mode approach ([docs](https://ui.shadcn.com/docs/dark-mode/next))

### 6. Alerts, Toasts, Feedback
- [ ] Use Shadcn Alert and Toast for user feedback, errors, confirmations

### 7. Forms ✅
- [x] Refactor forms to use Shadcn Form, Input, and related components
- [x] Ensure accessibility and validation feedback
- [x] All form-related automated tests updated and passing
- [x] Updated UserRegistrationForm and ReportForm to use proper `<Form {...form}>` pattern
- [x] Fixed ReportDetailView subcomponents (TitleEditForm, AssignmentSection, ReportStateSelector)
- [x] All 40 tests passing

### 8. Spacing, Layout, Responsiveness
- [ ] Use Shadcn/Tailwind spacing and container utilities
- [ ] Ensure all components are mobile-first and responsive

### 9. Accessibility
- [ ] Leverage Shadcn's accessible components (focus, ARIA, keyboard nav)

### 10. Testing & Documentation
- [x] Update/add automated tests for all refactored components (forms, report detail view)
- [ ] Document manual test steps for UI/UX flows
- [x] Update `/website/docs/developer-docs/testing.md` and add a migration guide

### 11. ReportForm
- [x] Migrate ReportForm to Shadcn Form (with react-hook-form)
  - [x] All fields use Shadcn primitives
  - [x] Validation and error messages use FormMessage
  - [x] Automated tests updated and passing
  - [x] Documentation updated

---

**Notes:**
- Track progress in this file. Each checklist item should have an associated GitHub issue.
- Reference `/reference/plan.md` for overall project plan.
- Use Docker Compose for local dev/testing as needed.
- Prioritize Card migration as the first step. 
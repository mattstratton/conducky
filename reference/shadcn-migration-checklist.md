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

### 1. Card Component
- [x] Replace custom `Card` with Shadcn's Card component everywhere
- [x] Refactor usages for new API/styling
- [x] Remove old Card component if fully migrated

### 2. Dialogs/Modals
- [ ] Identify all custom modals/dialogs (e.g., EventMetaEditor)
- [ ] Replace with Shadcn Dialog/AlertDialog
- [ ] Use AlertDialog for destructive actions (deletes, confirmations)

### 3. Navigation
- [ ] Refactor navigation (EventNavBar, etc.) to use Shadcn NavigationMenu/Tabs
- [ ] Ensure mobile and desktop nav are accessible and consistent
- [x] Migrate mobile navigation to Shadcn Sheet (Header uses Sheet for mobile menu, replacing custom drawer)

### 4. UI Primitives (Button, Input, Avatar, etc.)
- [ ] Replace all custom primitives with Shadcn versions
- [ ] Ensure Button POC is used everywhere

### 5. Dark Mode
- [x] Remove custom theme logic (localStorage, etc.)
- [x] Implement Shadcn's dark mode approach ([docs](https://ui.shadcn.com/docs/dark-mode/next))

### 6. Alerts, Toasts, Feedback
- [ ] Use Shadcn Alert and Toast for user feedback, errors, confirmations

### 7. Forms
- [ ] Refactor forms to use Shadcn Form, Input, and related components
- [ ] Ensure accessibility and validation feedback

### 8. Spacing, Layout, Responsiveness
- [ ] Use Shadcn/Tailwind spacing and container utilities
- [ ] Ensure all components are mobile-first and responsive

### 9. Accessibility
- [ ] Leverage Shadcn's accessible components (focus, ARIA, keyboard nav)

### 10. Testing & Documentation
- [ ] Update/add automated tests for all refactored components
- [ ] Document manual test steps for UI/UX flows
- [ ] Update `/website/docs/developer-docs/testing.md` and add a migration guide

---

**Notes:**
- Track progress in this file. Each checklist item should have an associated GitHub issue.
- Reference `/reference/plan.md` for overall project plan.
- Use Docker Compose for local dev/testing as needed.
- Prioritize Card migration as the first step. 
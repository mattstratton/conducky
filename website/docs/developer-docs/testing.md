---
sidebar_position: 5
---
# Testing Guide

This guide explains how to set up, run, and write automated tests for the backend and frontend of this project.

---

## Running Tests with Docker Compose

You can run backend and frontend tests inside their respective Docker containers using Docker Compose. This ensures your tests run in the same environment as production and CI.

### Run Backend Tests in Docker Compose

```sh
docker compose run --rm backend npm test
```

### Run Backend Tests with Coverage in Docker Compose

```sh
docker compose run --rm backend npm run test:coverage
```

### Run Frontend Tests in Docker Compose

```sh
docker compose run --rm frontend npm test
```

### Run Frontend Tests with Coverage in Docker Compose

```sh
docker compose run --rm frontend npm run test:coverage
```

> **Tip:** Use Docker Compose for testing when you want to ensure consistency with CI/CD or when you don't want to install Node/npm locally.

---

## Continuous Integration (CI) with GitHub Actions

All pull requests and pushes to the `main` branch automatically run backend and frontend tests using GitHub Actions.

- Both backend and frontend tests (including coverage) are run in parallel jobs.
- If any test fails, the workflow fails and the PR will be blocked from merging.
- Coverage reports are uploaded as workflow artifacts and can be downloaded from the "Actions" tab in the GitHub UI for each run.
- See `.github/workflows/test.yml` for the workflow definition.

---

## Running All Tests Together

To run both backend and frontend tests in one command, use the root-level script:

```sh
npm run test:all
```

This will run all backend tests, then all frontend tests, and report the results.

---

## Frontend Testing Structure (Hybrid Approach)

- **Unit/component tests:** Colocate test files next to the components or pages they test (e.g., `components/Button.test.js`, `pages/login.test.js`).
- **Integration/higher-level tests:** Place in the central `frontend/__tests__/` directory.
- This hybrid approach provides both context and organization. When in doubt, colocate simple tests; use `__tests__` for flows that span multiple components/pages.

---

## Running Frontend Tests

### Prerequisites

- Node.js and npm installed on your machine
- All frontend dependencies installed (`npm install` in the `frontend/` directory)

### Run All Tests

```sh
npm test
```

### Run Tests with Coverage Report

```sh
npm run test:coverage
```

- Coverage results will be shown in the terminal and a summary will be written to the `coverage/` directory.

### Run Tests in Docker Compose

If you prefer to run tests inside the frontend container:

```sh
docker compose run frontend npm test
```

---

## Writing New Frontend Tests

- **Colocate unit/component tests** with the component/page (e.g., `components/Foo.test.js`)
- **Place integration tests** in `frontend/__tests__/`
- Use [Jest](https://jestjs.io/) and [React Testing Library](https://testing-library.com/docs/react-testing-library/intro/)

### Example: Component Test

See `frontend/components/Button.test.js` for a sample test of a button component.

### Example: Page Test

See `frontend/pages/login.test.js` for a sample test of a Next.js page.

---

## Interpreting Coverage Reports (Frontend)

- After running `npm run test:coverage`, a summary will be shown in the terminal.
- Detailed HTML reports are available in the `frontend/coverage/` directory. Open `index.html` in your browser to explore coverage by file and line.
- Aim for high coverage, but prioritize meaningful tests over 100% coverage.

---

## Troubleshooting (Frontend)

- If you see errors about JSX or React syntax, ensure Babel and Jest are configured as shown in this repo.
- If you see errors about Next.js hooks (e.g., `useRouter`), mock them in your tests.
- If tests fail due to missing label associations, ensure your form fields use `htmlFor` and `id` attributes.

---

For questions or improvements, see the project README or contact the maintainers.

---

## Running Backend Tests

### Prerequisites

- Node.js and npm installed on your machine
- All backend dependencies installed (`npm install` in the `backend/` directory)

### Run All Tests

```sh
npm test
```

### Run Tests with Coverage Report

```sh
npm run test:coverage
```

- Coverage results will be shown in the terminal and a summary will be written to the `coverage/` directory.

### Run Tests in Docker Compose

If you prefer to run tests inside the backend container:

```sh
docker compose run backend npm test
```

---

## Writing New Backend Tests

- **Unit tests** go in `backend/tests/unit/`
- **Integration tests** go in `backend/tests/integration/`
- Use [Jest](https://jestjs.io/) for all backend tests
- Use [supertest](https://github.com/ladjs/supertest) for HTTP endpoint tests

### Example: Unit Test

See `backend/tests/unit/rbac.test.js` for a sample unit test of middleware logic.

### Example: Integration Test

See `backend/tests/integration/audit-test.test.js` for a sample integration test of an API endpoint.

> **Note:** Integration tests currently mock database dependencies for fast feedback. In the future, we plan to set up full stack integration tests with a test database and seeded data for true end-to-end coverage.

---

## Interpreting Coverage Reports

- After running `npm run test:coverage`, a summary will be shown in the terminal.
- Detailed HTML reports are available in the `backend/coverage/` directory. Open `index.html` in your browser to explore coverage by file and line.
- Aim for high coverage, but prioritize meaningful tests over 100% coverage.

---

## Troubleshooting

- If you see errors about missing Prisma binaries, ensure your `schema.prisma` includes the correct `binaryTargets` and run `npx prisma generate`.
- If tests fail due to missing database records, check if the test mocks DB dependencies or if a test database is needed.

---

For questions or improvements, see the project README or contact the maintainers.

---

## Recent Test Additions (June 2024)

### Automated Tests

- **Frontend:**
  - Evidence file download link uses the correct backend API URL.
  - Reporter can see and use the evidence upload form.
- **Backend:**
  - Access control for report detail endpoint: only the reporter, event responders, or event admins can access a report; others receive 403 Forbidden.
  - Evidence upload, listing, and download endpoints are covered for all allowed roles.

### Manual Testing Instructions

- Log in as a reporter, responder, admin, and an unrelated user. Attempt to view a report detail page:
  - Reporter, responder, and admin should see the report.
  - Unauthorized users should see a clear error message.
  - Unauthenticated users should be prompted to log in.
- Try uploading evidence as each allowed role and verify the file appears in the evidence list.
- Click an evidence file link to confirm it downloads or opens as expected.

## Testing Reports

### Report Title

- **Automated tests:**
  - Backend integration tests cover:
    - Report creation requires a title (10–70 chars).
    - Editing the title (PATCH endpoint) with permissions and validation.
    - Title is present in all report API responses.
  - Frontend tests cover:
    - Report form requires and validates the title.
    - Title is shown in all report lists and is the clickable link.
    - Title editing in the detail view (authorized users only).

- **Manual testing:**
  1. Submit a new report; verify the title is required and validated.
  2. View report lists; verify the title is shown and is a clickable link.
  3. Open a report detail page; verify the title is displayed.
  4. As the reporter or admin, edit the title; verify validation and update.
  5. As a responder or unauthorized user, verify you cannot edit the title.

## Testing Dark Mode (Shadcn Implementation)

Dark mode is now managed using [Shadcn's recommended approach](https://ui.shadcn.com/docs/dark-mode/next) with the `next-themes` package.

### How to Test

1. **Toggle Dark Mode**
   - Use the dark mode toggle button in the UI (usually in the header or navigation).
   - The UI should immediately switch between light and dark themes.

2. **Persistence**
   - Refresh the page after toggling. The selected theme should persist across reloads and navigation.

3. **System Preference**
   - If the theme is set to "system", the app should follow your OS/browser color scheme.
   - Change your system's dark/light mode and verify the app updates accordingly.

4. **Manual Testing**
   - Check all major pages and components in both light and dark mode for visual issues or contrast problems.

### Troubleshooting

- If the theme does not persist, ensure localStorage is not blocked and cookies are enabled.
- If the toggle does not work, check for errors in the browser console and verify the `ThemeProvider` is correctly set up in `_app.tsx`.

## Mobile Navigation (Shadcn Sheet)

The mobile navigation menu is now implemented using the Shadcn Sheet component in the Header. To test:

### Manual Testing
1. Resize your browser to mobile width or use a mobile device.
2. Tap the hamburger menu to open the Sheet.
3. Verify that navigation links, user info, logout, and dark mode toggle are present.
4. Tap a link or the close button to close the Sheet.
5. Press `Escape` to close the Sheet.
6. Use `Tab`/`Shift+Tab` to cycle through focusable elements; focus should be trapped within the Sheet.
7. Ensure the Sheet closes when a navigation link is clicked.

### Automated Testing
- Add tests to verify that the Sheet opens and closes on trigger.
- Test that focus is trapped within the Sheet when open.
- Test that pressing `Escape` closes the Sheet.
- Test that clicking a navigation link closes the Sheet.

The Sheet replaces the previous custom mobile drawer logic. Remove or update any tests that referenced the old implementation.

## Event-Level Navigation (EventNavBar)

The event-level navigation now uses Shadcn UI components:
- **Mobile:** Uses Shadcn Sheet for the menu, matching the Header's mobile nav.
- **Desktop:** Uses Shadcn NavigationMenu for accessible, consistent navigation.

### Manual Testing
1. On desktop, verify the event nav renders as a horizontal menu with all expected links and the Submit Report button.
2. On mobile, tap the hamburger menu to open the Sheet and verify all links and actions are present.
3. Test keyboard navigation (Tab, Shift+Tab, Enter, Escape) for both desktop and mobile navs.
4. Ensure focus is trapped in the Sheet when open and returns to the trigger when closed.
5. Confirm that clicking a link in the Sheet closes the menu.

### Automated Testing
- Add tests to verify:
  - NavigationMenu renders all expected links and actions on desktop.
  - Sheet opens and closes on trigger in mobile view.
  - Focus management and accessibility for both navs.
  - Clicking a Sheet link closes the menu.

Remove or update any tests that referenced the old nav implementation.

---

# Shadcn UI Migration Guide

## Overview

We are migrating the frontend UI to use [Shadcn UI](https://ui.shadcn.com/) components for consistency, accessibility, and modern best practices. This migration aims to:
- Improve accessibility and UX
- Ensure consistent theming (including dark mode)
- Reduce custom UI code
- Leverage Tailwind and Radix primitives

See the full migration checklist in `/reference/shadcn-migration-checklist.md` and the project plan in `/reference/plan.md`.

## Migration Best Practices

- **Use the Shadcn CLI** (`npx shadcn@latest add [component]`) to add or update components. Prefer CLI over copy/paste to ensure up-to-date code and patterns.
- **Replace custom primitives** (Button, Card, Input, etc.) with Shadcn versions. Remove legacy components once fully migrated.
- **Use Shadcn Form** for all forms, with `react-hook-form` and Zod for validation. Follow the `<Form {...form}>` pattern.
- **Dialogs/Modals:** Use Shadcn Dialog or Sheet for modals. Use AlertDialog for destructive actions (deletes, confirmations).
- **Navigation:** Use Shadcn NavigationMenu for desktop and Sheet for mobile navigation. Ensure accessibility and keyboard navigation.
- **Dark Mode:** Implement using Shadcn's [Next.js dark mode guide](https://ui.shadcn.com/docs/dark-mode/next) and the `next-themes` package.
- **Accessibility:** Leverage Shadcn's accessible components (focus, ARIA, keyboard nav). Test with keyboard and screen readers.
- **Responsiveness:** Use Tailwind's mobile-first utilities. Test all components on mobile and desktop.
- **Testing:** Update or add automated and manual tests for all migrated components. See below for patterns.

## Common Migration Patterns

- **Forms:**
  - Use `<Form {...form}>` and Shadcn Input, Textarea, Select, etc.
  - Use Zod for schema validation and show errors with `<FormMessage />`.
  - Example: See `UserRegistrationForm` and `ReportForm`.
- **Editable Fields:**
  - Use an edit icon (pencil) to toggle edit mode.
  - Show the edit UI only when the icon is clicked.
  - Example: See `TitleEditForm` and assignment fields in `ReportDetailView`.
- **Sheets/Dialogs:**
  - Use Sheet for in-context side panels (e.g., Code of Conduct viewer).
  - Use Dialog/AlertDialog for modal interactions and confirmations.
- **Navigation:**
  - Use NavigationMenu for desktop, Sheet for mobile.
  - Ensure focus is trapped and accessible.
- **Dark Mode:**
  - Use the `ThemeProvider` and follow Shadcn docs for persistence and system preference.

## Automated Testing Patterns for Shadcn Components

- Use [React Testing Library](https://testing-library.com/docs/react-testing-library/intro/) for all component and integration tests.
- **Forms:**
  - Test field rendering, validation, error messages, and submission.
  - Example:
    ```ts
    import { render, screen, fireEvent } from '@testing-library/react';
    import UserRegistrationForm from '../components/UserRegistrationForm';

    test('shows validation error for empty email', async () => {
      render(<UserRegistrationForm />);
      fireEvent.click(screen.getByRole('button', { name: /register/i }));
      expect(await screen.findByText(/email is required/i)).toBeInTheDocument();
    });
    ```
- **Sheets/Dialogs:**
  - Test open/close behavior, focus management, and accessibility.
  - Example:
    ```ts
    import { render, screen } from '@testing-library/react';
    import userEvent from '@testing-library/user-event';
    import CodeOfConductSheet from '../components/CodeOfConductSheet';

    test('opens and closes the sheet', async () => {
      render(<CodeOfConductSheet />);
      userEvent.click(screen.getByRole('button', { name: /view code of conduct/i }));
      expect(screen.getByText(/code of conduct/i)).toBeInTheDocument();
      userEvent.click(screen.getByRole('button', { name: /close/i }));
      expect(screen.queryByText(/code of conduct/i)).not.toBeInTheDocument();
    });
    ```
- **Navigation:**
  - Test that all links are present, navigation works, and focus is managed correctly.
- **Dark Mode:**
  - Test toggling dark mode, persistence, and system preference.

## Manual Testing Checklist

- Test all migrated components in both light and dark mode.
- Test on mobile and desktop.
- Use keyboard navigation (Tab, Shift+Tab, Enter, Escape) to verify accessibility.
- For forms, test validation, error messages, and submission flows.
- For dialogs/sheets, test open/close, focus trap, and accessibility.
- For navigation, test all links, focus management, and closing behavior.

## Reference
- Migration checklist: `/reference/shadcn-migration-checklist.md`
- Project plan: `/reference/plan.md`
- Shadcn UI docs: https://ui.shadcn.com/

For questions or improvements, see the project README or contact the maintainers.

---

## Testing New UI and Navigation Features

### Sidebar Navigation
- Test sidebar expansion/collapse (click toggle, keyboard shortcut `Cmd/Ctrl+B`).
- Verify sidebar is responsive: expands on desktop, collapses to icons on mobile.
- Check accessibility: all nav items are keyboard accessible, ARIA labels are present.
- Confirm user menu and event switcher are visible in both expanded and collapsed states.
- Automated: See `frontend/components/ui/sidebar.test.tsx` (if present) or add tests for sidebar state and navigation.

### Login Page
- Test login form UI matches Shadcn block.
- Test error states (invalid credentials, network error).
- Test redirect logic: after login, user is sent to correct page or event.
- Automated: See `frontend/pages/login.test.tsx`.

### Event Switcher (NavEvents/TeamSwitcher)
- Test event dropdown shows all user events.
- Test switching events updates context and navigation.
- Test collapsed and expanded sidebar states.
- Automated: Add tests for event switching logic and UI.

### JoinEventWidget
- Test entering valid/invalid invite codes and links.
- Test joining event updates dashboard/events list.
- Test error and success states.
- Automated: Add tests for widget logic and API calls.

### QuickStats & ActivityFeed
- Test dashboard widgets load and display correct data.
- Test loading and error states.
- Automated: Add tests for data fetching and rendering.

### Cross-Event Reports Dashboard
- Test reports load from multiple events based on user roles.
- Test filtering by status, event, assignment, and search terms.
- Test pagination controls and navigation.
- Test responsive design (table on desktop, cards on mobile).
- Test role-based access control (reporters see only their reports, responders/admins see appropriate reports).
- Test empty states when no reports match filters.
- Test error handling for API failures.
- Automated: See `backend/tests/integration/cross-event-reports.test.js` for comprehensive API testing.

## Backend Integration Tests

### Cross-Event Reports API (`/api/users/me/reports`)

The cross-event reports endpoint has comprehensive test coverage in `backend/tests/integration/cross-event-reports.test.js`:

#### Test Coverage (15 tests total)
- **Authentication**: Requires valid authentication (401 for unauthenticated requests)
- **Role-Based Access Control**: 
  - Reporters see only their own reports across all events
  - Responders see all reports in their events plus own reports in other events
  - Admins see all reports in their events plus role-appropriate reports elsewhere
- **Filtering**: 
  - Status filtering (submitted, acknowledged, investigating, resolved, closed)
  - Event filtering by specific event ID
  - Assignment filtering (assigned to me, unassigned, assigned to others)
  - Search functionality across titles, descriptions, and reporter names
- **Pagination**: 
  - Validation of page and limit parameters
  - Error handling for invalid pagination values (negative numbers, excessive limits)
  - Proper pagination response structure
- **Sorting**: 
  - Sort by title, creation date, and status
  - Ascending and descending order
- **Data Integrity**:
  - Includes complete report data with related information
  - Proper event, reporter, and assignee data population
  - Evidence file and comment counts

#### Running the Tests
```bash
# Run only cross-event reports tests
cd backend && npm test -- --testPathPattern=cross-event-reports.test.js

# Run with verbose output
cd backend && npm test -- --testPathPattern=cross-event-reports.test.js --verbose

# Run all backend tests
cd backend && npm test
```

#### Test Data Setup
The tests use a comprehensive mock data setup including:
- Multiple users with different roles across events
- Multiple events with various configurations
- Sample reports with different statuses and assignments
- Proper role assignments for testing access control

#### Key Test Scenarios
1. **Basic Functionality**: Authenticated users can access the endpoint
2. **Role Isolation**: Users only see reports they have permission to access
3. **Cross-Event Access**: Users with multiple event roles see appropriate reports from each
4. **Advanced Filtering**: All filter combinations work correctly
5. **Pagination Edge Cases**: Proper validation and error handling
6. **Search Functionality**: Text search across multiple fields
7. **Data Completeness**: All required related data is included in responses

The test suite ensures the cross-event reports feature maintains proper security, performance, and functionality across all supported use cases.

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
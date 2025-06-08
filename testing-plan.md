# Testing Implementation Plan

A step-by-step checklist for implementing robust, automated testing for the project. Check off each item as you complete it.

---

## Backend (Node.js/Express/Prisma)

- [x] Add Jest and supertest as dev dependencies
- [x] Create `backend/tests/` directory
- [x] Add sample unit test for `utils/rbac.js`
- [x] Add sample integration test for `/audit-test` endpoint
  - [ ] **Note:** Currently, we mock DB dependencies for fast feedback. In the future, set up full stack integration tests with a test database and seeded data for true end-to-end coverage.
- [x] Configure Jest for coverage reporting
- [x] Add `test` and `test:coverage` scripts to `backend/package.json`
- [x] Document backend test setup and running in `/docs/testing.md`

---

## Frontend (Next.js/React)

- [x] Add Jest and React Testing Library as dev dependencies
- [x] Create `frontend/__tests__/` directory (or colocate tests with components)
- [x] Add sample test for `Button.js` component
- [x] Add sample test for `login.js` page
- [x] Configure Jest for coverage reporting
- [x] Add `test` and `test:coverage` scripts to `frontend/package.json`
- [x] Document frontend test setup and running in `/docs/testing.md`

---

## Documentation

- [ ] Create `/docs/testing.md` with:
  - [ ] How to run backend and frontend tests (with and without Docker Compose)
  - [ ] How to write new tests
  - [ ] How to interpret coverage reports
- [x] Document how to run all tests together

---

## Local Automation

- [x] Add a root-level script or package.json script to run both backend and frontend tests
- [x] Document how to run tests in Docker Compose

---

## Cursor rules

- [X] Create/update cursor rules to clarify the testing process
- [X] Create/update cursor rules to ensure that tests are created for new features
- [X] Create/update cursor rules to ensure that tests are run before determining a feature is complete

---

## CI/CD

- [x] Plan and document a GitHub Actions workflow to run all tests on PRs
- [X] Add coverage badge/reporting to README (optional)
- [X] TODO: Add Codecov badge to README after verifying Codecov integration

---

**Work through this checklist to implement a robust, automated testing framework for the project.** 

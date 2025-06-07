[![codecov](https://codecov.io/gh/mattstratton/conducky/graph/badge.svg?token=J126AJDPXH)](https://codecov.io/gh/mattstratton/conducky)

# Conducky 🦆

This project is a web application for managing Code of Conduct reports for conferences and events. It is designed for easy deployment and multi-tenancy, supporting both anonymous and authenticated report submissions.

## Local Development (Docker)

To run the full stack locally:

1. Ensure you have Docker and docker-compose installed.
2. Run:
   ```sh
   docker-compose up --build -d
   ```
3. The frontend (Next.js) and backend (Node.js) will be available on their respective ports (see docker-compose.yml).

> **Note:** Full setup, configuration, and usage documentation will be added as features are implemented.

### npm scripts

- `npm run seed` - seed the database with default roles, a test event, and test users
- `npm run sample-data` - seed the database with sample data
- `npm run studio` - open the Prisma Studio for the database
- `npm run frontend` - rebuild and start the frontend
- `npm run backend` - rebuild and start the backend
- `npm run front-and-back` - rebuild and start both the frontend and backend
- `npm run all` - rebuild and start both the frontend and backend and database containers

---

## Environment Variables & Secrets Management

Both the frontend and backend use `.env` files to manage environment variables and secrets. These files are loaded automatically by Docker Compose for local development.

- **Backend:**
  - `backend/.env` (example):
    ```env
    PORT=4000
    DATABASE_URL=postgres://postgres:postgres@db:5432/conducky
    JWT_SECRET=changeme
    ```
- **Frontend:**
  - `frontend/.env` (example):
    ```env
    NEXT_PUBLIC_API_URL=http://localhost:4000
    ```

### Overriding Variables
- For local development, edit the `.env` files directly.
- For production, set environment variables in your hosting provider or CI/CD pipeline as needed.
- **Do not commit secrets to version control.**

---

## Backend: Prisma & Database

- **After starting or rebuilding the backend container, you must generate the Prisma client inside the container before using the backend:**
  ```sh
  docker-compose exec backend npx prisma generate
  ```
- **To run the seed script (populate default roles, a test event, and test users), run:**
  ```sh
  docker-compose exec backend npm run seed
  ```
- If you encounter errors about missing Prisma client, re-run the generate command above inside the backend container.

- **Note:** The Prisma client is not generated automatically during Docker build. You must always run the generate command after starting the stack.

- **Audit Logging:**
  - Use the `logAudit` helper in `backend/utils/audit.js` to log actions to the `AuditLog` table.
  - Example usage:
    ```js
    await logAudit({
      eventId: 'event-id',
      userId: 'user-id',
      action: 'action_name',
      targetType: 'EntityType',
      targetId: 'entity-id',
    });
    ```
  - See the `/audit-test` endpoint in `index.js` for a working example.

## RBAC Middleware

- Use the `requireRole` middleware from `backend/utils/rbac.js` to protect routes based on user roles for a given event.
- Example usage:
  ```js
  // Only allow Admins for the event
  app.get('/admin-only', requireRole(['Admin']), (req, res) => {
    res.json({ message: 'You are an admin for this event!' });
  });
  ```
- The middleware expects `eventId` to be provided as a query param, body, or route param.
  - Example: `GET /admin-only?eventId=YOUR_EVENT_ID`
- Returns 401 if not authenticated, 400 if eventId is missing, and 403 if the user does not have the required role.

**What the seed script loads:**

- **Roles:**
  - Reporter
  - Responder
  - Admin
  - SuperAdmin
- **Event:**
  - Name: `Test Event`
  - Slug: `test-event`
- **Users:**
  - **Event Admin**
    - Email: `admin@test.com`
    - Password: `adminpass`
    - Assigned the `Admin` role for the test event
  - **SuperAdmin**
    - Email: `superadmin@test.com`
    - Password: `superpass`
    - Assigned the `SuperAdmin` role for the test event (for demo purposes)

You can use these credentials to log in and test the application immediately after seeding.

 

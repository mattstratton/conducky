[![codecov](https://codecov.io/gh/mattstratton/conducky/graph/badge.svg?token=J126AJDPXH)](https://codecov.io/gh/mattstratton/conducky) [![codebeat badge](https://codebeat.co/badges/bb45abf8-51e4-488c-9f08-679d53c5cb10)](https://codebeat.co/projects/github-com-mattstratton-conducky-main) [![Quality Gate Status](https://sonarcloud.io/api/project_badges/measure?project=mattstratton_conducky&metric=alert_status)](https://sonarcloud.io/summary/new_code?id=mattstratton_conducky) [![Documentation Status](https://readthedocs.org/projects/conducky/badge/?version=latest)](https://conducky.readthedocs.io/en/latest/?badge=latest)

[![Deploy on Railway](https://railway.com/button.svg)](https://railway.com/deploy/K6IPeL?referralCode=CkMW6h)

# Conducky 🦆

![conducky logo](/images/conducky-logo-smaller.png)

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
    SESSION_SECRET=changeme
    FRONTEND_BASE_URL=http://localhost:3001
    BACKEND_BASE_URL=http://localhost:4000
    CORS_ORIGIN=http://localhost:3001
    # Email Configuration
    EMAIL_PROVIDER=console
    EMAIL_FROM=noreply@conducky.local
    EMAIL_REPLY_TO=

    # SMTP Configuration (if EMAIL_PROVIDER=smtp)
    SMTP_HOST=
    SMTP_PORT=587
    SMTP_SECURE=false
    SMTP_USER=
    SMTP_PASS=

    # SendGrid Configuration (if EMAIL_PROVIDER=sendgrid)
    SENDGRID_API_KEY=

    # OAuth Configuration
    GOOGLE_CLIENT_ID=
    GOOGLE_CLIENT_SECRET=
    GITHUB_CLIENT_ID=
    GITHUB_CLIENT_SECRET=

    ```

- **Frontend:**
  - `frontend/.env` (example):

    ```env
    NEXT_PUBLIC_API_URL=http://localhost:4000
    BACKEND_API_URL=http://localhost:4000
    ```

### Overriding Variables

- For local development, edit the `.env` files directly.
- For production, set environment variables in your hosting provider or CI/CD pipeline as needed.
- **Do not commit secrets to version control.**

---

## Backend: Prisma & Database

  ```sh
- **To run the seed script (populate default roles, a test event, and test users), run:**
  ```sh
  docker-compose exec backend npm run seed
  ```

- If you encounter errors about missing Prisma client, re-run the generate command:

```sh
docker-compose exec backend npx prisma generate
```

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

## Releases

 We use GitHub Releases; you can do this either in the [web ui](https://docs.github.com/en/repositories/releasing-projects-on-github/managing-releases-in-a-repository) or via the [CLI](https://docs.github.com/en/repositories/releasing-projects-on-github/managing-releases-in-a-repository?tool=cli).

Please note that releases must start with a `v` and be in the format `vX.X.X`.

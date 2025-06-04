# Code of Conduct Report Management System

This project is a web application for managing Code of Conduct reports for conferences and events. It is designed for easy deployment and multi-tenancy, supporting both anonymous and authenticated report submissions.

## Local Development (Docker)

To run the full stack locally:

1. Ensure you have Docker and docker-compose installed.
2. Run:
   ```sh
   docker-compose up --build
   ```
3. The frontend (Next.js) and backend (Node.js) will be available on their respective ports (see docker-compose.yml).

> **Note:** Full setup, configuration, and usage documentation will be added as features are implemented.

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

- **After rebuilding or updating the backend container, always generate the Prisma client inside the container:**
  ```sh
  docker-compose exec backend npx prisma generate
  ```
- **To run the seed script (populate default roles, etc.), run:**
  ```sh
  docker-compose exec backend npm run seed
  ```
- If you encounter errors about missing Prisma client, re-run the generate command above inside the backend container.

 
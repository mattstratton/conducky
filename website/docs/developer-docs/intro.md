---
sidebar_position: 1
---
# Introduction

Welcome to the Conducky Developer Documentation!

This section provides technical details for contributors and developers, including:

- API reference
- Data model and architecture
- Testing and development workflows
- Guidelines for contributing to Conducky

## Getting Started

### Environment Variables (Standardized)

Conducky uses environment variables for configuration. The required variables are now standardized and only those actually used by the codebase are included in the example files.

#### Backend (`/backend`)

- `DATABASE_URL` — The Postgres connection string for the database
- `SESSION_SECRET` — Secret used for session middleware (set securely in production)
- `FRONTEND_BASE_URL` — The base URL of the deployed frontend (e.g., `http://localhost:3001`)

See `/backend/.env.example` for the template. Copy it to `/backend/.env` and fill in the values as needed.

#### Frontend (`/frontend`)

- `NEXT_PUBLIC_API_URL` — The base URL for the backend API, used for all API calls from the frontend and server-side rendering (SSR) in Next.js (e.g., `http://localhost:4000`)

See `/frontend/.env.example` for the template. Copy it to `/frontend/.env` and fill in the value as needed.

> **Note:** Only these variables are required. Any others previously present have been removed for clarity and consistency.

TODO: Add instructions for setting up a development environment, installing dependencies, and contributing to the project.

### Running Backend Tests

Backend tests automatically load environment variables from `/backend/.env.test` (if present) using `dotenv`. Edit `/backend/.env.test` to configure your local test database and secrets. This ensures tests run with the correct settings, separate from your development `.env`.

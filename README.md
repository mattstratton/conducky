[![codecov](https://codecov.io/gh/mattstratton/conducky/graph/badge.svg?token=J126AJDPXH)](https://codecov.io/gh/mattstratton/conducky) [![codebeat badge](https://codebeat.co/badges/bb45abf8-51e4-488c-9f08-679d53c5cb10)](https://codebeat.co/projects/github-com-mattstratton-conducky-main) [![Quality Gate Status](https://sonarcloud.io/api/project_badges/measure?project=mattstratton_conducky&metric=alert_status)](https://sonarcloud.io/summary/new_code?id=mattstratton_conducky) [![Documentation Status](https://readthedocs.org/projects/conducky/badge/?version=latest)](https://conducky.readthedocs.io/en/latest/?badge=latest)

[![Deploy on Railway](https://railway.com/button.svg)](https://railway.com/deploy/K6IPeL?referralCode=CkMW6h)

# Conducky 🦆

![conducky logo](/images/conducky-logo-smaller.png)

Conducky is a comprehensive **Code of Conduct incident management platform** designed specifically for conferences and events. Built with security, scalability, and ease of use in mind, it provides a complete solution for handling incident reports, managing teams, and maintaining safe environments at events.

## ✨ Key Features

- **🏢 Multi-Tenant Architecture**: Organizations can manage multiple events with centralized oversight
- **🔐 Unified Role System**: Comprehensive role-based access control with inheritance
- **📱 Mobile-First Design**: Optimized for mobile reporting and response workflows
- **🚨 Real-Time Notifications**: In-app and email notifications for incident updates
- **🔒 Enterprise Security**: AES-256-GCM encryption for sensitive data, comprehensive audit logging, and multi-layer security
- **🌐 Anonymous Reporting**: Support for both authenticated and anonymous incident submission
- **📊 Comprehensive Analytics**: Detailed reporting and analytics for organizational oversight
- **🎯 OAuth Integration**: Support for Google and GitHub social login
- **📧 Flexible Email**: SMTP, SendGrid, or console-based email delivery

## 🏗️ Architecture

- **Frontend**: Next.js 15, React, TypeScript, Tailwind CSS, Shadcn/ui
- **Backend**: Node.js, Express, TypeScript, Prisma ORM
- **Database**: PostgreSQL with comprehensive indexing and performance optimization
- **Authentication**: Passport.js with social login support
- **Security**: AES-256-GCM field-level encryption, rate limiting, comprehensive audit logging, RBAC

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

### Database-Stored Configuration

**OAuth credentials are managed through the admin UI** and stored securely in the database with field-level encryption. **Email is configured with environment variables** (`EMAIL_PROVIDER`, `SMTP_*`, `SENDGRID_API_KEY`, `EMAIL_FROM`). Email is strongly recommended: without it, new signups are not verified. See the [System Configuration Guide](website/docs/admin-guide/system-configuration.md#email-configuration) for details.

- **Backend:**
  - `backend/.env` (example):

    ```env
    PORT=4000
    DATABASE_URL=postgres://postgres:postgres@db:5432/conducky
    SESSION_SECRET=changeme
    FRONTEND_BASE_URL=http://localhost:3001
    BACKEND_BASE_URL=http://localhost:4000
    CORS_ORIGIN=http://localhost:3001
    
    # Encryption key for database field-level encryption
    # REQUIRED: Must be at least 32 characters long
    # Used to encrypt: incident data, comments, contact emails, OAuth credentials, SMTP passwords
    # Generate with: openssl rand -base64 48
    # WARNING: Use a unique, secure key for each environment
    ENCRYPTION_KEY=conducky-dev-encryption-key-change-in-production
    ```

- **Frontend:**
  - `frontend/.env` (example):

    ```env
    NEXT_PUBLIC_API_URL=http://localhost:4000
    BACKEND_API_URL=http://localhost:4000
    ```

### Configuration Management

- **System Settings**: OAuth configuration is managed through **Admin → System Settings** in the web UI
- **Environment Variables**: Core application settings (database, session, URLs) and email (`EMAIL_PROVIDER` and related variables) use environment variables
- **Security**: All sensitive configuration data is encrypted before database storage

### Overriding Variables

- For local development, edit the `.env` files directly.
- For production, set environment variables in your hosting provider or CI/CD pipeline as needed.
- **Do not commit secrets to version control.**

---

## 🔒 Security & Data Protection

Conducky implements enterprise-grade security to protect sensitive incident data:

### Database Encryption

**All sensitive data is automatically encrypted** using AES-256-GCM encryption:
- **Incident descriptions, parties, and locations**
- **All incident comments**
- **Event contact emails**
- **OAuth credentials and SMTP passwords**

### Security Features

- **🔐 Multi-layer encryption** with unique salts per operation
- **🛡️ Role-based access control (RBAC)** with permission inheritance
- **📋 Comprehensive audit logging** for all administrative actions
- **🚫 Rate limiting** on authentication and sensitive endpoints
- **🔒 Secure sessions** with HTTP-only cookies
- **🌐 HTTPS/TLS** encryption for all communications

### Configuration Requirements

**ENCRYPTION_KEY Environment Variable:**
```bash
# Generate a secure encryption key (REQUIRED)
openssl rand -base64 48

# Set in production environment
ENCRYPTION_KEY=your-generated-encryption-key-here
```

**Key Management:**
- **Minimum 32 characters** (recommended 64+)
- **Unique per environment** (dev/staging/production)
- **Rotate periodically** for enhanced security
- **Store securely** - use encrypted key management systems or secure vaults

For detailed security configuration, see the [Admin Security Guide](website/docs/admin-guide/security-overview.md).

---

## Backend: Prisma & Database

  ```sh
- **Essential seeding (automatically run on startup):**
  ```sh
  # Roles and logging settings are seeded automatically during container startup
  # Manual commands if needed:
  docker-compose exec backend npm run seed:roles    # Essential user roles
  docker-compose exec backend npm run seed:logging  # Default logging settings
  ```

- **Development seeding (optional, development only):** these create test accounts with the passwords below (one is a System Admin) and refuse to run when `NODE_ENV=production`. Never run them on a real deployment.
  ```sh
  docker-compose exec backend npm run seed          # Includes roles, logging, and test data
  docker-compose exec backend npm run sample-data   # Additional sample organizations and incidents
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

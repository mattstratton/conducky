# Contributing to Conducky

Thank you for your interest in contributing to Conducky! This document provides guidelines and information for contributors.

## Table of Contents

- [Code of Conduct](#code-of-conduct)
- [Getting Started](#getting-started)
- [Development Environment](#development-environment)
- [Architecture Overview](#architecture-overview)
- [Contributing Workflow](#contributing-workflow)
- [Testing Requirements](#testing-requirements)
- [Code Style and Standards](#code-style-and-standards)
- [Security Considerations](#security-considerations)
- [Documentation Guidelines](#documentation-guidelines)
- [Submitting Changes](#submitting-changes)

## Code of Conduct

Conducky is a safety-critical application designed to help manage code of conduct incidents. We expect all contributors to maintain the highest standards of respectful and professional conduct. Please review our [Code of Conduct](CODE_OF_CONDUCT.md) before contributing.

## Getting Started

### Prerequisites

- **Docker & Docker Compose**: Required for local development environment
- **Node.js 24+**: For running scripts outside Docker (optional)
- **Git**: For version control
- **A code editor**: We recommend VS Code with TypeScript extensions

### Setting Up Development Environment

1. **Clone the repository**:
   ```bash
   git clone https://github.com/mattstratton/conducky.git
   cd conducky
   ```

2. **Start the development environment**:
   ```bash
   docker-compose up --build -d
   ```

3. **Initialize the database**:
   ```bash
   # Seed with default roles and test users
   npm run seed
   
   # Optional: Add sample data for development
   npm run sample-data
   ```

4. **Access the applications**:
   - Frontend: http://localhost:3001
   - Backend API: http://localhost:4000
   - Prisma Studio: `npm run studio` (database GUI)

### Test Credentials

After seeding, you can use these test accounts:

- **System Admin**: `superadmin@test.com` / `superpass`
- **Event Admin**: `admin@test.com` / `adminpass`

## Development Environment

Conducky uses Docker Compose for a consistent development environment across all platforms. All development should be done within the containerized environment.

### Available Scripts

From the project root:

- `npm run seed` - Initialize database with default roles and test data
- `npm run sample-data` - Add sample incidents and data for testing
- `npm run studio` - Open Prisma Studio for database management
- `npm run frontend` - Rebuild and start frontend container
- `npm run backend` - Rebuild and start backend container
- `npm run front-and-back` - Rebuild and start both frontend and backend
- `npm run all` - Rebuild and start all containers
- `npm run test:all` - Run all tests (backend, frontend, and integration)

### Environment Configuration

Both frontend and backend use `.env` files for configuration:

- **Backend** (`.env`): Database connections, session secrets, API keys
- **Frontend** (`.env.local`): API URLs, public configuration

**Important**: Never commit secrets or production credentials to version control.

## Architecture Overview

### Core Technologies

- **Frontend**: Next.js 15, React, TypeScript, Tailwind CSS, Shadcn/ui
- **Backend**: Node.js, Express, TypeScript, Prisma ORM
- **Database**: PostgreSQL
- **Authentication**: Passport.js with social login support
- **Testing**: Jest, React Testing Library, Supertest

### Project Structure

```
conducky/
├── frontend/           # Next.js application
│   ├── components/     # React components
│   ├── pages/         # Next.js pages and API routes
│   ├── lib/           # Utilities and helpers
│   └── types/         # TypeScript type definitions
├── backend/           # Express API server
│   ├── src/           # Source code
│   │   ├── routes/    # API route handlers
│   │   ├── services/  # Business logic services
│   │   ├── middleware/# Express middleware
│   │   └── utils/     # Utility functions
│   ├── prisma/        # Database schema and migrations
│   └── tests/         # Test files
├── website/           # Docusaurus documentation site
└── docs/archive/      # Historical planning notes (not source of truth)
```

### Key Architectural Principles

1. **Mobile-First Design**: All interfaces are optimized for mobile incident reporting
2. **Multi-Tenancy**: Event data is strictly isolated using organization and event scoping
3. **Unified RBAC**: Role-based access control across system, organization, and event levels
4. **Security-First**: Field-level encryption, rate limiting, and comprehensive audit logging
5. **Type Safety**: TypeScript is used throughout with strict mode enabled

## Contributing Workflow

We follow a standard GitHub workflow with specific requirements for this safety-critical application.

### 1. Create a Feature Branch

Always start from the latest `main` branch:

```bash
git checkout main
git pull origin main
git checkout -b feature/your-feature-description
```

Use descriptive branch names:
- `feature/unified-rbac-ui` - for new features
- `fix/incident-comment-xss` - for bug fixes
- `docs/rbac-permissions-guide` - for documentation

### 2. Development Guidelines

- **Follow existing patterns**: Maintain consistency with established code patterns
- **Write tests first**: All new features require comprehensive tests
- **Security focus**: Always consider security implications of changes
- **Mobile-first**: Design and test mobile interfaces first
- **Accessibility**: Ensure all UI changes meet accessibility standards

### 3. Commit Standards

Use clear, descriptive commit messages:

```bash
git commit -m "feat: add organization admin role inheritance

- Implement role inheritance from org admin to event admin
- Add middleware to check inherited permissions
- Update RBAC service with org-level permission checks
- Add comprehensive tests for role inheritance scenarios

Fixes #123"
```

## Testing Requirements

**All contributions must include appropriate tests and pass existing tests.**

### Testing Strategy

1. **Backend Tests**:
   ```bash
   docker-compose exec backend npm test
   docker-compose exec backend npm run test:coverage
   ```

2. **Frontend Tests**:
   ```bash
   docker-compose exec frontend npm test
   docker-compose exec frontend npm run test:coverage
   ```

3. **Integration Tests**:
   ```bash
   npm run test:all
   ```

### Test Requirements

- **New Features**: Must include unit tests and integration tests
- **Bug Fixes**: Must include regression tests
- **API Endpoints**: All new endpoints require comprehensive API tests
- **Security Features**: Security-related changes require specific security tests
- **UI Components**: Frontend components need React Testing Library tests

### Test Categories

- **Unit Tests**: Test individual functions and components
- **Integration Tests**: Test API endpoints and database interactions
- **Security Tests**: Test authentication, authorization, and input validation
- **Accessibility Tests**: Verify WCAG compliance
- **Performance Tests**: Ensure response times and load handling

## Code Style and Standards

### TypeScript Guidelines

- **Strict Mode**: Always use TypeScript with strict mode enabled
- **Type Safety**: Avoid `any` type; use proper interfaces and types
- **Naming**: Use descriptive names that explain purpose and context
- **Documentation**: Add JSDoc comments for complex functions and public APIs

### React/Next.js Patterns

- **Functional Components**: Use functional components with hooks
- **Custom Hooks**: Extract complex state logic into custom hooks
- **Component Organization**: Group related components and maintain clear hierarchies
- **Error Boundaries**: Implement error boundaries for user-facing error handling

### Backend Patterns

- **Service Layer**: Keep business logic in service classes
- **Middleware**: Use middleware for cross-cutting concerns (auth, logging, validation)
- **Error Handling**: Implement consistent error handling across all endpoints
- **Database Access**: Use Prisma ORM with proper query optimization

### CSS/Styling Rules

- **Tailwind CSS**: Use Tailwind classes exclusively
- **Shadcn/ui**: Use Shadcn/ui components before creating custom components
- **Mobile-First**: Write mobile styles first, then enhance for larger screens
- **Accessibility**: Ensure proper contrast ratios and focus indicators

## Security Considerations

Conducky handles sensitive incident data and requires the highest security standards.

### Security Requirements

1. **Input Validation**: All user input must be validated and sanitized
2. **Authentication**: Verify user authentication for all protected endpoints
3. **Authorization**: Implement proper role-based access control
4. **Data Isolation**: Ensure event data cannot leak between organizations
5. **Audit Logging**: Log all security-relevant actions
6. **Rate Limiting**: Implement rate limiting on sensitive endpoints

### Security Review Process

- All security-related changes require additional review
- XSS prevention is critical for comment and report systems
- Database queries must be parameterized to prevent SQL injection
- File uploads require proper validation and scanning
- Session management must follow security best practices

### Reporting Security Issues

If you discover a security vulnerability, please report it privately:
1. **Do not create a public issue**
2. **Email the maintainers directly** with details
3. **Provide steps to reproduce** if possible
4. **Allow time for fix** before public disclosure

## Documentation Guidelines

Documentation is crucial for this project's success and safety.

### Documentation Types

1. **User Documentation** (`website/docs/user-guide/`): End-user guides and tutorials
2. **Admin Documentation** (`website/docs/admin-guide/`): Administrative procedures
3. **Developer Documentation** (`website/docs/developer-docs/`): Technical implementation details
4. **API Documentation**: Auto-generated from OpenAPI specifications

### Documentation Standards

- **Accuracy**: Documentation must reflect current implementation
- **Completeness**: Cover all features and edge cases
- **Clarity**: Write for your target audience (users, admins, developers)
- **Examples**: Include practical examples and use cases
- **Updates**: Update documentation when making code changes

### Bot Footer Policy

**The bot footer "🤖 This was generated by a bot. If you have questions, please contact the maintainers." should ONLY be used in:**

- GitHub issue reports
- GitHub issue comments
- GitHub pull request descriptions and comments
- GitHub discussion posts

**DO NOT include bot footers in:**

- Documentation files (`.md`, `.mdx` files in `/website/docs/`)
- README files
- Code comments or JSDoc
- Configuration files
- Any files that are part of the actual project documentation

The bot footer is meant to identify AI-generated content in GitHub interactions, not in the project's permanent documentation. All documentation should appear as official project content without attribution footers.

### JSDoc Requirements

Add JSDoc comments for:

- All public API functions
- Complex business logic
- Security-sensitive functions
- Database service methods

Example:

```typescript
/**
 * Checks if user has event-level permissions with organization inheritance
 * @param userId - The user ID to check permissions for
 * @param eventId - The event ID to check permissions against
 * @param requiredRoles - Array of roles that satisfy the permission check
 * @returns Promise<boolean> - True if user has required permissions
 * @throws {Error} When eventId is invalid or user doesn't exist
 */
async hasEventRole(userId: string, eventId: string, requiredRoles: string[]): Promise<boolean>
```

## Submitting Changes

### Pull Request Process

1. **Create Pull Request** from your feature branch to `main`
2. **Fill out PR template** with complete information
3. **Ensure tests pass** - CI must be green before review
4. **Request review** from appropriate team members
5. **Address feedback** and update as needed
6. **Squash and merge** once approved

### Pull Request Requirements

Your PR must include:

- [ ] **Clear description** of changes and motivation
- [ ] **Tests** for new functionality and bug fixes
- [ ] **Documentation updates** for user-facing changes
- [ ] **Security consideration** notes if applicable
- [ ] **Breaking change** notes if applicable
- [ ] **Mobile testing** confirmation for UI changes

### Review Process

- **Code Review**: At least one maintainer must review all changes
- **Security Review**: Security-sensitive changes require additional review
- **Documentation Review**: Documentation changes require content review
- **Testing**: All tests must pass in CI before merge
- **Performance**: Performance impacts are evaluated for critical paths

### Release Process

- We use GitHub Releases with semantic versioning (`vX.X.X`)
- Release notes are generated from PR descriptions
- Critical security fixes may be released immediately
- Regular releases follow a planned schedule

## Getting Help

### Community Resources

- **GitHub Discussions**: For questions and community support
- **Issues**: For bug reports and feature requests
- **Documentation**: Comprehensive guides at [docs site]
- **Code Comments**: Inline documentation in complex areas

### Maintainer Contact

For urgent issues or security concerns, contact the maintainers directly through:

- GitHub `@mattstratton`
- Project email (check README for current contact)

### Development Questions

For development questions:

1. Check existing documentation first
2. Search closed issues for similar questions
3. Ask in GitHub Discussions
4. Create a new issue if needed

---

Thank you for contributing to Conducky! Your help makes events safer for everyone.

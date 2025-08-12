---
sidebar_position: 1
---

# API Overview

This section provides comprehensive documentation for all API endpoints in the Conducky backend. The API is built with Express.js and provides secure, role-based access to all platform functionality.

## 🏗️ API Architecture

The Conducky API is organized into logical endpoint groups:

- **[Authentication](./authentication)** - User login, registration, and session management
- **[Organizations](./organizations)** - Multi-tenant organization management  
- **[Events](./events)** - Event creation and management within organizations
- **[Incidents](./incidents)** - Core incident reporting and management
- **Comments** - Comment system for incident collaboration
- **Related Files** - File upload and related file management
- **Users** - User management and profile operations
- **Invites** - Invitation system for role assignments
- **Notifications** - User notification preferences
- **System Admin** - System administration endpoints

## 🔒 Security and Rate Limiting

All API endpoints are protected by comprehensive security middleware:

### Security Headers

- **Content Security Policy (CSP)**: Prevents XSS attacks
- **HTTP Strict Transport Security (HSTS)**: Enforces HTTPS
- **X-Frame-Options**: Prevents clickjacking
- **X-Content-Type-Options**: Prevents MIME type sniffing
- **X-XSS-Protection**: Enables browser XSS protection

### Rate Limiting

Rate limiting is applied to protect against abuse and brute force attacks:

- **Production**: Rate limiting is active and enforced
- **Development**: Rate limiting is disabled for rapid testing
- **Test**: Rate limiting is disabled for automated testing

Rate limits vary by endpoint type:

- **Authentication**: Stricter limits on login/register attempts
- **File Upload**: Limits on file upload frequency
- **General API**: Standard rate limits for general API usage
- **Search**: Limits on search query frequency

### Input Validation and Security

- **Server-side validation**: All inputs are validated before processing
- **Input sanitization**: User inputs are sanitized to prevent XSS
- **SQL injection protection**: Parameterized queries prevent SQL injection
- **Path traversal protection**: File access is restricted to safe paths
- **Command injection protection**: User input is not executed as system commands

### Authentication and Authorization

- **Session-based authentication**: Uses secure session cookies
- **Role-based access control (RBAC)**: Permissions enforced at API level
- **Event-scoped permissions**: Users can only access data within their event roles
- **Multi-tenancy**: Data is isolated between different events and organizations

## 📡 Base URL

All API endpoints are prefixed with `/api`:

```
https://your-domain.com/api/[endpoint]
```

## 🔄 Response Format

All API responses follow a consistent format:

### Success Response
```json
{
  "message": "Operation completed successfully",
  "data": { ... },
  "pagination": { ... } // When applicable
}
```

### Error Response
```json
{
  "error": "Error description",
  "details": "Additional error details",
  "code": "ERROR_CODE"
}
```

## 🚀 Getting Started

1. **Authentication**: Start with the [Authentication](./authentication) endpoints to obtain session cookies
2. **Organizations**: Use [Organizations](./organizations) endpoints to manage multi-tenant structure
3. **Events**: Create and manage events within organizations using [Events](./events) endpoints
4. **Incidents**: Handle incident reporting and management with [Incidents](./incidents) endpoints

## 📋 Testing

All endpoints can be tested using:
- **Development Environment**: Local testing with rate limiting disabled
- **Postman/Insomnia**: Import the API collection for interactive testing
- **Automated Tests**: Run the test suite with `npm test` in the backend directory 

## User Pins

- GET `/api/users/me/pins?eventId=EVENT_ID` → `{ incidentIds: string[] }`
- POST `/api/users/me/pins`
  - Body: `{ incidentId: string, eventId: string }`
  - Response: `204 No Content`
- DELETE `/api/users/me/pins/:incidentId`
  - Response: `204 No Content`

Notes:
- Auth required. RBAC: user must be able to view the incident in the event.
- Idempotent operations; POST upserts, DELETE removes if present. 
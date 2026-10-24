---
sidebar_position: 2
---

# Authentication API

Authentication endpoints handle user registration, login, session management, and password reset functionality. All authentication routes are mounted at `/api/auth`.

## 🔐 User Registration

### Register New User

- **POST** `/api/auth/register`
- **Description:** Register a new user. The first user becomes Global Admin (SystemAdmin).
- **Body:** `{ email, password, name }`
- **Response:** `{ message, user, verificationRequired, verificationEmailSent }`

### Register with Invite

- **POST** `/api/auth/register/invite/:inviteCode`
- **Description:** Register a new user using an invite code. Automatically assigns the role specified in the invite.
- **Body:** `{ email, password, name }`
- **Response:** `{ message, user, verificationRequired, verificationEmailSent }`
- **Notes:**
  - Validates the invite code and checks if it's not disabled or expired
  - Automatically assigns the user to the event with the role specified in the invite
  - Increments the invite's use count

## 🚪 Session Management

### Login

- **POST** `/api/auth/login`
- **Description:** Log in with email and password.
- **Body:** `{ email, password }`
- **Response:** `{ message, user }`

### Logout

- **POST** `/api/auth/logout`
- **Description:** Log out the current user.
- **Response:** `{ message }`

### Session Check

- **GET** `/api/auth/session` or `/api/session` or `/session`
- **Description:** Get current session user and roles.
- **Response:** `{ authenticated: true, user: { id, email, name, avatarUrl } }` or `{ authenticated: false }`

## ✉️ Email Validation

### Check Email Availability

- **GET** `/api/auth/check-email`
- **Description:** Check if an email address is available for registration.
- **Query Parameters:** `email` (required)
- **Response:** `{ available: boolean }`

## 🔑 Password Reset

### Request Password Reset

- **POST** `/api/auth/forgot-password`
- **Description:** Request a password reset token via email.
- **Body:** `{ email }`
- **Response:** `{ message }`

### Reset Password

- **POST** `/api/auth/reset-password`
- **Description:** Reset password using a valid token.
- **Body:** `{ token, newPassword }`
- **Response:** `{ message }`

### Validate Reset Token

- **GET** `/api/auth/validate-reset-token`
- **Description:** Validate a password reset token.
- **Query Parameters:** `token` (required)
- **Response:** `{ valid: boolean, email?: string, expiresAt?: string }`

## 🔒 Security Features

### Session Security
- Session-based authentication using secure HTTP-only cookies
- Automatic session expiration and renewal
- Cross-site request forgery (CSRF) protection

### Password Security
- Minimum password requirements enforced
- Secure password hashing using bcrypt
- Password reset tokens with expiration

### Rate Limiting
- Stricter rate limits on authentication endpoints
- Protection against brute force attacks
- Progressive delays on failed login attempts 
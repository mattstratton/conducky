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
- **Notes:**
  - `verificationRequired` is `true` when email is configured and the new account must verify its address before it can sign in (the first account is verified automatically and gets `false`). It is `false` when email is not configured.
  - `verificationEmailSent` is `true` when the verification email was sent successfully. If it is `false` while `verificationRequired` is `true`, the person can use `POST /api/auth/resend-verification`.
  - Registering an address held by a still-pending unverified signup replaces that signup only if its last verification email is more than 1 hour old. Otherwise the response is `409` with `Email already registered.` (the invite endpoint returns the same message with `400`).

### Register with Invite

- **POST** `/api/auth/register/invite/:inviteCode`
- **Description:** Register a new user using an invite code. Automatically assigns the role specified in the invite.
- **Body:** `{ email, password, name }`
- **Response:** `{ message, user, verificationRequired, verificationEmailSent }` (see [Register New User](#register-new-user))
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
- **Errors:** `401 { error: 'Please verify your email address to sign in.', code: 'EMAIL_NOT_VERIFIED' }` for an unverified new account when the password is correct (only returned while email is configured). Wrong credentials return the usual `401`.

### Logout

- **POST** `/api/auth/logout`
- **Description:** Log out the current user.
- **Response:** `{ message }`

### Session Check

- **GET** `/api/auth/session` or `/api/session` or `/session`
- **Description:** Get current session user and roles.
- **Response:** `{ authenticated: true, user: { id, email, name, avatarUrl, emailVerified, canVerifyEmail } }` or `{ authenticated: false }`
- **Notes:** `emailVerified` and `canVerifyEmail` are returned by `GET /api/session` (the other two paths return only `id, email, name, avatarUrl`). `emailVerified` is `true` when the account's email address is verified. `canVerifyEmail` is `true` when the account is unverified, has a password, and email is configured; the frontend uses it to show the verification banner.

## ✉️ Email Validation

### Check Email Availability

- **GET** `/api/auth/check-email`
- **Description:** Check if an email address is available for registration.
- **Query Parameters:** `email` (required)
- **Response:** `{ available: boolean }`

### Verify Email

- **POST** `/api/auth/verify-email`
- **Description:** Verify an email address with the token from a verification link. Tokens are single use, expire after 24 hours, and only work for the address they were mailed to. For an email change link, this applies the new address.
- **Body:** `{ token }`
- **Response (200):** `{ status: 'verified' | 'already_verified' | 'email_changed' }`
- **Errors:** `400 { error }` for an invalid or expired link
- **Rate limit:** Shared authentication limiter (5 requests per 15 minutes per IP)

### Resend Verification Email

- **POST** `/api/auth/resend-verification`
- **Description:** Send a new verification email to an account that is awaiting verification.
- **Body:** `{ email }`
- **Response (200):** `{ message }`. Always the same neutral response, whether or not the account exists or needs verification, so it cannot be used to discover accounts.
- **Rate limit:** Shared authentication limiter

### Correct Email

- **POST** `/api/auth/correct-email`
- **Description:** Fix a mistyped address on an account that is awaiting verification. Requires the account's password. Sends a verification email to the corrected address.
- **Body:** `{ email, password, newEmail }`
- **Response (200):** `{ email, verificationEmailSent }`
- **Errors:**
  - `400` for missing fields, an invalid new address, or an account that does not need verification
  - `401 { error: 'Invalid email or password.' }`
  - `409 { error: 'Email already registered.' }`
  - `429` when another email was requested within the last minute
- **Rate limit:** Shared authentication limiter

### Request Verification Email (signed-in users)

- **POST** `/api/users/me/verification-email`
- **Description:** Ask for a verification email to the signed-in user's current address. This is for accounts that existed before verification (or while email was not configured) and never blocks anything.
- **Authentication:** Required
- **Response (200):** `{ message, verificationEmailSent, email }`, or `{ status: 'already_verified' }`
- **Errors:** `400` if the account cannot request one, `409` when an email change is pending (that link also verifies the account), `429` when requested again within 60 seconds
- **Rate limit:** Its own limiter (5 requests per 15 minutes per IP)

### Change Email (profile)

- **PATCH** `/api/users/me/profile`
- **Description:** Update name and email. When email is configured and `email` differs from the current address, the change is not applied until the new address is verified.
- **Body:** `{ name, email }`
- **Response (200):** `{ message, user }`. When an email change is pending, also `{ emailChangePending: '<new address>', verificationEmailSent }`; `user.email` is still the current address.
- **Errors:** `409 { error: 'This email address is already in use.' }`, `429 { error: 'Please wait a minute before requesting another email change.' }`
- **Notes:** The current address receives a notice when the change is requested (with a partly masked new address) and a confirmation when it takes effect. Only the newest link works. Changing or resetting the password cancels a pending change. If email is not configured the change is applied immediately and the new address is treated as unverified.

### Email Status (System Admin)

- **GET** `/api/admin/email-status`
- **Description:** Whether a real email provider (`smtp` or `sendgrid`) is configured and initialized. Used for the System Admin warning banner.
- **Authentication:** System Admin
- **Response:** `{ configured: boolean }`

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
- Stricter rate limits on authentication endpoints. Login, register, register with invite, verify-email, resend-verification and correct-email share one limiter (5 requests per 15 minutes per IP)
- Protection against brute force attacks
- Progressive delays on failed login attempts 
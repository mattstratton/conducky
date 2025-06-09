## Testing Invite Registration Success Flow (Issue #80)

### Automated Test Suggestion
- Add a test to `frontend/pages/invite/[code].js` (or a related test file) that:
  1. Mocks a successful registration response for the invite registration form.
  2. Verifies that after submitting the form, the success message "Registration successful! Please log in to continue." is shown.
  3. Verifies that a "Go to Login" button appears, linking to `/login?next=/invite/[code]`.
  4. Ensures the user is **not** auto-logged-in (i.e., user context remains null).

### Manual Test Steps
1. Open an invite link in a private/incognito window.
2. Fill out the registration form as a new user.
3. Submit the form.
4. Confirm that you see a success message: "Registration successful! Please log in to continue." and a button labeled "Go to Login".
5. Click the "Go to Login" button and verify you are taken to the login page, with the `next` parameter set to the invite link.
6. Log in with the newly created credentials and confirm you are redirected appropriately.
7. Confirm you are **not** automatically logged in after registration. 
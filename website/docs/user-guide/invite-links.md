---
sidebar_position: 9
---
# Invite Links

Event Admins can create invite links to make it easy for users to join their event with the appropriate role.

## Creating Invite Links

1. Go to the Admin page for your event
2. Click "Manage Invite Links"
3. Click "Create New Invite Link"
4. Choose the role (Admin, Responder, or Reporter)
5. Optionally set an expiration date and maximum number of uses
6. Add a note to help you remember what the link is for
7. Click "Create Link"

## Using Invite Links

Once created, you can:

- **Copy the link** and share it with users
- **View usage statistics** to see how many times it's been used
- **Disable links** that are no longer needed
- **Delete links** permanently

## Link Properties

Each invite link has the following properties:

- **Role**: The role that will be assigned when someone uses the link
- **Expiration**: Optional date when the link stops working
- **Max Uses**: Optional limit on how many people can use the link
- **Current Uses**: How many times the link has been used
- **Status**: Active or disabled
- **Note**: Optional description for your reference

## Security Considerations

- Invite links grant immediate access to your event
- Only share links with trusted individuals
- Set expiration dates for temporary access
- Regularly review and clean up unused links
- Disable links immediately if they're compromised

## Best Practices

- Use descriptive notes to track the purpose of each link
- Set reasonable expiration dates (e.g., 1 week for onboarding)
- Limit the number of uses for sensitive roles like Admin
- Monitor usage and follow up with new users
- Delete old, unused links to maintain security

When someone uses an invite link, they'll be prompted to create an account (if they don't have one) and will automatically be assigned to your event with the specified role.

---

## Overview
- Invite links allow event admins to invite users to join their event as Reporters.
- Links can be single-use, multi-use, expiring, or indefinite.
- Each invite link has a code, creator, expiration, max uses, use count, disabled flag, and note.

---

## Managing Invite Links
- Admins can view all invite links for their event, see status, uses, expiration, and notes.
- Links can be disabled (cannot be redeemed after disabling).
- **API:**
  - `GET /events/slug/:slug/invites` (list)
  - `PATCH /events/slug/:slug/invites/:inviteId` (disable/update)
- **UI:**
  - Event Admin page lists all invite links with actions.

---

## Redeeming Invite Links
- Anyone with a valid invite link can register and join the event as a Reporter.
- If not logged in, users can register via the invite link page.
- If already logged in, users can join the event directly.
- **API:**
  - `POST /register/invite/:inviteCode` (register via invite)
  - `GET /invites/:code` (get invite details)
- **UI:**
  - Visiting `/invite/[code]` shows the registration/join flow.

---

## Permissions
- Only event Admins or SuperAdmins can create, view, or disable invite links for their event.
- Anyone can redeem a valid invite link (subject to max uses, expiration, and disabled status).

---

## Notes
- Invite links are a secure way to onboard users without manual admin intervention.
- All invite actions are subject to event and role permissions.
- For more, see [API Endpoints](../developer-docs/api-endpoints.md) and [User Management](./user-management.md). 
---
sidebar_position: 5
---
# Invite Links

This document explains how the invite link system works for onboarding users to events.

---

## Overview
- Invite links allow event admins to invite users to join their event as Reporters.
- Links can be single-use, multi-use, expiring, or indefinite.
- Each invite link has a code, creator, expiration, max uses, use count, disabled flag, and note.

---

## Creating Invite Links
- Only event Admins or SuperAdmins can create invite links for an event.
- **API:**
  - `POST /events/slug/:slug/invites` with `{ maxUses, expiresAt, note }`
- **UI:**
  - Event Admin page has a form to create new invite links.

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
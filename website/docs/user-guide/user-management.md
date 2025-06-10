---
sidebar_position: 6
---
# User Management

Event Admins can manage users for their event using a powerful user list UI with the following features:

- **Search:** Filter users by name or email using the search box above the table. The list updates as you type.
- **Sort:** Sort users by name, email, or role using the sort dropdown. Toggle ascending/descending order with the arrow button.
- **Pagination:** Navigate through users with page controls below the table. Change the number of users per page (10, 20, 50) using the selector.
- **Role Filter:** Filter users by event role (Admin, Responder, Reporter) using the role dropdown. Only users with the selected role will be shown.

All these controls can be combined for advanced filtering and navigation.

## Avatars

You can personalize your account by uploading an avatar (profile picture). Your avatar will appear in the navigation bar, Code of Conduct team list, and next to your comments on reports.

- **Upload/Change Avatar:** Go to your profile page (click your avatar or email in the top right) and use the upload button to select a PNG or JPG image (max 2MB).
- **Remove Avatar:** On your profile page, click the "Remove Avatar" button to revert to your initials.
- **Privacy:** Only you can upload or remove your avatar. Other users will see your avatar but cannot change it.
- **Fallback:** If you do not upload an avatar, your initials will be shown instead.

Avatars help personalize the experience and make it easier to identify users in team lists and report comments.

## API Details
The backend endpoint `/events/slug/:slug/users` supports the following query parameters:
- `search` (string): Filter by name or email
- `sort` (name|email|role): Sort field
- `order` (asc|desc): Sort order
- `page` (integer): Page number
- `limit` (integer): Users per page
- `role` (Admin|Responder|Reporter): Filter by event role

See [API Endpoints](../developer-docs/api-endpoints.md) for more details. 
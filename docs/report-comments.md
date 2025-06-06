# Report Comments API

## Permissions
- **Add Comment:** Responders, Admins, SuperAdmins, and the original reporter (user whose ID matches the report's `reporterId`) can add comments to a report.
- **Edit Comment:** Only the author of a comment can edit it. Only responders/admins can set a comment to internal visibility.
- **Delete Comment:** Only the author or an Admin/SuperAdmin can delete a comment.
- **Internal Comments:** Only responders/admins can create or set a comment as internal (private).

## Endpoints
- `POST /events/:eventId/reports/:reportId/comments` (and slug-based)
- `PATCH /events/:eventId/reports/:reportId/comments/:commentId` (and slug-based)
- `DELETE /events/:eventId/reports/:reportId/comments/:commentId` (and slug-based)

See API reference for request/response details.

## Planned Features
- If a comment has been edited, it should be marked so users know it was edited.
- All edits or deletions of comments should be stored in the audit log (pending audit log implementation). 
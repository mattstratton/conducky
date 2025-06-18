---
sidebar_position: 4
---
# Report Comments System

## Overview

The comment system allows users to collaborate on incident reports through threaded discussions. Comments support markdown formatting, role-based visibility controls, and advanced search and filtering capabilities.

## Features

### Markdown Support
- **Rich Text Formatting**: Bold, italic, headers, lists, links, and code blocks
- **GitHub-style Markdown**: Familiar syntax for developers and power users
- **Toggle Support**: Users can choose between plain text and markdown for each comment
- **Universal Rendering**: All comments render as markdown regardless of editor choice (follows GitHub Issues pattern)

### Enhanced Pagination & Filtering
- **Smart Pagination**: Configurable page sizes (10-100 comments per page)
- **Advanced Search**: Full-text search across comment content
- **Role-based Filtering**: Filter by visibility level (public, internal, all)
- **Flexible Sorting**: Sort by creation date or last modified, ascending or descending
- **Direct Linking**: Permalink support for specific comments with cross-page navigation

### User Experience Features
- **Quote Reply**: Click any comment to quote it in a new reply
- **Inline Editing**: Edit comments in place with markdown toolbar
- **Real-time Search**: Debounced search with instant results
- **Mobile Responsive**: Optimized interface for mobile incident response

## Permissions

### Add Comment
- **Responders, Admins, SuperAdmins**: Can add comments to any report in their events
- **Reporters**: Can add comments to their own reports
- **Assigned Users**: Can comment on reports assigned to them

### Edit Comment
- **Comment Author**: Can edit their own comments at any time
- **Content Preservation**: Original markdown content is preserved during edits
- **Visibility Changes**: Only Responders/Admins can change comments to 'internal'

### Delete Comment
- **Comment Author**: Can delete their own comments
- **Admins/SuperAdmins**: Can delete any comment in their events
- **Permanent Action**: Deletions cannot be undone

### Internal Comments
- **Creation**: Only Responders, Admins, and SuperAdmins can create internal comments
- **Visibility**: Internal comments are hidden from Reporters unless they're assigned to the report
- **Use Cases**: Sensitive information, internal coordination, response planning

## API Endpoints

### Core Operations
- `GET /api/events/slug/:slug/reports/:reportId/comments` - List comments with pagination/filtering
- `POST /api/events/slug/:slug/reports/:reportId/comments` - Create new comment
- `PATCH /api/events/slug/:slug/reports/:reportId/comments/:commentId` - Update comment
- `DELETE /api/events/slug/:slug/reports/:reportId/comments/:commentId` - Delete comment

### Query Parameters (GET)
- `page`, `limit` - Pagination controls
- `search` - Full-text search in comment body
- `visibility` - Filter by public/internal/all
- `sortBy`, `sortOrder` - Sorting options

See the [API Endpoints documentation](./api-endpoints.md#comments) for complete details.

## Implementation Details

### Security Considerations
- **XSS Prevention**: All user content is properly sanitized
- **Role Validation**: Server-side permission checks on all operations
- **Content Isolation**: Internal comments are strictly access-controlled

### Performance Features
- **Efficient Pagination**: Database-optimized queries with proper indexing
- **Search Debouncing**: Prevents excessive API calls during typing
- **Smart Caching**: Comment pages are cached for quick navigation

### Accessibility
- **Screen Reader Support**: Proper ARIA labels and semantic HTML
- **Keyboard Navigation**: Full keyboard accessibility for all features
- **Focus Management**: Logical tab order and focus indicators

## Future Enhancements

### Planned Features
- **Edit History**: Track and display comment edit history
- **Audit Logging**: Complete audit trail for all comment operations
- **Advanced Search**: Search across multiple reports and events
- **Comment Reactions**: Emoji reactions for quick feedback
- **File Attachments**: Attach images and documents to comments

### Security Improvements
- **DOMPurify Integration**: Enhanced markdown sanitization (Issue #228)
- **Rate Limiting**: Prevent comment spam and abuse
- **Content Moderation**: Automated and manual content review tools

### Performance Optimizations
- **Virtual Scrolling**: Handle thousands of comments efficiently
- **Search Highlighting**: Secure highlighting of search terms (Issue #229)
- **Real-time Updates**: WebSocket integration for live comment updates

## Testing

### Automated Tests
- **Backend**: Comprehensive API testing in `backend/tests/integration/`
- **Frontend**: Component tests for all comment UI elements
- **Security**: XSS prevention and permission validation tests

### Manual Testing Checklist
- Test markdown rendering in all browsers
- Verify role-based access controls
- Test pagination and search functionality
- Confirm mobile responsiveness
- Validate keyboard accessibility
- Test direct comment linking

## Related Documentation
- [API Endpoints](./api-endpoints.md#comments)
- [Testing Guide](./testing.md)
- [User Guide: Getting Started](../user-guide/getting-started.md)
- [Security Issues: #228](https://github.com/mattstratton/conducky/issues/228), [#229](https://github.com/mattstratton/conducky/issues/229) 
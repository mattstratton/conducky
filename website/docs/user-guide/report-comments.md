---
sidebar_position: 7
---

# Report Comments Guide

The comment system allows team members to collaborate on incident reports through threaded discussions. Comments support rich text formatting, role-based visibility controls, and powerful search capabilities.

## Overview

Comments are the primary way to communicate about incident reports. Whether you're providing updates, asking questions, or coordinating response efforts, the comment system keeps everyone informed and aligned.

### Key Features
- **Markdown Support**: Rich text formatting with GitHub-style markdown
- **Role-Based Visibility**: Public comments for all team members, internal comments for responders only
- **Advanced Search**: Find specific discussions quickly with full-text search
- **Smart Pagination**: Navigate through large comment threads efficiently
- **Direct Linking**: Share links to specific comments across the team
- **Mobile Optimized**: Full functionality on mobile devices for field response

## Comment Types

### Public Comments
- **Visible to**: All users with access to the report (reporters, responders, admins)
- **Use for**: General updates, questions, coordination visible to all parties
- **Default**: All comments are public unless specifically marked as internal

### Internal Comments  
- **Visible to**: Responders, admins, and SuperAdmins only
- **Use for**: Sensitive coordination, internal discussions, response planning
- **Permission**: Only responders/admins can create internal comments
- **Security**: Hidden from reporters unless they're assigned to the report

## Writing Comments

### Basic Commenting
1. **Navigate** to any report detail page
2. **Scroll** to the Comments section at the bottom
3. **Type** your message in the comment form
4. **Choose** visibility (Public/Internal) if you have permissions
5. **Click** "Add Comment" to post

### Markdown Formatting

Comments support GitHub-style markdown for rich text formatting:

#### Text Formatting
```markdown
**Bold text** or __bold text__
*Italic text* or _italic text_
***Bold and italic***
~~Strikethrough~~
```

#### Headers
```markdown
# Large Header
## Medium Header  
### Small Header
```

#### Lists
```markdown
**Unordered Lists:**
- Item 1
- Item 2
  - Nested item
  
**Ordered Lists:**
1. First item
2. Second item
   1. Nested item
```

#### Links and Code
```markdown
[Link text](https://example.com)
`inline code`

```
code block
```
```

#### Quotes
```markdown
> This is a quote
> Multiple lines
>> Nested quote
```

### Markdown Editor Features

The comment editor includes a helpful toolbar:
- **Bold/Italic**: Quick formatting buttons
- **Headers**: Dropdown for header levels
- **Lists**: Ordered and unordered list buttons
- **Links**: Insert link dialog
- **Code**: Inline and block code formatting
- **Quote**: Block quote formatting
- **Preview**: Toggle to see formatted output

## Finding Comments

### Search Functionality
- **Access**: Use the search box above the comments list
- **Real-time**: Results appear as you type (debounced for performance)
- **Scope**: Searches all comment text content
- **Case-insensitive**: Finds matches regardless of capitalization

### Filtering Comments
- **All Comments**: Shows both public and internal (if permitted)
- **Public Only**: Shows only public comments
- **Internal Only**: Shows only internal comments (responders/admins)

### Sorting Options
- **Chronological**: Default sort by creation date (oldest first)
- **Recent First**: Newest comments at the top
- **Last Modified**: Sort by when comments were last edited

## Advanced Features

### Quote Reply
1. **Click** the quote button (💬) on any comment
2. **Original text** is automatically quoted in your reply
3. **Add** your response below the quoted text
4. **Auto-scroll**: Form automatically focuses for quick response

### Comment Linking
- **Permalink**: Each comment has a unique URL anchor
- **Direct Access**: Link to specific comments across pages
- **Cross-reference**: Reference specific comments in discussions
- **URL Format**: `#comment-123` where 123 is the comment ID

### Pagination Navigation
- **Page Controls**: Navigate through large comment threads
- **Configurable Size**: 10-100 comments per page
- **Smart Loading**: Comments load efficiently for performance
- **Page Memory**: Returns to your last position when navigating back

### Edit and Delete
- **Edit Own Comments**: Click the edit button (✏️) on your comments
- **Preserve Formatting**: Original markdown is preserved during edits
- **Delete Comments**: Click delete button (🗑️) with confirmation
- **Admin Override**: Admins can edit/delete any comments in their events

## Best Practices

### Effective Communication
- **Be Clear**: Write concise, actionable comments
- **Stay On Topic**: Keep discussions focused on the incident
- **Use Formatting**: Leverage markdown for better readability
- **Quote Context**: Quote relevant parts when replying to specific points

### Visibility Management
- **Default Public**: Use public comments for transparency
- **Internal When Needed**: Use internal comments for sensitive coordination
- **Consider Audience**: Think about who needs to see each message
- **Role Awareness**: Remember reporters can see public comments

### Mobile Usage
- **Touch Friendly**: All features work on mobile devices
- **Quick Response**: Use quote reply for fast field updates
- **Voice Input**: Mobile keyboards support voice-to-text
- **Offline Drafts**: Write comments offline, post when connected

## Role-Based Access

### Reporters
- **Create**: Public comments on own reports
- **View**: Public comments on reports they have access to
- **Edit**: Own comments only
- **Internal Access**: Can see internal comments on assigned reports

### Responders  
- **Create**: Both public and internal comments
- **View**: All comments on reports in their events
- **Edit**: Own comments, change visibility levels
- **Full Access**: No restrictions within their event scope

### Admins
- **Create**: All comment types with full permissions
- **View**: Complete access to all comments in their events
- **Moderate**: Edit/delete any comments for content management
- **Override**: Full administrative control over discussions

## Troubleshooting

### Common Issues

**Comments Not Appearing**
- Check if you're looking at the right visibility filter
- Ensure you have permission to see internal comments
- Refresh the page if comments seem out of sync

**Markdown Not Rendering**
- Verify proper markdown syntax (spacing matters)
- Check that special characters are properly escaped
- Use the preview toggle to check formatting

**Search Not Working**
- Try different keywords or phrases
- Search only looks at comment text, not metadata
- Clear search and try filtering by visibility instead

**Mobile Issues**
- Ensure good network connection for real-time features
- Try landscape mode for better markdown editor access
- Use voice input for faster comment entry

### Getting Help
- **Event Admins**: Contact your event administrators for role or access issues
- **Technical Issues**: Report bugs through your organization's support channels  
- **Training**: Ask responder team leads for comment system training

## Security and Privacy

### Data Protection
- **Event Isolation**: Comments are isolated between events
- **Role Enforcement**: Visibility rules are strictly enforced
- **Audit Logging**: All comment actions are logged for security
- **Content Security**: User input is sanitized to prevent security issues

### Best Practices
- **Sensitive Information**: Use internal comments for confidential details
- **Personal Data**: Avoid including personal information unnecessarily
- **External Sharing**: Be cautious about sharing comment links outside the team
- **Regular Review**: Periodically review comment visibility settings

The comment system is designed to facilitate effective incident response while maintaining appropriate security and privacy controls. Use these features to keep your team coordinated and informed throughout the incident lifecycle. 
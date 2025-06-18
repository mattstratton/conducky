---
sidebar_position: 12
---

# Public Event Pages

Conducky provides public-facing pages for each event that can be shared publicly without requiring authentication. These pages help potential reporters understand the incident reporting process and provide information about getting access to submit reports.

## Accessing Public Event Pages

Public event pages are available at `/events/[eventSlug]/` where `[eventSlug]` is the unique identifier for the event.

**Examples:**
- `https://conducky.example.com/events/devconf-2024/`
- `https://conducky.example.com/events/pydata-chicago/`

## Page Content

### Event Information

Public event pages display:
- **Event name and logo** (if configured)
- **Event description**
- **Event dates** (start and end dates if configured)
- **Event website link** (if configured)

### Incident Reporting Process

The page explains the incident reporting process with a visual 4-step workflow:

1. **Submit** - Report incidents through the system
2. **Acknowledged** - Event staff acknowledge receipt within 24 hours
3. **Investigation** - Thorough and fair investigation process
4. **Resolution** - Appropriate action taken and follow-up provided

This helps visitors understand what to expect when submitting a report.

### Available Actions

The actions available depend on the visitor's authentication status and event access:

#### For Unauthenticated Visitors

- **Anonymous Reporting** (coming soon) - Will allow reporting without creating an account
- **Direct Contact** (if contact email configured) - Email the event organizers directly
- **Create Account** - Register for a Conducky account
- **Login** - Access existing account

#### For Authenticated Users Without Event Access

- **Anonymous Reporting** (coming soon) - Will allow reporting without joining the event
- **Direct Contact** (if contact email configured) - Email the event organizers directly
- **Request Event Access** (if contact email configured) - Send email requesting to join the event

#### For Authenticated Users With Event Access

- **Go to Event Dashboard** - Access the full event interface
- **Submit Report** - Submit incident reports through the authenticated interface

### Code of Conduct

If the event has configured a code of conduct, it will be displayed on the public page, providing transparency about event standards and expectations.

## Configuration Requirements

For optimal public page experience, event administrators should configure:

### Required Information
- **Event name** (always required)
- **Event slug** (always required, auto-generated from name)

### Recommended Information
- **Event description** - Helps visitors understand the event context
- **Contact email** - Enables direct contact and access request functionality
- **Code of conduct** - Provides transparency about event standards
- **Event logo** - Professional appearance and event branding
- **Event dates** - Helps visitors understand when the event occurs
- **Event website** - Link to official event information

### Configuration via Event Settings

Event administrators can configure these details through:
1. **Event Settings** (`/events/[eventSlug]/settings`)
2. **Event Details** section
3. Save changes to update the public page immediately

## Integration with Home Page

When the SuperAdmin enables "Show Public Event List" in system settings:
- All active events appear on the home page for unauthenticated users
- Each event links to its public event page
- This provides a directory of events using Conducky

## Privacy and Security

### Public Information
- Event name, description, dates, website, and code of conduct are publicly visible
- No sensitive information (reports, user data, internal communications) is exposed

### Contact Information
- Contact emails are only used for generating mailto links
- No direct email addresses are displayed on the page
- Contact functionality requires user interaction to send emails

### Authentication Integration
- Public pages work seamlessly with the authentication system
- Users can transition from public viewing to authenticated reporting
- Access levels are properly enforced based on authentication and event membership

## Mobile Optimization

Public event pages are fully mobile-optimized:
- **Responsive design** adapts to all screen sizes
- **Touch-friendly buttons** with appropriate sizing
- **Fast loading** with optimized content
- **Progressive enhancement** works without JavaScript

## SEO and Sharing

Public event pages are designed for sharing:
- **Clean URLs** that are easy to share
- **Semantic HTML** for accessibility and SEO
- **Appropriate meta tags** for social media sharing
- **Professional appearance** suitable for official event communications

## Use Cases

### Event Organizers
- Share public page link on event websites
- Include in event registration materials
- Post on social media for incident reporting awareness
- Provide to attendees for easy access to reporting

### Attendees and Visitors
- Learn about incident reporting before attending events
- Understand the process and protections in place
- Access reporting functionality easily during events
- Contact organizers with questions or concerns

### Anonymous Reporting
When implemented, anonymous reporting will allow:
- Incident submission without account creation
- Privacy protection for sensitive reports
- Streamlined reporting for one-time users
- Reduced barriers to reporting incidents

---

## Related Documentation

- [Event Management](./event-management.md) - Configuring event details
- [Navigation Guide](./navigation.md) - Understanding public vs authenticated navigation
- [Getting Started](./getting-started.md) - Account creation and authentication
- [System Management](../admin-guide/system-management.md) - SuperAdmin control of public event listing 
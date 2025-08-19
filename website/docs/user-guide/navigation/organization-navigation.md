---
sidebar_position: 2
---

# Organization Navigation

Learn how to navigate and manage organizations in Conducky, including cross-event coordination and organization-level features.

---

## Organization Context

When you're working within an organization context, the navigation adapts to provide access to organization-level functionality:

### Organization Dashboard (`/orgs/[orgSlug]/`)

The main organization workspace where you can:

- **Overview**: See all events within the organization
- **Analytics**: View cross-event statistics and trends
- **Settings**: Manage organization-wide policies and configuration
- **Members**: Manage organization-level user roles and permissions

### Organization Navigation Items

**Always visible in organization context:**
- **Dashboard**: Organization overview and quick stats
- **Events**: List and manage all events in the organization
- **Members**: Organization-level user management
- **Settings**: Organization configuration and policies
- **Analytics**: Cross-event reporting and insights

---

## Cross-Event Management

### Event Coordination

**Managing multiple events:**
- **Event switching**: Move between events within the organization
- **Cross-event views**: See incidents and activity across all events
- **Unified reporting**: Generate organization-wide reports
- **Policy enforcement**: Ensure consistent standards across events

### Organization-Level Features

**Available to Organization Admins:**
- **Event creation**: Create new events within the organization
- **User management**: Assign organization-level roles
- **Policy setting**: Establish organization-wide standards
- **Cross-event coordination**: Coordinate between multiple events

**Available to Organization Viewers:**
- **Event monitoring**: View activity across all events
- **Trend analysis**: Identify patterns across events
- **Read-only access**: View but not modify organization data

---

## Navigation Patterns

### Switching Between Contexts

**From organization to event:**
1. Navigate to organization dashboard
2. Click on specific event card
3. Enter event context with event-specific navigation

**From event to organization:**
1. Use breadcrumb navigation to return to organization
2. Or navigate directly to `/orgs/[orgSlug]/`
3. Return to organization-level features

### Multi-Level Navigation

**Three-level hierarchy:**
1. **System Level** (`/admin/`) - System administration
2. **Organization Level** (`/orgs/[orgSlug]/`) - Organization management
3. **Event Level** (`/events/[eventSlug]/`) - Event-specific features

**Navigation flow:**
- System Admins can access all levels
- Organization Admins can access organization and event levels
- Event Admins can access event level only
- Regular users access event level based on their roles

---

## Organization-Specific Features

### Dashboard Overview

**Key information displayed:**
- **Event count**: Total number of events in the organization
- **Active incidents**: Current incidents across all events
- **Team size**: Total number of users across all events
- **Recent activity**: Latest actions across the organization

### Member Management

**Organization-level roles:**
- **Organization Admin**: Full management capabilities
- **Organization Viewer**: Read-only access to all events
- **Event-specific roles**: Individual event permissions

**User management features:**
- **Role assignment**: Assign organization-level roles
- **Cross-event access**: Manage user access across events
- **Permission coordination**: Ensure consistent access levels

---

## Getting Help

If you need assistance with organization navigation:

1. **Check your role**: Ensure you have appropriate organization-level permissions
2. **Review navigation**: Use breadcrumbs to understand your current location
3. **Contact administrators**: Reach out to Organization Admins or System Admins
4. **Check documentation**: Review organization management guides

---

**Continue with:** [Event Switching →](./event-switching)

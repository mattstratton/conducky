---
sidebar_position: 1
---

# Event Management Overview

This section explains how events are created and managed in Conducky, including the workflow for System Admins and Event Admins. Events are the core organizational unit in Conducky, providing isolated environments for incident management.

## Event Management Workflow

Conducky supports flexible event creation through multiple pathways depending on organizational structure:

### Organization-Based Events

1. **Organization Admin creates event** within their organization
2. **Event inherits organization context** and all current org admins are explicitly added as Event Admins for that event
3. **Event Admin configures detailed settings** (contact info, dates, CoC, etc.)
4. **Event becomes active** once fully configured
5. **Event Admin manages** ongoing operations (users, reports, settings)

### Direct System Admin Creation

1. **System Admin creates minimal event** with basic information (name, slug, description)
2. **Event is created as inactive** (`isActive: false`) until fully configured
3. **System Admin assigns Event Admin** role to designated event organizer
4. **Event Admin completes setup** and activates the event

This workflow ensures proper separation of concerns and supports both organizational hierarchies and direct system administration.

## Event Data Model

Each event has a unique `id`, `name`, and `slug` that are used throughout the system:

- **Events are isolated**: Users can only access data from events where they have roles
- **Events have roles**: Users are assigned specific roles (Reporter, Responder, Admin) per event
- **Events track activity**: All incidents, audit logs, and invitations are scoped to events
- **Events have settings**: Each event can be configured independently

See the [Event Structure](./event-structure) page for detailed technical information.

## Key Event Management Areas

This guide is organized into focused sections:

- **[Creating Events](./creating-events)** - How to create and set up new events
- **[Event Structure](./event-structure)** - Understanding event data and relationships
- **[Event Configuration](./event-configuration)** - Managing event settings and metadata
- **[Role Management](./role-management)** - Understanding event permissions and roles
- **[Event Administration](./event-administration)** - Advanced management features

## Who Can Manage Events

### System Admins
- **Create events** globally for any organization
- **Generate admin invites** for event organizers
- **Monitor system-wide** event activity
- **Manage event status** (active/disabled)

:::warning System Admin Event Access
System Admins do **not** automatically have access to event data. They must be explicitly added to events by Event Admins to view or manage incident reports.
:::

### Event Admins
- **Complete event setup** and configuration
- **Manage team members** and send invitations
- **Configure event settings** including code of conduct
- **Monitor event activity** and incident reports
- **Handle ongoing operations** for their events

### Organization Admins

- **Create events** within their organization
- **Are explicitly added** as Event Admins for created events (no implicit access to existing events)
- **Manage organization-scoped** event settings

## Event Lifecycle

Events go through several phases:

1. **Creation** - Basic event information is set up
2. **Configuration** - Event details, settings, and team are configured
3. **Activation** - Event becomes live and accessible to users
4. **Operation** - Ongoing incident management and team coordination
5. **Archival** - Event is completed but data is preserved

## Getting Started

### For System Admins
1. **Review the [Creating Events](./creating-events)** guide for event creation
2. **Understand [Role Management](./role-management)** for proper permission assignment
3. **Learn about [Event Administration](./event-administration)** for ongoing management

### For Event Admins
1. **Start with [Event Configuration](./event-configuration)** to set up your event
2. **Review [Role Management](./role-management)** to understand team permissions
3. **Check [Event Administration](./event-administration)** for ongoing operations

### For New Users
1. **Understand [Event Structure](./event-structure)** to learn how events work
2. **Review [Role Management](./role-management)** to understand your permissions
3. **See the main [User Guide](../intro)** for general usage information

## Security and Isolation

Events provide strong isolation between different organizations and conferences:

- **Data isolation**: Event data is strictly scoped and cannot be accessed across events
- **Role-based access**: Users only see features and data appropriate to their role
- **Audit logging**: All event management actions are tracked for security
- **Secure invitations**: Invite links use secure tokens with expiration and usage limits

This ensures that each event operates independently while maintaining system security.
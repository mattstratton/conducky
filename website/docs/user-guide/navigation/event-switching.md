---
sidebar_position: 3
---

# Event Switching

Conducky supports participation in multiple events with different roles. This page explains how to navigate between events and manage your multi-event experience.

## Event Switcher in Sidebar

The "My Events" section in the sidebar provides:

- **Event List**: All events you belong to with role indicators
- **Quick Switching**: Click any event to switch context
- **Role Visibility**: Shows your role in each event (Admin, Responder, Reporter)
- **Context Preservation**: Maintains your current page type when switching

{/* Screenshot Placeholder */}
> **Screenshot needed**: Sidebar event switcher showing multiple events with role badges

### Using the Event Switcher

1. **Locate the "My Events" section** in the sidebar
2. **View your events** with role indicators next to each name
3. **Click any event** to switch to that event's context
4. **Notice the navigation updates** to reflect your role in the new event

### Role Indicators

Each event in the switcher shows your role:
- **Admin** - Full event management access
- **Responder** - Incident response and team collaboration
- **Reporter** - Basic incident submission and viewing

## Multi-Event Dashboard

The global dashboard (`/dashboard`) provides:

- **Event Cards**: Role-based previews of each event you belong to
- **Quick Actions**: Role-specific actions for each event
- **Recent Activity**: Cross-event activity summary
- **Event Navigation**: Click any event card to enter that event's context

{/* Screenshot Placeholder */}
> **Screenshot needed**: Global dashboard showing multiple event cards with different roles

### Event Card Features

Each event card displays:
- **Event name and description**
- **Your role** in that event
- **Recent activity** (new reports, updates)
- **Quick actions** based on your role
- **"Go to Event" button** to enter event context

### Quick Actions by Role

**For Event Admins:**
- View team summary
- See pending invitations
- Access event settings
- Review recent reports

**For Responders:**
- View assigned incidents
- See team activity
- Access incident queue
- Review recent updates

**For Reporters:**
- View your submitted reports
- Submit new reports
- See report status updates
- Access event information

## Context Switching Behavior

When you switch between events, Conducky preserves your workflow:

### Page Type Preservation
- **Dashboard to Dashboard**: Switching from one event dashboard to another
- **Reports to Reports**: Switching from one event's reports to another's
- **Settings to Settings**: Event admins switching between event settings
- **Fallback**: If the page type doesn't exist for your role, defaults to event dashboard

### Navigation Updates
- **Sidebar navigation** updates to reflect your role in the new event
- **Breadcrumbs** update to show the new event context
- **Action buttons** change based on your permissions in the new event
- **Menu items** appear or disappear based on your new role

## Managing Multiple Event Types

### Conference Organizer Workflow
If you organize multiple conferences:

1. **Use the global dashboard** to see all your events at once
2. **Monitor cross-event activity** for patterns and insights
3. **Switch between events** to handle event-specific tasks
4. **Maintain consistent processes** across all your events

### Response Team Member Workflow
If you're a responder for multiple events:

1. **Check the global dashboard** for incidents across all events
2. **Use cross-event reporting** to see your full workload
3. **Switch to specific events** for detailed incident management
4. **Coordinate with different teams** using event-specific contexts

### Multi-Event Participant Workflow
If you participate in multiple events as a reporter:

1. **View all your reports** from the global dashboard
2. **Submit reports** to the appropriate events
3. **Track report status** across multiple events
4. **Manage your profile** consistently across all events

## Event Access Management

### Joining New Events

You can join additional events through:

1. **Invitation links** sent by event administrators
2. **Invite codes** entered through your profile page
3. **Direct addition** by event administrators

### Leaving Events

To leave an event:

1. **Go to your profile page** (accessible from user menu)
2. **Find the "My Events" section**
3. **Click "Leave Event"** next to the event you want to leave
4. **Confirm your decision** - this will remove all access to event data

:::warning[Leaving Events]
When you leave an event, you lose access to all event data, including incident reports you submitted. Event administrators can re-invite you if needed.
:::

### Event Status Changes

Events can have different statuses that affect your access:

- **Active**: Full access based on your role
- **Disabled**: No access until re-enabled by system administrators
- **Archived**: Read-only access to historical data

## Cross-Event Features

### Global Reporting
Access reports across all your events:
- **Combined incident view** showing reports from all events
- **Cross-event search** to find specific incidents
- **Unified notifications** for activity across all events
- **Aggregate statistics** showing your overall activity

### Profile Management
Manage your information consistently:
- **Single profile** used across all events
- **Consistent notification preferences** unless overridden per event
- **Unified contact information** for all event communications
- **Global settings** that apply to all your event participation

## Performance Considerations

### Optimized Loading
Conducky optimizes multi-event performance:
- **Lazy loading** of event data until needed
- **Efficient caching** of frequently accessed events
- **Parallel data fetching** when loading multiple events
- **Smart prefetching** of likely-to-be-accessed events

### Network Efficiency
- **Minimal API calls** when switching between events
- **Cached navigation data** to prevent redundant requests
- **Optimized payload sizes** for faster loading
- **Progressive enhancement** for slower connections

## Troubleshooting Event Switching

### Common Issues

**Event switcher is empty:**
- Verify you belong to at least one event
- Check that events are active and not disabled
- Refresh the page to reload event data

**Navigation doesn't update after switching:**
- Clear browser cache and refresh
- Check for JavaScript errors in browser console
- Verify your role permissions in the new event

**Missing events in switcher:**
- Confirm event administrators haven't removed your access
- Check if events have been disabled by system administrators
- Verify your invitation was properly accepted

**Performance issues when switching:**
- Check network connectivity
- Clear browser cache
- Disable browser extensions that might interfere
- Contact administrators if issues persist

### Getting Help

For event switching issues:
1. **Check your event memberships** in your profile page
2. **Verify event status** with event administrators
3. **Test with a different browser** to rule out browser issues
4. **Contact system administrators** for technical problems
5. **Review the troubleshooting guide** for additional solutions 
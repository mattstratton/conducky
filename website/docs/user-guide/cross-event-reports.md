---
sidebar_position: 6
---

# Cross-Event Reports Dashboard

The Cross-Event Reports Dashboard provides a centralized view of all reports across events where you have access, making it easy to manage incidents across multiple events from a single interface.

## Accessing the Dashboard

Navigate to **Dashboard > All Reports** from the main navigation, or visit `/dashboard/reports` directly.

## Role-Based Access

Your access to reports depends on your role in each event:

- **Reporters**: See only reports you've submitted across all events
- **Responders**: See all reports in events where you're a responder, plus your own reports in other events  
- **Admins**: See all reports in events where you're an admin, plus role-appropriate reports in other events

## Features

### Advanced Filtering

The dashboard provides comprehensive filtering options:

- **Search**: Search across report titles, descriptions, and reporter names
- **Status Filter**: Filter by report status (submitted, acknowledged, investigating, resolved, closed)
- **Event Filter**: Filter by specific events
- **Assignment Filter**: 
  - All assignments
  - Assigned to me
  - Unassigned reports

### Sorting and Pagination

- **Sortable Columns**: Click column headers to sort by title, status, or creation date
- **Pagination**: Navigate through large result sets with page controls
- **Results Per Page**: Shows up to 50 reports per page (configurable up to 100)

### Quick Actions

For reports where you have appropriate permissions, quick actions are available via the actions dropdown:

#### Assignment Actions
- **Assign to Me**: Quickly assign unassigned reports to yourself (Responders and Admins only)

#### Status Change Actions
- **Mark as Acknowledged**: Move submitted reports to acknowledged status
- **Mark as Investigating**: Progress reports from acknowledged to investigating
- **Mark as Resolved**: Mark investigating reports as resolved
- **Mark as Closed**: Close resolved reports

Available status transitions depend on the current report status and follow the standard workflow.

### Responsive Design

The dashboard adapts to different screen sizes:

- **Desktop**: Full table view with all columns and actions
- **Mobile**: Card-based layout with essential information and actions

## Report Information Displayed

Each report shows:

- **Title and Description**: Brief preview of the incident
- **Event**: Which event the report belongs to
- **Status**: Current state with color-coded badges
- **Severity**: If assigned (low, medium, high, critical)
- **Reporter**: Who submitted the report
- **Assignment**: Current assignee or "Unassigned"
- **Creation Date**: When the report was submitted
- **Evidence Count**: Number of attached files
- **Comment Count**: Number of comments on the report

## Actions Available

### View Report
- **View Button**: Opens the full report detail page in the event context
- Provides complete access to report details, comments, evidence, and management tools

### Quick Actions (Role-Based)
- **Assign to Me**: Available for responders/admins on unassigned reports
- **Status Changes**: Available based on current status and user permissions
- Actions are performed immediately and refresh the dashboard

## Navigation

From the cross-event dashboard, you can:

- **View Individual Reports**: Click "View" to open the full report in its event context
- **Apply Filters**: Use the filter controls to narrow down results
- **Sort Results**: Click column headers to change sort order
- **Navigate Pages**: Use pagination controls for large result sets

## Permissions and Security

- All reports are filtered based on your actual permissions in each event
- You cannot see reports from events where you don't have access
- Quick actions are only available where you have appropriate permissions
- All actions respect the same security rules as the individual event interfaces

## Performance

- Results are paginated for optimal performance
- Filters are applied server-side to reduce data transfer
- Real-time updates when actions are performed
- Efficient loading with skeleton states during data fetching

## Use Cases

### Multi-Event Responder
- View all reports assigned to you across events
- Quickly assign yourself to new unassigned reports
- Track progress of investigations across multiple events

### Event Administrator
- Monitor report activity across all managed events
- Identify trends and patterns in incident reporting
- Ensure timely response to critical incidents

### Conference Organizer
- Get overview of incident activity across multiple conference editions
- Compare incident patterns between different events
- Maintain awareness of ongoing investigations

## Tips for Effective Use

1. **Use Filters**: Narrow down results using status, event, and assignment filters
2. **Sort by Priority**: Sort by status or creation date to prioritize work
3. **Quick Assignment**: Use "Assign to Me" for rapid response to new incidents
4. **Status Progression**: Use quick status changes to keep reports moving through the workflow
5. **Regular Monitoring**: Check the "Assigned to me" filter regularly for your active cases

The Cross-Event Reports Dashboard streamlines incident management across multiple events, providing the tools needed for efficient oversight and response coordination. 
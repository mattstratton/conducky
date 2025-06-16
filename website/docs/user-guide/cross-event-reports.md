---
sidebar_position: 5
---

# Cross-Event Reports Dashboard

The Cross-Event Reports Dashboard (`/dashboard/reports`) provides a unified view of all reports across events you have access to. This feature is particularly useful for users who participate in multiple events with different roles.

## Overview

### What is the Cross-Event Reports Dashboard?

The Cross-Event Reports Dashboard allows you to:
- View reports from all events you belong to in one place
- Filter and search across multiple events simultaneously
- Perform actions on reports without switching event contexts
- Get a comprehensive overview of your report-related activities

### Who Can Access This Feature?

Any authenticated user who belongs to one or more events can access the cross-event reports dashboard. The reports you see depend on your role in each event:

- **Reporters**: See only your own reports across all events
- **Responders**: See all reports in events where you're a responder, plus your own reports in other events
- **Admins**: See all reports in events where you're an admin, plus role-appropriate reports in other events

## Accessing the Dashboard

### Navigation
1. Log into Conducky
2. From the global navigation, click "All Reports" or navigate to `/dashboard/reports`
3. The dashboard will load showing reports from all your accessible events

### Mobile Access
The dashboard is fully responsive and optimized for mobile devices:
- Tables automatically convert to card layouts on smaller screens
- Touch-friendly controls and navigation
- Optimized filtering interface for mobile

## Understanding the Interface

### Desktop View

#### Report Table
The desktop interface displays reports in a comprehensive table with columns for:
- **Title**: The report title (clickable to view details)
- **Event**: Which event the report belongs to
- **Status**: Current report state (submitted, acknowledged, investigating, resolved, closed)
- **Reporter**: Who submitted the report
- **Assigned To**: Current assignee (if any)
- **Date**: When the report was submitted
- **Actions**: Quick action buttons

#### Filtering Controls
Above the table, you'll find filtering options:
- **Search**: Text search across report titles and descriptions
- **Status Filter**: Filter by report status
- **Event Filter**: Show reports from specific events only
- **Assignment Filter**: Filter by assignment status

### Mobile View

#### Report Cards
On mobile devices, reports are displayed as cards containing:
- Report title and event name
- Status badge with color coding
- Reporter and assignee information
- Submission date
- Quick action buttons

#### Mobile Filtering
Mobile filtering is optimized with:
- Collapsible filter section
- Touch-friendly dropdown menus
- Clear filter indicators

## Filtering and Search

### Search Functionality
The search feature allows you to find reports by:
- **Report Title**: Partial matches in report titles
- **Description Content**: Text within report descriptions
- **Reporter Name**: Name of the person who submitted the report

#### Search Tips
- Search is case-insensitive
- Partial matches are supported
- Use specific keywords for better results
- Clear the search field to see all reports

### Status Filtering
Filter reports by their current status:
- **All Statuses**: Show reports in any state (default)
- **Submitted**: Newly submitted reports awaiting acknowledgment
- **Acknowledged**: Reports that have been acknowledged by responders
- **Investigating**: Reports currently under investigation
- **Resolved**: Reports that have been resolved
- **Closed**: Completed reports that are closed

### Event Filtering
When you belong to multiple events, you can filter by specific events:
- **All Events**: Show reports from all accessible events (default)
- **Specific Event**: Select a particular event to focus on
- Event names are displayed clearly in the filter dropdown

### Assignment Filtering
Filter reports based on assignment status:
- **All Assignments**: Show all reports regardless of assignment
- **Assigned to Me**: Show only reports assigned to you (responders/admins)
- **Unassigned**: Show reports that haven't been assigned to anyone
- **Assigned to Others**: Show reports assigned to other team members

## Pagination and Navigation

### Pagination Controls
The dashboard includes pagination when you have many reports:
- **Page Numbers**: Navigate to specific pages
- **Previous/Next**: Move through pages sequentially
- **Items Per Page**: Choose how many reports to display (10, 25, 50)
- **Total Count**: See the total number of matching reports

### Performance Optimization
- Reports are loaded efficiently with pagination
- Filters are applied server-side for fast performance
- Loading states provide feedback during data fetching

## Report Actions

### Available Actions
Depending on your role and the report status, you may see action buttons for:

#### For All Users
- **View Details**: Open the full report details page
- **View Event**: Navigate to the event context for this report

#### For Responders and Admins
- **Assign to Me**: Take ownership of an unassigned report
- **Change Status**: Update the report status (following allowed transitions)
- **Add Comment**: Quickly add a comment to the report

### Action Permissions
Actions are only available when you have the appropriate permissions:
- **Role-based**: Actions depend on your role in the specific event
- **Status-based**: Some actions are only available for certain report statuses
- **Assignment-based**: Some actions require the report to be assigned to you

## Role-Based Access Control

### Reporter Access
As a reporter, you can:
- View your own reports across all events
- See basic information about reports you submitted
- Access report details for your reports
- Submit new reports (via event-specific pages)

### Responder Access
As a responder, you can:
- View all reports in events where you're a responder
- See your own reports in events where you're only a reporter
- Assign reports to yourself or other responders
- Update report statuses and add comments
- Access full report management features

### Admin Access
As an admin, you can:
- View all reports in events where you're an admin
- See role-appropriate reports in other events
- Perform all report management actions
- Assign reports to any team member
- Access comprehensive report details and history

## Data Privacy and Security

### Event Data Isolation
- Reports are strictly isolated by event
- You can only see reports from events you belong to
- Your role in each event determines what you can see and do
- SuperAdmins cannot see event reports unless they have explicit event roles

### Sensitive Information
- Internal comments are only visible to responders and admins
- Evidence files require appropriate permissions to access
- Reporter contact information is protected based on event settings

## Performance and Loading

### Efficient Loading
The dashboard is optimized for performance:
- **Lazy Loading**: Reports load as needed
- **Caching**: Frequently accessed data is cached
- **Pagination**: Large datasets are paginated for faster loading
- **Progressive Enhancement**: Basic functionality works even with slow connections

### Loading States
Clear feedback is provided during data operations:
- **Initial Load**: Skeleton loading animation
- **Filter Changes**: Loading indicators during filtering
- **Action Feedback**: Success/error messages for actions
- **Error Handling**: Clear error messages with recovery options

## Best Practices

### Effective Use
- **Regular Monitoring**: Check the dashboard regularly for new reports
- **Use Filters**: Leverage filtering to focus on relevant reports
- **Quick Actions**: Use the dashboard for quick status updates and assignments
- **Event Context**: Switch to event-specific views for detailed work

### Organization Tips
- **Bookmark Filters**: Use browser bookmarks for frequently used filter combinations
- **Mobile Workflow**: Use mobile access for quick checks and updates
- **Batch Processing**: Handle similar reports together for efficiency

## Troubleshooting

### Common Issues

#### No Reports Showing
- **Check Filters**: Ensure filters aren't too restrictive
- **Verify Event Membership**: Confirm you belong to events with reports
- **Role Permissions**: Verify you have appropriate roles to see reports

#### Slow Loading
- **Network Connection**: Check your internet connection
- **Large Datasets**: Consider using more specific filters
- **Browser Performance**: Try refreshing the page or clearing cache

#### Actions Not Available
- **Permission Check**: Verify you have the required role in the event
- **Report Status**: Some actions are only available for certain statuses
- **Assignment Requirements**: Some actions require the report to be assigned to you

### Getting Help
If you encounter issues:
1. Check your role permissions in each event
2. Verify your network connection
3. Try refreshing the page
4. Contact your event administrators for role-related issues
5. Contact system administrators for technical problems

## Future Enhancements

### Planned Features
- **Export Functionality**: Export filtered report lists
- **Bulk Actions**: Perform actions on multiple reports simultaneously
- **Advanced Filtering**: More sophisticated filtering options
- **Real-time Updates**: Live updates when reports change
- **Notification Integration**: Alerts for reports requiring attention

The Cross-Event Reports Dashboard provides a powerful way to manage reports across multiple events efficiently. Use the filtering and search capabilities to focus on the reports that matter most to you, and take advantage of the role-based permissions to perform appropriate actions quickly. 
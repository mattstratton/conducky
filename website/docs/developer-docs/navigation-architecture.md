---
sidebar_position: 6
---

# Navigation Architecture

This document describes the technical implementation of Conducky's three-level navigation architecture, including the context-aware sidebar, role-based filtering, and URL routing patterns.

## Overview

Conducky implements a sophisticated navigation system that adapts based on:
- **User authentication state**
- **Current URL context** (global, event, or system admin)
- **User roles** (both system-level and event-specific)
- **Device type** (mobile vs desktop responsiveness)

## Architecture Components

### Core Navigation Components

#### `AppSidebar` (`frontend/components/app-sidebar.tsx`)
The main navigation component that orchestrates the entire navigation experience.

**Key Features**:
- **Context detection**: Automatically detects current context from URL
- **Role-based filtering**: Shows only navigation items user has permission to access
- **Event switching**: Provides event switcher when user belongs to multiple events
- **Responsive design**: Adapts to mobile and desktop layouts

**Context Detection Logic**:
```typescript
// Determine current context based on URL
const isSystemAdmin = router.asPath.startsWith('/admin');
const isEventContext = router.asPath.startsWith('/events/');

// Get current event slug if in event context
const currentEventSlug = isEventContext 
  ? (router.query.eventSlug as string) || router.asPath.split('/')[2] 
  : null;
```

#### `NavMain` (`frontend/components/nav-main.tsx`)
Renders the main navigation items with support for:
- **Hierarchical navigation**: Main items with sub-items
- **Active state management**: Highlights current page
- **Icon support**: Lucide icons for visual clarity
- **Next.js Link integration**: Proper client-side routing

#### `NavUser` (`frontend/components/nav-user.tsx`)
User menu component providing:
- **Profile access**: User profile and settings
- **Theme switching**: Dark/light mode toggle
- **System admin access**: For SuperAdmins
- **Logout functionality**: Secure session termination

#### `NavEvents` (`frontend/components/nav-projects.tsx`)
Event switcher component that:
- **Lists user events**: Shows all events user belongs to
- **Role indication**: Displays user's role in each event
- **Quick switching**: Allows rapid context switching
- **Recent events**: Prioritizes recently accessed events

### Navigation Contexts

#### 1. Global Dashboard Context
**URL Pattern**: `/dashboard*`, `/profile*`
**Purpose**: Multi-event overview and user management

**Navigation Structure**:
```typescript
globalNav = [
  {
    title: "Home",
    url: "/dashboard",
    icon: Home,
    isActive: router.asPath === "/dashboard",
  },
  {
    title: "All Reports",
    url: "/dashboard/reports",
    icon: ClipboardList,
  },
  {
    title: "Notifications",
    url: "/dashboard/notifications",
    icon: BookOpen,
  },
];
```

#### 2. Event Context
**URL Pattern**: `/events/[eventSlug]/*`
**Purpose**: Event-specific functionality with role-based access

**Role-Based Navigation**:
```typescript
// Get user's role for the current event
const currentEvent = events.find(e => e.url.includes(currentEventSlug));
const userEventRole = currentEvent?.role;

// Check role permissions
const isEventAdmin = userEventRole === 'Admin' || isSuperAdmin;
const isEventResponder = userEventRole === 'Responder' || isEventAdmin;

// Build navigation based on permissions
if (isEventResponder) {
  eventNav.push({
    title: "Reports",
    url: `/events/${currentEventSlug}/reports`,
    icon: ClipboardList,
    items: [
      { title: "All Reports", url: `/events/${currentEventSlug}/reports` },
      { title: "Submit Report", url: `/events/${currentEventSlug}/reports/new` },
    ],
  });
}
```

#### 3. System Admin Context
**URL Pattern**: `/admin/*`
**Purpose**: Installation management (SuperAdmins only)

**Access Control**:
```typescript
// Only show system admin navigation to SuperAdmins
if (isSuperAdmin && isSystemAdmin) {
  navMain = [
    {
      title: "System Dashboard",
      url: "/admin/dashboard",
      icon: Home,
    },
    {
      title: "Events Management",
      url: "/admin/events",
      icon: ClipboardList,
      items: [
        { title: "All Events", url: "/admin/events" },
        { title: "Create Event", url: "/admin/events/new" },
      ],
    },
    // ... more system admin items
  ];
}
```

## URL Routing Strategy

### URL Structure Patterns

#### Global URLs
- `/dashboard` - Multi-event dashboard
- `/dashboard/reports` - Cross-event reports
- `/dashboard/notifications` - Global notifications
- `/profile` - User profile
- `/profile/settings` - User settings

#### Event URLs
- `/events/[eventSlug]/` - Public event page (no authentication required)
- `/events/[eventSlug]/dashboard` - Event dashboard
- `/events/[eventSlug]/reports` - Event reports (role-scoped)
- `/events/[eventSlug]/reports/new` - Submit report
- `/events/[eventSlug]/reports/[reportId]` - Report details
- `/events/[eventSlug]/team` - Team management
- `/events/[eventSlug]/settings` - Event settings
- `/events/[eventSlug]/code-of-conduct` - Public code of conduct page

#### System Admin URLs
- `/admin/dashboard` - System overview
- `/admin/events` - Event management
- `/admin/events/new` - Create event
- `/admin/system/settings` - System configuration

### Route Protection

#### Authentication Middleware
All protected routes check authentication status:

```typescript
// In _app.tsx
useEffect(() => {
  fetch('/api/session')
    .then(res => res.json())
    .then(data => {
      if (data.user) {
        setUser(data.user);
      } else {
        // Redirect to login for protected routes
        if (router.asPath !== '/login' && !isPublicRoute(router.asPath)) {
          router.push('/login');
        }
      }
    });
}, [router.asPath]);
```

#### Role-Based Access Control
Event pages verify user has appropriate role:

```typescript
// In event pages
useEffect(() => {
  if (user && eventSlug) {
    // Check if user has role in this event
    const hasEventRole = user.events?.some(e => e.slug === eventSlug);
    if (!hasEventRole) {
      router.push('/dashboard'); // Redirect to global dashboard
    }
  }
}, [user, eventSlug]);
```

## Mobile Responsiveness

### Responsive Sidebar
The sidebar adapts to different screen sizes:

```typescript
// Sidebar configuration
<Sidebar 
  collapsible="icon" 
  className="border-r border-border/40 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60"
>
  {/* Sidebar content adapts based on screen size */}
</Sidebar>
```

### Touch Optimization
- **Minimum touch targets**: 44px for all interactive elements
- **Swipe gestures**: Sidebar can be opened/closed with swipe
- **Responsive spacing**: Padding and margins adjust for mobile
- **Collapsible navigation**: Sub-items collapse on mobile for space

## Performance Optimizations

### Lazy Loading
Navigation data is loaded efficiently:

```typescript
// Only load event data when needed
const [events, setEvents] = useState([]);

useEffect(() => {
  if (user && !events.length) {
    fetchUserEvents().then(setEvents);
  }
}, [user]);
```

### Memoization
Navigation components use React.memo for performance:

```typescript
export const NavMain = React.memo(({ items }) => {
  // Component implementation
});
```

### Router Optimization
Next.js router is used efficiently:

```typescript
// Wait for router to be ready to avoid hydration issues
if (!router.isReady) {
  return <LoadingSidebar />;
}
```

## Event Switching Implementation

### Event Switcher Logic
The event switcher provides seamless context switching:

```typescript
const handleEventSwitch = (eventSlug: string) => {
  // Preserve current page type when switching events
  const currentPageType = getCurrentPageType(router.asPath);
  const newPath = `/events/${eventSlug}/${currentPageType}`;
  router.push(newPath);
};

const getCurrentPageType = (path: string) => {
  if (path.includes('/reports')) return 'reports';
  if (path.includes('/team')) return 'team';
  if (path.includes('/settings')) return 'settings';
  return 'dashboard'; // default
};
```

### Context Preservation
When switching events, the system attempts to preserve the user's current context:
- Dashboard → Dashboard
- Reports → Reports
- Settings → Settings (if user has admin access)

## Error Handling

### Navigation Error States
The navigation system handles various error conditions:

```typescript
// Handle missing event access
if (isEventContext && currentEventSlug && !hasEventAccess) {
  return (
    <div className="p-4 text-muted-foreground">
      <p>You don't have access to this event.</p>
      <Button onClick={() => router.push('/dashboard')}>
        Return to Dashboard
      </Button>
    </div>
  );
}
```

### Fallback Navigation
If navigation data fails to load:
- Show basic navigation structure
- Provide manual navigation options
- Display appropriate error messages

## Testing Navigation

### Unit Tests
Navigation components should be tested for:
- **Role-based rendering**: Correct items shown for each role
- **Context switching**: Proper navigation updates
- **Event switching**: Correct URL generation
- **Error handling**: Graceful degradation

### Integration Tests
Full navigation flows should be tested:
- **Login → Dashboard flow**
- **Event switching flow**
- **Role-based access control**
- **Mobile navigation behavior**

### Example Test
```typescript
describe('AppSidebar', () => {
  it('shows event navigation when in event context', () => {
    const mockRouter = {
      asPath: '/events/test-event/dashboard',
      query: { eventSlug: 'test-event' },
      isReady: true,
    };
    
    render(
      <AppSidebar 
        user={mockUser} 
        events={mockEvents} 
        router={mockRouter}
      />
    );
    
    expect(screen.getByText('Event Dashboard')).toBeInTheDocument();
    expect(screen.getByText('Reports')).toBeInTheDocument();
  });
});
```

## Future Enhancements

### Planned Improvements
- **Breadcrumb navigation**: Show current location hierarchy
- **Recent pages**: Quick access to recently visited pages
- **Keyboard shortcuts**: Keyboard navigation support
- **Search integration**: Global search from navigation
- **Notification badges**: Show unread counts in navigation

### Extensibility
The navigation architecture is designed to be extensible:
- **Plugin system**: Future plugins can add navigation items
- **Custom contexts**: New contexts can be added easily
- **Role extensions**: New roles can be integrated
- **Theme customization**: Navigation appearance can be customized

This architecture provides a solid foundation for Conducky's navigation needs while remaining flexible for future enhancements. 
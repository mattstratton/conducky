# Global Dashboard Design - Mobile-First

## Overview
The global dashboard (`/dashboard`) serves as the landing page for users with multiple events, providing role-based overviews and quick access to high-priority actions across all their events.

## Mobile Layout (Primary Design)

### 📱 Full Mobile Dashboard
```
┌─────────────────────────┐
│ 🦆 Conducky    👤 [TA] │ ← Header with user avatar
│ 🔔 2 new notifications  │ ← Notification banner (if any)
├─────────────────────────┤
│ 👋 Hi, turbo admin!     │
│ You're active in 3 events │
├─────────────────────────┤
│ 📊 Quick Stats          │
│ • 🎯 3 Events           │
│ • 📝 5 Reports          │
│ • ⚡ 2 Need Response    │
├─────────────────────────┤
│ 🎯 Your Events          │
│                         │
│ ┌─────────────────────┐ │
│ │ 🤖 TurboBotBot      │ │ ← Admin role card
│ │ Admin • 3 reports   │ │
│ │ ⚠️ 2 need attention │ │
│ │ [Enter Event] [Admin]│ │
│ └─────────────────────┘ │
│                         │
│ ┌─────────────────────┐ │
│ │ 🎪 DevConf 2024     │ │ ← Responder role card
│ │ Responder • 1 assigned│
│ │ 📅 Ends in 5 days   │ │
│ │ [Enter Event] [Reports]│
│ └─────────────────────┘ │
│                         │
│ ┌─────────────────────┐ │
│ │ 🐍 PyData Chicago   │ │ ← Reporter role card
│ │ Reporter • 2 submitted│
│ │ ✅ All resolved     │ │
│ │ [Enter Event] [My Reports]│
│ └─────────────────────┘ │
├─────────────────────────┤
│ 📋 Recent Activity     │
│ • 🟡 New report in DevConf│
│ • ✅ Resolved TurboBotBot │
│ • 📩 Invite to PyCon    │
│ [View All Activity]     │
├─────────────────────────┤
│ ➕ Join Event           │
│ Enter invite code or    │
│ browse open events      │
├─────────────────────────┤
│ 🏠 📊 👥 ⚙️ 🌙        │ ← Bottom navigation
└─────────────────────────┘
```

## Role-Based Event Cards

### 🔐 Admin Role Card
```
┌─────────────────────┐
│ 🤖 TurboBotBot      │ ← Event emoji + name
│ Admin               │ ← Role badge
│ ┌─────────────────┐ │
│ │ 📊 Overview     │ │
│ │ • 3 reports     │ │
│ │ • 2 need action │ │
│ │ • 8 team members│ │
│ └─────────────────┘ │
│ [Enter Event] [Admin]│ ← Quick actions
└─────────────────────┘
```

### 🛡️ Responder Role Card
```
┌─────────────────────┐
│ 🎪 DevConf 2024     │
│ Responder           │
│ ┌─────────────────┐ │
│ │ 📋 My Work      │ │
│ │ • 1 assigned    │ │
│ │ • 0 overdue     │ │
│ │ • 3 total reports│ │
│ └─────────────────┘ │
│ [Enter Event] [My Cases]│
└─────────────────────┘
```

### 📝 Reporter Role Card
```
┌─────────────────────┐
│ 🐍 PyData Chicago   │
│ Reporter            │
│ ┌─────────────────┐ │
│ │ 📄 My Reports   │ │
│ │ • 2 submitted   │ │
│ │ • All resolved  │ │
│ │ • Last: 5 days ago│
│ └─────────────────┘ │
│ [Enter Event] [Submit Report]│
└─────────────────────┘
```

## Desktop Layout (Responsive Enhancement)

### 🖥️ Desktop Dashboard (≥768px)
```
┌─────────────────────────────────────────────────────────────┐
│ 🦆 Conducky              🔔 Notifications    👤 turbo admin │
├─────────────────────────────────────────────────────────────┤
│ 👋 Hi, turbo admin! You're active in 3 events              │
├──────────────────┬──────────────────┬──────────────────────┤
│ 📊 Quick Stats   │ 🎯 Events (3)    │ 📋 Recent Activity  │
│ • 🎯 3 Events    │ ┌──────────────┐ │ • New report DevConf │
│ • 📝 5 Reports   │ │🤖 TurboBotBot│ │ • Resolved Turbo     │
│ • ⚡ 2 Need Resp │ │Admin • 3 rpts│ │ • Invite to PyCon    │
│                  │ │[Enter][Admin]│ │ [View All]           │
│                  │ └──────────────┘ │                      │
│                  │ ┌──────────────┐ │                      │
│                  │ │🎪 DevConf    │ │                      │
│                  │ │Responder • 1 │ │                      │
│                  │ │[Enter][Cases]│ │                      │
│                  │ └──────────────┘ │                      │
├──────────────────┴──────────────────┴──────────────────────┤
│ ➕ Join Event: [Enter Code] or [Browse Open Events]        │
└─────────────────────────────────────────────────────────────┘
```

## State-Based Variations

### 🆕 First-Time User (No Events)
```
┌─────────────────────────┐
│ 👋 Welcome to Conducky! │
├─────────────────────────┤
│ 📧 No events yet        │
│                         │
│ Check your email for    │
│ event invitations, or   │
│ ask an event organizer  │
│ to add you.             │
├─────────────────────────┤
│ ➕ Join Event           │
│ [Enter Invite Code]     │
│                         │
│ 🔍 Browse Open Events   │
│ [Coming Soon]           │
├─────────────────────────┤
│ 💡 Learn More           │
│ [About Conducky]        │
│ [Code of Conduct Guide] │
└─────────────────────────┘
```

### ⭐ Single Event User (Auto-Redirect)
```
User has only one event → Automatically redirect to:
/events/[eventSlug]/dashboard

With breadcrumb showing:
Home > TurboBotBot
```

### 🔧 SuperAdmin Landing
```
SuperAdmin login → /admin/dashboard (System Admin)

With clear context switching:
┌─────────────────────────┐
│ 🦆 Conducky [System] ▼ │ ← Context switcher
│ • System Admin          │
│ • My Personal Dashboard │
│ • ─────────────────     │
│ • Profile Settings      │
│ • Logout                │
└─────────────────────────┘
```

## Interaction Patterns

### 📱 Mobile Gestures
- **Swipe left/right** on event cards for quick actions
- **Pull down** to refresh dashboard data
- **Long press** event card for context menu
- **Tap and hold** for bulk selection (future)

### ⚡ Quick Actions
- **Enter Event**: Go to event dashboard
- **Role-specific**: Admin panel, My Reports, Submit Report
- **One-tap**: Most common action for each role

### 🔔 Smart Notifications
- **Urgent**: Reports needing immediate response
- **Updates**: Status changes on user's reports
- **Invites**: New event invitations
- **Reminders**: Overdue assignments

## Data Loading Strategy

### 🚀 Performance
- **Critical data first**: User's events and roles
- **Lazy load**: Activity feed, detailed stats
- **Cache**: Event metadata, user preferences
- **Real-time**: Notification counts, urgent alerts

### 🔄 Refresh Strategy
- **Auto-refresh**: Every 5 minutes for active users
- **Pull-to-refresh**: Manual refresh on mobile
- **Live updates**: WebSocket for real-time notifications
- **Background sync**: Update when returning to tab

## Accessibility & Usability

### ♿ Accessibility
- **Screen reader**: Proper headings, ARIA labels
- **Keyboard nav**: Tab order, focus indicators
- **Color contrast**: WCAG AA compliance
- **Touch targets**: 44px minimum for mobile

### 📊 Progressive Enhancement
- **Core functionality**: Works without JavaScript
- **Enhanced experience**: Animations, real-time updates
- **Offline support**: Cache critical data
- **Error states**: Clear fallbacks and retry options

## Component Architecture

### 🧩 Dashboard Components
- `GlobalDashboard` (main container)
- `EventCard` (role-aware event preview)
- `QuickStats` (overview metrics)
- `ActivityFeed` (recent cross-event activity)
- `JoinEventWidget` (invite codes, open registration)

### 🎨 Shared Components
- `UserHeader` (avatar, notifications, context switcher)
- `EmptyState` (first-time user, no events)
- `LoadingState` (skeleton screens)
- `ErrorBoundary` (graceful error handling)

This design prioritizes mobile-first experience for reporters and responders while providing comprehensive oversight for admins across multiple events.
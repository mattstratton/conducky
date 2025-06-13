# Conducky Sitemap & UI Structure (Multi-Event User Experience)

## Navigation Architecture

### Three-Level Navigation Pattern
1. **System Level**: SuperAdmin managing the entire installation
2. **Global Level**: User's cross-event dashboard and profile  
3. **Event Level**: Event-specific functionality with event context

### Context-Aware Navigation
- **System Admin**: Manage installation, all events, system settings
- **Global Dashboard**: Shows all user's events with role-based previews
- **Event Context**: Event-specific functionality with event context switcher
- **Mobile-First**: Bottom Tab Bar (mobile) / Sidebar (desktop) adapts to current context

## Complete Sitemap

### 🏠 Public/Unauthenticated Pages
```
/
├── /login
├── /register
├── /forgot-password
├── /reset-password
├── /invite/[token] (accept invite to event)
└── /[eventSlug]/report (anonymous reporting - future)
```

### 🎯 Global User Dashboard (authenticated)
```
/dashboard
├── index (multi-event overview)
├── reports (all reports across events)
└── notifications (future)
```

### 📊 Event-Scoped Pages (all require event role)
```
/events/[eventSlug]/
├── dashboard (event-specific home)
├── reports/
│   ├── index (reports list - role-based scope)
│   │   • Reporter: Only their own reports
│   │   • Responder: All reports (can be assigned)
│   │   • Admin: All reports (full management)
│   ├── new (submit new report)
│   └── [reportId]/
│       ├── index (report detail)
│       └── comments (if we want separate comments view)
├── team/ (admin/responder only)
│   ├── index (team member list)
│   ├── invite (send invites)
│   └── [userId] (user profile/role management)
└── settings/ (admin only)
    ├── index (event details, logo, etc.)
    ├── code-of-conduct (edit CoC)
    └── notifications (future)
```

### 🔧 System Admin Pages (SuperAdmin only)
```
/admin/
├── dashboard (system overview - stats, health, etc.)
├── events/
│   ├── index (all events table - CURRENT SCREENSHOT)
│   ├── new (create new event form)
│   ├── [eventId]/
│   │   ├── edit (edit event details)
│   │   ├── settings (system-level configuration)
│   │   └── users (view event users - future)
│   └── disabled (list of disabled events)
├── system/
│   ├── settings (future - email config, etc.)
│   ├── backups (future)
│   └── logs (future)
└── users/ (future - global user management)
```

### 👤 Profile Pages
```
/profile/
├── index (user profile, avatar)
├── settings (preferences, notifications)
└── events (list of events user belongs to with role management)
```

## Landing Page Strategy (Mobile-First)

### Login Flow by User Type
1. **First-time users** → Global Dashboard (shows "No events yet, check your email for invites")
2. **Users with 1 event** → That event's dashboard (direct to context)
3. **Users with multiple events** → Global Dashboard (shows all events)
4. **SuperAdmin** → System Admin Dashboard (`/admin/dashboard`)

### Event Discovery & Access
- **Default**: Invite-only (current system)
- **Future**: Event setting for "Open Registration" vs "Invite Only"
- **Guest/Anonymous**: Future anonymous reporting via `/[eventSlug]/report`

## Mobile-First Design Priorities

### 🎯 **Critical Mobile Users**
- **Reporters**: Need easy, stress-free report submission
- **Responders**: Need quick incident triage and response
- **Admins**: Need oversight and team management

### 📱 **Mobile Navigation Pattern**
- **Bottom Tab Bar** for primary actions (Submit, Reports, Team, Settings)
- **Top Header** for context (event name, user menu, notifications)
- **Floating Action Button** for primary action (Submit Report)
- **Pull-to-refresh** and **swipe gestures** for common actions

#### Desktop Layout (Current)
```
┌─────────────────────────────────────────────────────────────────┐
│ Create New Event                                                │
│ Name: [________________] Slug: [________________] [Create Event] │
├─────────────────────────────────────────────────────────────────┤
│ All Events                                                      │
│ ┌─────┬──────────┬─────────────┬─────────────┬──────────────────┐ │
│ │Name │   Slug   │ Created At  │ Updated At  │    Actions       │ │
│ ├─────┼──────────┼─────────────┼─────────────┼──────────────────┤ │
│ │Event│ slug     │ 6/13/2025   │ 6/13/2025   │[Edit][Delete]    │ │
│ │     │          │             │             │[View][Admin]     │ │
│ │     │          │             │             │[Enable/Disable] │ │
│ └─────┴──────────┴─────────────┴─────────────┴──────────────────┘ │
└─────────────────────────────────────────────────────────────────┘
```

### Global Dashboard Design (`/dashboard`)

### SuperAdmin Experience
SuperAdmins have **dual access** - they can:
1. Use `/admin/` for system management 
2. Access `/dashboard` for their personal event participation
3. Header should show current context clearly

### Navigation Header for SuperAdmin
```
┌─────────────────────────────────────────────────┐
│ Conducky 🦆 [System Admin] ▼                   │ <- Context switcher
│ • System Admin Dashboard                        │
│ • My Personal Dashboard                         │  
│ • ─────────────────────                        │
│ • Profile Settings                              │
│ • Logout                                        │
└─────────────────────────────────────────────────┘
```

### Regular User Mobile Layout (Responsive Enhancement)
```
┌─────────────────────────┐
│ ➕ Create New Event     │
├─────────────────────────┤
│ 🔍 Search Events        │
│ [All] [Active] [Disabled] │ <- Filter chips
├─────────────────────────┤
│ ┌─────────────────────┐ │
│ │ 🎯 FakeConf Chicago │ │
│ │ fake-con            │ │  <- Event card format
│ │ ✅ Active • 12 users│ │
│ │ [Edit] [View] [⋮]   │ │
│ └─────────────────────┘ │
│ ┌─────────────────────┐ │
│ │ 🚫 TechFest (Disabled)│
│ │ techfest            │ │
│ │ ⏸️ Disabled • 5 users│
│ │ [Edit] [Enable] [⋮] │ │
│ └─────────────────────┘ │
└─────────────────────────┘
```

### Enhanced Actions for Events
- **Enable/Disable Toggle**: Replace delete with disable for safety
- **Quick Stats**: Show user count, report count in list
- **Status Indicators**: Visual badges for active/disabled
- **Bulk Actions**: Future - select multiple events for bulk disable/enable
```
┌─────────────────────────┐
│  👤 Hi, [Name]          │
│  📱 Event Switcher ▼    │
├─────────────────────────┤
│  📊 Quick Stats         │
│  • 3 Active Events      │
│  • 2 Pending Reports    │
│  • 1 Requires Response  │
├─────────────────────────┤
│  🎯 My Events           │
│  ┌─────────────────────┐ │
│  │ DevConf 2024        │ │
│  │ Admin • 12 reports  │ │
│  │ [View] [Quick Add]  │ │
│  └─────────────────────┘ │
│  ┌─────────────────────┐ │
│  │ PyData Chicago      │ │
│  │ Responder • 3 new   │ │
│  │ [View] [Respond]    │ │
│  └─────────────────────┘ │
├─────────────────────────┤
│  📋 Recent Activity     │
│  • New report in DevConf│
│  • Update from PyData   │
├─────────────────────────┤
│ 🏠 📊 📝 👥 ⚙️         │ (bottom nav)
└─────────────────────────┘
```

### Event Cards Show Role-Based Information

#### As Admin
- Event overview stats
- Pending admin actions
- Quick links: [Manage Team] [View All Reports] [Settings]

#### As Responder  
- Assigned reports count
- Urgent/overdue reports
- Quick links: [My Reports] [Submit Report] [View Team]

#### As Reporter
- Personal report status
- Event updates/announcements
- Quick links: [Submit Report] [My Reports] [Code of Conduct]

## Navigation Patterns by Context

### SuperAdmin System Navigation (Bottom Tabs/Sidebar)
- 🏠 **System Dashboard** (installation overview, stats)
- 🎯 **All Events** (create, edit, enable/disable events)
- ⚙️ **System Settings** (future - email, backups, etc.)
- 👤 **My Profile** (can still access personal dashboard)

### Global Navigation (Bottom Tabs/Sidebar)
- 🏠 **Dashboard** (multi-event overview)
- 📊 **All Reports** (cross-event report view)
- 📝 **Quick Submit** (choose event, then submit)
- 👥 **My Events** (event list with role management)
- ⚙️ **Profile**

### Event Context Navigation
When user enters `/events/[eventSlug]/`, navigation adapts:

```
┌─────────────────────────┐
│ ← DevConf 2024 (Admin)  │ <- Event context header
│ Event Switcher ▼        │
├─────────────────────────┤
│ Event-specific content  │
│                         │
├─────────────────────────┤
│ 🏠 📋 📝 👥 ⚙️         │ <- Context-aware nav
└─────────────────────────┘
```

#### Event Navigation Items (role-based)
**Reporter in Event:**
- 🏠 Event Home
- 📝 Submit Report  
- 📋 My Reports
- 👥 Team (view only)

**Responder in Event:**
- 🏠 Dashboard
- 📋 All Reports
- 📝 Submit Report
- 👥 Team

**Admin in Event:**
- 🏠 Dashboard  
- 📋 Reports
- 👥 Team Management
- ⚙️ Event Settings

## Event Context Switcher

### Mobile: Dropdown in Header
```
DevConf 2024 (Admin) ▼
├── PyData Chicago (Responder)
├── RustConf (Reporter)
├── ── ── ── ── ── ──
├── 🏠 Back to Dashboard
└── ➕ Join Event
```

### Desktop: Sidebar Section
```
MY EVENTS
• DevConf 2024 (Admin) ← current
• PyData Chicago (Responder)  
• RustConf (Reporter)
─────────────────
🏠 Global Dashboard
➕ Join Event
```

## Current Implementation Analysis (Based on Screenshots)

### What's Working Well ✅
- **Event Context Navigation**: Clear event name ("TurboBotBot") in header
- **Role-Based UI**: Different navigation for different roles (Admin vs Reporter)
- **Comprehensive Admin Panel**: Event metadata editing, user management, invites
- **Report Management**: List view, detailed view, comments, evidence upload
- **Clean UI**: Good use of cards, consistent styling, dark theme

### Missing from Current vs Sitemap 🔄

#### 1. Global Multi-Event Dashboard
**Current**: Users land directly in event context
**Needed**: `/dashboard` showing all user's events with role-based previews

#### 2. Event Context Switching
**Current**: "My Events" dropdown in header (good!)
**Enhancement**: More prominent context switching within app

#### 3. SuperAdmin System View
**Current**: SuperAdmin has same interface as event admin
**Needed**: Separate `/admin/` system management interface

#### 4. Cross-Event Features
**Current**: All features are event-scoped (which is good!)
**Opportunity**: Cross-event report viewing for users with multiple roles

## Recommended Implementation Priority

### Phase 1: Enhance Current Experience (High Impact, Low Effort)

#### A. Improve Event Context Navigation
```
Current Header: TurboBotBot | Submit Report | My Reports | Event Reports | Admin
Enhanced:       TurboBotBot ▼ | 🏠 Dashboard | 📝 Submit | 📋 My Reports | 👥 Reports | ⚙️ Admin
```

#### B. Add Breadcrumbs for Context Clarity
```
Home > TurboBotBot > Event Reports
Home > TurboBotBot > Admin > User Management
```

#### C. Mobile Responsiveness Improvements
- Convert admin tables to cards on mobile
- Optimize report submission form for mobile
- Add bottom navigation for mobile users

### Phase 2: Add Multi-Event Dashboard (Medium Effort)

#### A. Global Dashboard (`/dashboard`)
```
┌─────────────────────────┐
│ 👋 Hi, turbo admin      │
│ You have roles in 3 events │
├─────────────────────────┤
│ 🎯 TurboBotBot          │
│ Admin • 3 new reports   │
│ [View Event] [Quick Admin] │
├─────────────────────────┤
│ 🎯 DevConf 2024         │
│ Responder • 1 assigned  │
│ [View Event] [My Reports] │
├─────────────────────────┤
│ 📊 Recent Activity      │
│ • New report in TurboBotBot │
│ • Assignment in DevConf   │
└─────────────────────────┘
```

#### B. Enhanced Event Switching
- Prominent "Switch Event" in navigation
- Recently used events
- Quick actions per event based on role

### Phase 3: SuperAdmin System Management (Lower Priority)

#### A. Separate System Admin Interface
- `/admin/` for system-level management
- Event creation, system settings, global user management
- Context switching between system admin and personal dashboard

## Key User Flows (Updated Based on Screenshots)

### 1. Current User Experience
```
Login → Land in Event Context (TurboBotBot) → Navigate within event
     → Use "My Events" dropdown to switch events
```

### 2. Enhanced User Experience (Recommended)
```
Login → Global Dashboard → See all events with role-specific previews
     → Click event → Enter event context → Current experience
     → Easy event switching via prominent context switcher
```

### 3. Mobile User Experience
```
Login → Mobile dashboard with event cards
     → Tap event → Bottom tab navigation within event
     → Swipe or tap to switch between events
```
```
Login → Global Dashboard → See all events with role-specific previews
     → Click event → Enter event context → Event-specific navigation
```

### 2. Submit Report Flow
```
Option A: Global Dashboard → Quick Submit → Choose Event → Form
Option B: In Event Context → Submit Report → Form (event pre-selected)
```

### 3. Admin Managing Multiple Events
```
Global Dashboard → See admin overview across all events
                → Jump to specific event for detailed management
                → Event context switcher to move between events
```

### 4. Responder Checking Work
```
Global Dashboard → All Reports view (cross-event) → Filter by assigned to me
                → Or jump to specific event → Reports list
```

## Mobile-Specific Considerations

### Context Awareness
- **Clear visual indicators** when in event context vs global context
- **Easy escape hatch** back to global dashboard
- **Breadcrumb-style** navigation showing current context

### Performance
- **Lazy load** event data on global dashboard
- **Cache** frequently accessed events
- **Prefetch** likely next actions based on role

### Interaction Patterns
- **Swipe between events** on global dashboard cards
- **Pull-to-refresh** on global dashboard to update all events
- **Long press event cards** for quick actions menu

## Information Architecture Principles

### Context Hierarchy
1. **System Admin Context**: SuperAdmin managing installation
2. **Global User Context**: Cross-event overview and actions
3. **Event Context**: Deep event-specific functionality  
4. **Clear Transitions**: Visual and interaction cues when switching contexts

### URL Strategy
- `/admin/` = System admin context (SuperAdmin only)
- `/dashboard` = Global user context
- `/events/[slug]/` = Event context (all event URLs scoped)
- `/profile/events` = User's event role management

### Permission Strategy
- **System permissions**: SuperAdmin creates/manages events, NO access to event data
- **Event permissions**: Must be explicitly granted by event admins  
- **Data isolation**: SuperAdmins cannot see reports, users, or internal event data
- **Audit separation**: System actions vs event actions logged separately

### SuperAdmin Restrictions
- **Cannot see**: Event reports, event users, event comments, event evidence
- **Cannot access**: Event dashboards unless explicitly granted event role
- **Can manage**: Event creation, system settings, event enable/disable
- **Role separation**: SuperAdmin role is distinct from event-level roles

### Data Loading Strategy
- **Global dashboard**: Load summary data for all user's events
- **Event context**: Load full event data when entering event scope
- **Background updates**: Real-time updates for active reports/notifications

## Component Architecture

### System Admin Components
- `SystemDashboard` (installation overview, stats)
- `EventManagementTable` (create, edit, enable/disable events)
- `SystemSettings` (future - global configuration)
- `SystemContextSwitcher` (system admin ↔ personal dashboard)

### Global Components
- `GlobalDashboard` (multi-event overview)
- `EventSwitcher` (context switching)
- `EventCard` (role-aware event preview)
- `CrossEventReports` (reports across all events)

### Context-Aware Components  
- `AppShell` (handles global vs event context)
- `EventShell` (event-scoped layout)
- `ContextualNavigation` (changes based on current context)
- `RoleBasedEventActions` (different actions per role)

This structure now properly handles the multi-event user experience while maintaining clear context separation and role-based functionality.
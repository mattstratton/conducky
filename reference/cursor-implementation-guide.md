# Conducky Implementation Guide for Cursor

## Project Overview
Conducky is a code of conduct incident management system for conferences and events. This guide provides implementation details for AI-assisted development in Cursor.

## Current Tech Stack
- **Frontend**: Next.js 14 with React, TypeScript, Tailwind CSS, Shadcn/ui components
- **Backend**: Node.js with Express, TypeScript
- **Database**: PostgreSQL with Prisma ORM
- **Authentication**: JWT with refresh tokens, magic links, social login (future)
- **File Storage**: Database BLOBs (current), may migrate to cloud storage
- **Deployment**: Docker containers, docker-compose for local development

## Architecture Patterns

### Multi-Tenancy
- **Event-scoped**: All data isolated by event (tenant)
- **User roles per event**: Users can have different roles in different events
- **URL structure**: `/events/[eventSlug]/` for event-scoped pages
- **Database isolation**: Row-level security with event context

### User Roles & Permissions
```typescript
enum UserRole {
  SUPER_ADMIN = 'super_admin',  // System-level management only
  ADMIN = 'admin',              // Event administration
  RESPONDER = 'responder',      // Handle reports
  REPORTER = 'reporter'         // Submit reports
}
```

### Navigation Contexts
1. **System Admin** (`/admin/`) - SuperAdmin managing installation
2. **Global Dashboard** (`/dashboard`) - User's multi-event overview  
3. **Event Context** (`/events/[slug]/`) - Event-specific functionality

## Current Implementation Status

### ✅ Completed Features
- User authentication (email/password, magic links)
- Event creation and management
- User invites with role assignment
- Multi-tenancy with event scoping
- Report submission with evidence upload
- Report state management (submitted → acknowledged → investigating → resolved → closed)
- Comments system (internal/external visibility)
- Basic admin interface for event management
- Role-based access control
- Dark mode support
- Mobile-responsive tables (collapse to cards)

### 🔄 In Progress / Needs Enhancement
- Global multi-event dashboard
- Mobile-first navigation patterns
- SuperAdmin data isolation
- Cross-event user experience
- Advanced mobile optimizations

### 📋 Planned Features
- Email notifications
- Advanced reporting and analytics
- Anonymous reporting
- System-level audit logging
- External integrations

## Key Implementation Patterns

### File Structure
```
/frontend
  /components
    /ui (shadcn components)
    /shared (reusable app components)
  /pages or /app (Next.js routing)
  /lib (utilities, API clients)
  /hooks (React hooks)
/backend
  /routes (Express routes)
  /middleware (auth, RBAC, etc.)
  /models (Prisma schema)
  /services (business logic)
  /utils (helpers)
```

### API Patterns
- **Event-scoped endpoints**: `/api/events/:eventSlug/reports`
- **User-scoped endpoints**: `/api/users/me/events`
- **System endpoints**: `/api/admin/events` (SuperAdmin only)
- **Authentication**: JWT middleware on protected routes
- **Error handling**: Consistent error response format

### Database Patterns
```sql
-- Example of event scoping
WHERE event_id = $1 AND user_id = $2

-- Example of role checking
WHERE EXISTS (
  SELECT 1 FROM event_users 
  WHERE event_id = $1 AND user_id = $2 AND role IN ('admin', 'responder')
)
```

### Component Patterns
```typescript
// Role-based rendering
<RoleGuard roles={['admin', 'responder']}>
  <AdminInterface />
</RoleGuard>

// Event context
const { event, userRole } = useEventContext();

// Responsive design
<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
  {/* Cards on mobile, table on desktop */}
</div>
```

## Critical Implementation Details

### Mobile-First Design Requirements
- **Bottom navigation** for primary actions on mobile
- **Touch targets** minimum 44px
- **Card layouts** for mobile, table layouts for desktop
- **Swipe gestures** for common actions
- **Pull-to-refresh** on list views
- **Floating action buttons** for primary actions

### Security Requirements
- **SuperAdmin isolation**: Cannot access event data without explicit event role
- **Event data isolation**: Users only see events they belong to
- **Report privacy**: Internal comments only visible to responders/admins
- **File upload security**: Virus scanning, size limits, type validation
- **Audit logging**: Track all sensitive actions

### Performance Requirements
- **Mobile optimization**: Fast loading on 3G networks
- **Progressive loading**: Critical data first, lazy load secondary
- **Caching strategy**: Event metadata, user sessions
- **Real-time updates**: WebSocket for notifications (future)

## Current Database Schema (Key Tables)

### Users
```prisma
model User {
  id          String   @id @default(uuid())
  email       String   @unique
  name        String?
  avatar      UserAvatar?
  eventRoles  EventUser[]
  reports     Report[]
  comments    Comment[]
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt
}
```

### Events
```prisma
model Event {
  id          String   @id @default(uuid())
  name        String
  slug        String   @unique
  description String?
  logo        Bytes?
  startDate   DateTime?
  endDate     DateTime?
  website     String?
  contactEmail String?
  codeOfConduct String?
  users       EventUser[]
  reports     Report[]
  invites     EventInvite[]
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt
}
```

### Reports
```prisma
model Report {
  id          String   @id @default(uuid())
  title       String
  type        String
  description String
  state       ReportState @default(SUBMITTED)
  severity    String?
  resolution  String?
  incidentDate DateTime?
  partiesInvolved String?
  
  eventId     String
  event       Event    @relation(fields: [eventId], references: [id])
  reporterId  String
  reporter    User     @relation(fields: [reporterId], references: [id])
  assignedTo  String?
  assignee    User?    @relation("AssignedReports", fields: [assignedTo], references: [id])
  
  comments    Comment[]
  evidence    Evidence[]
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt
}
```

## UI Component Library (Shadcn/ui)

### Available Components
- Button, Input, Textarea, Select
- Card, Badge, Avatar
- Table, Dialog, Sheet (mobile drawer)
- Form components with validation
- Toast notifications
- Loading skeletons

### Custom Components Needed
- `EventCard` - Role-aware event preview
- `ReportCard` - Mobile-friendly report display
- `RoleGuard` - Permission-based rendering
- `EventContextProvider` - Event data context
- `MobileNavigation` - Bottom tab navigation
- `ResponsiveTable` - Auto-converts to cards on mobile

## API Endpoints Reference

### Authentication
- `POST /api/auth/login` - Email/password login
- `POST /api/auth/magic-link` - Send magic link
- `GET /api/auth/session` - Check current user
- `POST /api/auth/logout` - End session

### Global User
- `GET /api/users/me` - Current user profile
- `GET /api/users/me/events` - User's events with roles
- `PATCH /api/users/me` - Update profile
- `POST /api/users/me/avatar` - Upload avatar

### Event Management
- `GET /api/events/slug/:slug` - Event details
- `PATCH /api/events/slug/:slug` - Update event (admin only)
- `GET /api/events/slug/:slug/users` - Event team
- `POST /api/events/slug/:slug/invites` - Send invite

### Reports
- `GET /api/events/slug/:slug/reports` - List reports (role-based filtering)
  - **Reporter**: Only their own submitted reports
  - **Responder**: All reports in the event (for assignment/response)
  - **Admin**: All reports in the event (full management access)
- `POST /api/events/slug/:slug/reports` - Submit report
- `GET /api/events/slug/:slug/reports/:id` - Report details (role-based access)
- `PATCH /api/events/slug/:slug/reports/:id` - Update report (responder/admin only)
- `POST /api/events/slug/:slug/reports/:id/comments` - Add comment

### System Admin (SuperAdmin only)
- `GET /api/admin/events` - All events
- `POST /api/admin/events` - Create event
- `PATCH /api/admin/events/:id` - Update event
- `PATCH /api/admin/events/:id/status` - Enable/disable event

## Development Workflow

### Local Development
```bash
# Start all services
docker-compose up -d

# Install packages (always use docker-compose)
docker-compose exec frontend npm install <package>
docker-compose exec backend npm install <package>

# Database migrations
docker-compose exec backend npx prisma migrate dev

# View logs
docker-compose logs -f frontend
docker-compose logs -f backend
```

### Testing Strategy
- **Unit tests**: Jest for utilities and hooks
- **Integration tests**: API endpoint testing
- **E2E tests**: Playwright for critical user flows
- **Manual testing**: Mobile device testing required

### Code Quality
- **ESLint + Prettier**: Consistent formatting
- **TypeScript strict mode**: Type safety
- **Accessibility**: WCAG AA compliance
- **Performance**: Lighthouse scoring

## Common Implementation Patterns

### Error Handling
```typescript
// API error handling
try {
  const response = await api.post('/reports', data);
  toast.success('Report submitted');
} catch (error) {
  toast.error(error.message || 'Something went wrong');
}
```

### Loading States
```typescript
const [isLoading, setIsLoading] = useState(false);

// Use loading skeletons, not spinners
{isLoading ? <ReportSkeleton /> : <ReportList reports={reports} />}
```

### Mobile Responsive
```tsx
// Mobile-first responsive design
<div className="block md:hidden">
  <ReportCards reports={reports} />
</div>
<div className="hidden md:block">
  <ReportsTable reports={reports} />
</div>
```

### Role-Based Rendering
```typescript
const canEdit = userRole === 'admin' || userRole === 'responder';
const canDelete = userRole === 'admin';

return (
  <>
    {canEdit && <EditButton />}
    {canDelete && <DeleteButton />}
  </>
);
```

## Key Files to Reference
- `/backend/prisma/schema.prisma` - Database schema
- `/frontend/lib/api.ts` - API client configuration
- `/frontend/components/ui/` - Shadcn components
- `/backend/middleware/auth.js` - Authentication middleware
- `/backend/middleware/rbac.js` - Role-based access control

## Implementation Priorities

### Phase 1: Global Dashboard (High Priority)
1. Create `/dashboard` route and page
2. Implement `EventCard` component with role-based previews
3. Add landing page logic (single event redirect vs dashboard)
4. Create `useUserEvents` hook for data fetching

### Phase 2: Mobile Navigation (High Priority)
1. Implement bottom tab navigation for mobile
2. Add floating action button for "Submit Report"
3. Enhance mobile table → card transformations
4. Add swipe gestures and pull-to-refresh

### Phase 3: SuperAdmin Isolation (Medium Priority)  
1. Remove SuperAdmin access to event data
2. Create separate system admin interface
3. Implement context switching for SuperAdmins
4. Add audit logging for system vs event actions

### Phase 4: Advanced Features (Lower Priority)
1. Email notification system
2. Anonymous reporting
3. Advanced analytics
4. External integrations

## Testing Checklist

### Mobile Testing Required
- [ ] Test on actual mobile devices (iOS Safari, Android Chrome)
- [ ] Verify touch targets are adequate (44px minimum)
- [ ] Test form submission on mobile keyboards
- [ ] Verify bottom navigation doesn't interfere with browser UI
- [ ] Test landscape orientation

### Accessibility Testing
- [ ] Screen reader navigation
- [ ] Keyboard-only navigation
- [ ] Color contrast verification
- [ ] Focus management in modals
- [ ] ARIA labeling

### Security Testing
- [ ] Role-based access enforcement
- [ ] Event data isolation
- [ ] File upload security
- [ ] SQL injection prevention
- [ ] XSS prevention

This guide should provide comprehensive context for AI-assisted development in Cursor, covering architecture patterns, implementation details, and development workflow.
---
sidebar_position: 3
---

# Permission Enforcement

This page explains how Conducky enforces role-based access control at different levels of the application, ensuring users can only access data and functionality appropriate to their roles.

## 🔒 Multi-Layer Security

Conducky implements permission enforcement at multiple layers to ensure comprehensive security:

1. **API Level** - Server-side route protection
2. **UI Level** - Frontend component visibility control  
3. **Data Level** - Database query scope enforcement
4. **Middleware Level** - Request validation and filtering

## 🛡️ API Level Protection

### Route-Level Authentication

All sensitive API endpoints require authentication and role verification:

```typescript
// Example: Event incidents endpoint
router.get('/events/:eventId/incidents', 
  requireAuth,                    // Must be logged in
  requireRole(['responder', 'event_admin', 'system_admin']),
  async (req, res) => {
    // Only users with appropriate roles can access
  }
);
```

### Role-Based Middleware

The `requireRole` middleware checks user permissions before allowing access:

```typescript
const requireRole = (allowedRoles) => {
  return async (req, res, next) => {
    const userRoles = await getUserRoles(req.user.id, req.params.eventId);
    
    if (!hasRequiredRole(userRoles, allowedRoles)) {
      return res.status(403).json({ error: 'Insufficient permissions' });
    }
    
    next();
  };
};
```

### Scope Validation

API endpoints validate that users can only access data within their authorized scope:

```typescript
// Event scope validation
const validateEventAccess = async (userId, eventId) => {
  const hasAccess = await checkEventRole(userId, eventId);
  if (!hasAccess) {
    throw new Error('Access denied to this event');
  }
};
```

## 🎨 UI Level Protection

### Conditional Rendering

Frontend components conditionally render based on user permissions:

```typescript
// Example: Admin-only navigation items
{hasEventAdminRole && (
  <NavItem href="/events/my-event/team">
    <Users className="w-4 h-4" />
    Team Management
  </NavItem>
)}

// Example: Role-based action buttons
{canEditIncident && (
  <Button onClick={handleEdit}>
    Edit Incident
  </Button>
)}
```

### Route Protection

Protected routes redirect unauthorized users:

```typescript
// Example: Admin route protection
const AdminRoute = ({ children, requiredRole }) => {
  const { user, hasRole } = useAuth();
  
  if (!user) {
    return <Redirect to="/login" />;
  }
  
  if (!hasRole(requiredRole)) {
    return <AccessDenied />;
  }
  
  return children;
};
```

### Dynamic Menu Generation

Navigation menus are dynamically generated based on user roles:

```typescript
const generateNavItems = (userRoles) => {
  const items = [];
  
  if (userRoles.includes('system_admin')) {
    items.push({ label: 'System Admin', href: '/admin' });
  }
  
  if (userRoles.includes('event_admin')) {
    items.push({ label: 'Event Settings', href: '/events/settings' });
  }
  
  return items;
};
```

## 🗄️ Data Level Enforcement

### Scoped Database Queries

Every data query includes appropriate scope validation:

```typescript
// Example: Incident queries always include event scope
const getIncidents = async (userId, eventId) => {
  // First verify user has access to this event
  await validateEventAccess(userId, eventId);
  
  // Then query with scope enforcement
  return await prisma.incident.findMany({
    where: {
      eventId: eventId,  // Scope to specific event
      // Additional filters based on user role...
    }
  });
};
```

### Role-Based Data Filtering

Different roles see different subsets of data:

```typescript
// Responders see all incidents, reporters see only their own
const getIncidentsForUser = async (userId, eventId, userRole) => {
  const baseQuery = { eventId };
  
  if (userRole === 'reporter') {
    baseQuery.reporterId = userId;  // Reporters see only their own
  }
  // Responders and admins see all (no additional filter)
  
  return await prisma.incident.findMany({ where: baseQuery });
};
```

### Comment Visibility Control

Comments are filtered based on visibility and user role:

```typescript
const getCommentsForIncident = async (incidentId, userRole, userId) => {
  const visibilityFilter = userRole === 'reporter' 
    ? { visibility: 'public' }  // Reporters see only public comments
    : {};                       // Staff see all comments
    
  return await prisma.comment.findMany({
    where: {
      incidentId,
      ...visibilityFilter
    }
  });
};
```

## 🚦 Middleware Protection

### Authentication Middleware

Validates user identity and session:

```typescript
const requireAuth = async (req, res, next) => {
  const token = req.headers.authorization?.replace('Bearer ', '');
  
  if (!token) {
    return res.status(401).json({ error: 'Authentication required' });
  }
  
  try {
    const user = await validateToken(token);
    req.user = user;
    next();
  } catch (error) {
    return res.status(401).json({ error: 'Invalid token' });
  }
};
```

### Role Validation Middleware

Checks if user has required permissions for the requested action:

```typescript
const requireEventRole = (roles) => {
  return async (req, res, next) => {
    const { eventId } = req.params;
    const userId = req.user.id;
    
    const userRoles = await getUserEventRoles(userId, eventId);
    const hasRequiredRole = roles.some(role => userRoles.includes(role));
    
    if (!hasRequiredRole) {
      return res.status(403).json({ 
        error: 'Insufficient permissions for this event' 
      });
    }
    
    next();
  };
};
```

## 🔍 Access Control Examples

### Incident Access Control

```typescript
// Different access patterns based on role
const getIncidentAccess = (incident, userRole, userId) => {
  const access = {
    canView: false,
    canEdit: false,
    canDelete: false,
    canComment: false,
    canSeeInternal: false
  };
  
  switch (userRole) {
    case 'event_admin':
      return { ...access, canView: true, canEdit: true, canDelete: true, 
               canComment: true, canSeeInternal: true };
               
    case 'responder':
      return { ...access, canView: true, canEdit: true, 
               canComment: true, canSeeInternal: true };
               
    case 'reporter':
      const isOwnReport = incident.reporterId === userId;
      return { ...access, canView: isOwnReport, canComment: isOwnReport };
      
    default:
      return access;  // No access
  }
};
```

### Organization Access Control

```typescript
// Organization-level access patterns
const getOrganizationAccess = (orgId, userRole) => {
  const access = {
    canViewEvents: false,
    canCreateEvents: false,
    canManageMembers: false,
    canViewSettings: false,
    canEditSettings: false
  };
  
  switch (userRole) {
    case 'org_admin':
      return { ...access, canViewEvents: true, canCreateEvents: true,
               canManageMembers: true, canViewSettings: true, canEditSettings: true };
               
    case 'org_viewer':
      return { ...access, canViewEvents: true, canViewSettings: true };
      
    default:
      return access;
  }
};
```

## 🚨 Security Best Practices

### Defense in Depth
- Never rely on UI-level protection alone
- Always validate permissions at the API level
- Include scope validation in database queries
- Log access attempts for audit purposes

### Fail Securely
- Default to denying access when in doubt
- Return generic error messages to prevent information disclosure
- Log failed access attempts for security monitoring

### Regular Validation
- Periodically audit user roles and permissions
- Remove unused or expired roles
- Monitor for privilege escalation attempts

{/* Screenshot Placeholder */}
> **Screenshot needed**: Access control audit log showing permission checks and violations 
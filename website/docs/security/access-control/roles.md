---
sidebar_position: 2
---

# Role Definitions

This page provides detailed information about each role in Conducky's RBAC system, including their capabilities, limitations, and data access permissions.

## 🔐 System Level Roles

### System Admin (`system_admin`)

**Primary Purpose**: Overall platform administration and system oversight

**Capabilities:**
- Create and manage organizations
- Create events across all organizations
- Access system-wide settings and monitoring
- Generate admin invite links for any event
- View system audit logs and analytics
- Manage global system settings

**Data Access:**
- No automatic access to event incident data
- Must be explicitly assigned event roles to view incidents
- Can view system-level statistics and health metrics
- Access to organization metadata (but not event details)

**Important Limitation:**
System Admins follow the principle of least privilege - they cannot access event incident data without explicit event-level permissions. This ensures that system maintenance doesn't compromise event data privacy.

{/* Screenshot Placeholder */}
> **Screenshot needed**: System Admin dashboard showing capabilities and limitations

## 🏢 Organization Level Roles

### Organization Admin (`org_admin`)

**Primary Purpose**: Manage organization and its events

**Capabilities:**
- Create and manage events within their organization
- Manage organization members and settings
- Automatically inherit Event Admin permissions for all organization events
- Generate invite links for organization events
- View organization-level analytics and reports

**Data Access:**
- Full access to all events within their organization
- Can view organization-level audit logs
- Access to organization statistics and member information
- Automatic access to all incident data for organization events

### Organization Viewer (`org_viewer`)

**Primary Purpose**: Read-only access to organization information

**Capabilities:**
- View organization details and public event list
- See organization member list (names and roles only)
- Access organization public information

**Data Access:**
- Read-only access to organization information
- Cannot view incident data unless explicitly assigned event roles
- No access to organization settings or administrative functions

## 🎯 Event Level Roles

### Event Admin (`event_admin`)

**Primary Purpose**: Complete event management and oversight

**Capabilities:**
- Manage event settings and configuration
- Add/remove team members and assign event roles
- View and manage all incident reports for their event
- Generate event invite links
- Configure event-specific settings (CoC, notifications, etc.)
- Access event analytics and reporting

**Data Access:**
- Full access to all incident data within their event
- Can view event audit logs
- Access to all reporter contact information
- Can see all internal and external comments

{/* Screenshot Placeholder */}
> **Screenshot needed**: Event Admin dashboard showing team management interface

### Responder (`responder`)

**Primary Purpose**: Handle and investigate incident reports

**Capabilities:**
- View and respond to all incidents in their assigned events
- Update incident status and assignments
- Add internal and external comments
- Upload and manage related files
- Assign incidents to themselves or other responders
- Access reporter contact information when necessary

**Data Access:**
- Can view all incident reports in their assigned events
- Can see internal comments and sensitive investigation notes
- Access to all related files and attachments
- Can view incident history and status changes

**Workflow Permissions:**
- Change incident states (submitted → investigating → resolved → closed)
- Assign/reassign incidents to team members
- Mark incidents as requiring follow-up

### Reporter (`reporter`)

**Primary Purpose**: Submit incident reports and track their progress

**Capabilities:**
- Submit new incident reports
- View and comment on their own reports
- Upload related files for their own incidents
- Track status of their submissions
- Receive notifications about their reports

**Data Access:**
- Can only view their own incident reports
- Can see external comments on their reports (but not internal team discussions)
- Cannot view other reporters' incidents or any internal comments
- Access to their own related files and attachments

**Important Limitations:**
- Cannot see internal team discussions or investigation notes
- Cannot view other users' incidents or reports
- Cannot change incident status or assignments

{/* Screenshot Placeholder */}
> **Screenshot needed**: Reporter view showing limited access to own reports only

## 🔄 Role Inheritance Rules

### Within Event Scope
- **Event Admin** inherits all **Responder** permissions
- **Responder** inherits all **Reporter** permissions

### Within Organization Scope  
- **Organization Admin** automatically gets **Event Admin** role for all organization events
- **Organization Viewer** gets no automatic event permissions

### Cross-Scope Rules
- **System Admin** does NOT automatically inherit organization or event permissions
- Roles must be explicitly assigned at each scope level
- Higher system roles cannot bypass event-level privacy controls

## 🎭 Role Assignment Examples

### Conference Organizer Workflow
1. **System Admin** creates organization and assigns **Organization Admin** role
2. **Organization Admin** creates events and becomes **Event Admin** automatically
3. **Event Admin** invites response team as **Responders**
4. **Responders** can access all incident data for their events

### Multi-Event User
A user might have:
- **Responder** role for "DevConf 2024"
- **Event Admin** role for "Security Summit 2024"  
- **Reporter** role for "Open Source Days 2024"

Each role grants different permissions within its specific event scope.

## 📋 Role Comparison Matrix

| Permission | System Admin | Org Admin | Org Viewer | Event Admin | Responder | Reporter |
|------------|--------------|-----------|------------|-------------|-----------|----------|
| Create Organizations | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ |
| Manage Org Events | ❌* | ✅ | ❌ | ❌ | ❌ | ❌ |
| View All Event Incidents | ❌* | ✅** | ❌* | ✅*** | ✅*** | ❌ |
| Assign Event Roles | ❌* | ✅** | ❌ | ✅*** | ❌ | ❌ |
| Update Incident Status | ❌* | ✅** | ❌* | ✅*** | ✅*** | ❌ |
| Submit Incidents | ❌* | ✅** | ❌* | ✅*** | ✅*** | ✅*** |
| View Internal Comments | ❌* | ✅** | ❌* | ✅*** | ✅*** | ❌ |

*Requires explicit event role assignment  
**Within organization events only  
***Within assigned events only 
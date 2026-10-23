# Conducky Organizations Feature Requirements

## Executive Summary

Adding organizational support to Conducky represents a natural evolution from the current event-centric model to a more scalable hierarchical structure. This enhancement addresses the needs of larger entities (conference series, foundations, corporate programs) that manage multiple events while maintaining the existing granular permissions at the event level.

## Business Requirements

### Primary Use Cases

1. **Conference Series Management**: Organizations like PyCon, KubeCon, or DevOpsDays that run multiple events annually across different regions
2. **Foundation Event Oversight**: Foundations (Python Software Foundation, Linux Foundation) that oversee multiple community events
3. **Corporate Program Management**: Companies running internal conferences, meetups, and community events
4. **Multi-Event Code of Conduct Enforcement**: Tracking patterns and enforcement across related events

### Success Metrics

- **Adoption**: 20% of existing multi-event users migrate to org structure within 6 months
- **Efficiency**: 40% reduction in administrative overhead for multi-event managers
- **Pattern Detection**: Improved incident pattern recognition across related events
- **Compliance**: Enhanced reporting capabilities for organizations with governance requirements

## Technical Requirements

### Database Schema Changes

#### New Tables

```sql
-- Organizations table
CREATE TABLE organizations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(255) NOT NULL,
  slug VARCHAR(100) UNIQUE NOT NULL,
  description TEXT,
  website VARCHAR(500),
  logo_url VARCHAR(500),
  settings JSONB DEFAULT '{}',
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  created_by UUID REFERENCES users(id)
);

-- Organization memberships (replaces direct event assignments for org admins)
CREATE TABLE organization_memberships (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  role organization_role NOT NULL,
  created_at TIMESTAMP DEFAULT NOW(),
  created_by UUID REFERENCES users(id),
  UNIQUE(organization_id, user_id)
);

-- New enum for organization roles
CREATE TYPE organization_role AS ENUM ('org_admin', 'org_viewer');
```

#### Modified Tables

```sql
-- Add organization relationship to events
ALTER TABLE events ADD COLUMN organization_id UUID REFERENCES organizations(id);
ALTER TABLE events ADD COLUMN parent_event_id UUID REFERENCES events(id); -- For event series

-- Add organization context to audit logs
ALTER TABLE audit_logs ADD COLUMN organization_id UUID REFERENCES organizations(id);

-- Update RLS policies to consider organization hierarchy
-- (Detailed implementation in Technical Architecture section)
```

### Role Hierarchy & Permissions

#### Role Definitions

1. **SuperAdmin** (System Level)
   - Create/manage organizations
   - System-wide oversight (no access to reports/user data)

2. **Org Admin** (Organization Level) - NEW
   - Manage organization settings and branding
   - Create/manage events within organization
   - View aggregated reports across all org events
   - Assign event admins/responders within organization
   - Cannot see individual report details unless also event admin

3. **Org Viewer** (Organization Level) - NEW
   - View organization dashboard and aggregated metrics
   - Read-only access to organization events list
   - No access to individual reports

4. **Event Admin** (Event Level) - UNCHANGED
   - Full event management within assigned events
   - Can be org admin + event admin for enhanced access

5. **Responder** (Event Level) - UNCHANGED
   - Event-scoped incident response

6. **Reporter** (Event Level) - UNCHANGED
   - Submit reports within events

#### Permission Matrix

| Action | SuperAdmin | Org Admin | Org Viewer | Event Admin | Responder | Reporter |
|--------|------------|-----------|------------|-------------|-----------|----------|
| Create Organization | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ |
| Manage Org Settings | ❌ | ✅ | ❌ | ❌ | ❌ | ❌ |
| Create Events in Org | ❌ | ✅ | ❌ | ❌ | ❌ | ❌ |
| View Org Dashboard | ❌ | ✅ | ✅ | ❌ | ❌ | ❌ |
| View Org Report Summary | ❌ | ✅ | ✅ | ❌ | ❌ | ❌ |
| View Individual Reports | ❌ | Only if Event Admin | ❌ | ✅ | ✅ | Own only |
| Assign Event Roles | ❌ | ✅ (within org) | ❌ | ✅ (within event) | ❌ | ❌ |

## User Experience Requirements

### Navigation Hierarchy

#### Updated Navigation Structure

```
System Level (SuperAdmin)
├── System Dashboard
├── Organizations Management
└── System Settings

Organization Level (Org Admin/Viewer)
├── Organization Dashboard
├── Events Management
├── Reports Overview (Aggregated)
├── Team Management
└── Organization Settings

Event Level (All Event Roles)
├── Event Dashboard
├── Event Reports (Detailed)
├── Event Team
└── Event Settings
```

#### Context Switching

Users need clear visual indicators of their current context:

```
Header Context Indicator:
[SuperAdmin] → [ACME Corp] → [PyCon 2025]
[System]     → [Org]       → [Event]
```

### New Pages Required

#### 1. Organization Dashboard (`/orgs/[orgSlug]`)

**Purpose**: Primary landing page for org admins/viewers
**Audience**: Org Admin, Org Viewer

**Key Components**:
- Organization overview (name, description, website)
- Events summary cards with quick stats
- Cross-event metrics and trends
- Recent activity feed
- Quick actions (create event, manage team)

#### 2. Organization Events Management (`/orgs/[orgSlug]/events`)

**Purpose**: Manage all events within organization
**Audience**: Org Admin

**Key Components**:
- Events table with advanced filtering
- Bulk actions for event management
- Event creation wizard
- Event templates for consistency
- Performance metrics comparison

#### 3. Organization Reports Overview (`/orgs/[orgSlug]/reports`)

**Purpose**: Aggregated view of reports across all org events
**Audience**: Org Admin, Org Viewer

**Key Components**:
- High-level metrics dashboard
- Trend analysis across events
- Pattern detection alerts
- Compliance reporting tools
- Export capabilities for leadership

#### 4. Organization Team Management (`/orgs/[orgSlug]/team`)

**Purpose**: Manage organization-level and event-level roles
**Audience**: Org Admin

**Key Components**:
- Organization members list
- Role assignment interface
- Event admin assignment matrix
- Team performance metrics
- Invitation management

#### 5. Organization Settings (`/orgs/[orgSlug]/settings`)

**Purpose**: Configure organization-wide settings
**Audience**: Org Admin

**Key Components**:
- Organization profile (name, logo, branding)
- Default event settings/templates
- Notification preferences
- Integration settings
- Compliance configuration

## Wireframes and UI Specifications

### Organization Dashboard Wireframe

```
┌─────────────────────────────────────────────────────────────────┐
│ [←] ACME Conference Series                            [Org ▼]    │
├─────────────────────────────────────────────────────────────────┤
│ 🏢 ACME Conference Series                                       │
│ Managing developer conferences since 2019                       │
│ 🌐 acmeconf.org • 📧 conduct@acmeconf.org                      │
├─────────────────────────────────────────────────────────────────┤
│ 📊 Organization Overview                                        │
│ ┌─────────────┐ ┌─────────────┐ ┌─────────────┐ ┌─────────────┐│
│ │📅 Events    │ │📋 Reports   │ │👥 Team      │ │⚡ Active    ││
│ │     12      │ │     47      │ │    23       │ │     3       ││
│ │   Total     │ │   Total     │ │  Members    │ │  Events     ││
│ └─────────────┘ └─────────────┘ └─────────────┘ └─────────────┘│
├─────────────────────────────────────────────────────────────────┤
│ 🎯 Active Events                                [View All Events]│
│ ┌─────────────────────────┐ ┌─────────────────────────┐        │
│ │ 🚨 DevConf Berlin 2025  │ │ ✅ PyCon Portland 2025  │        │
│ │ 3 new reports          │ │ All reports resolved    │        │
│ │ 2 need attention       │ │ Event ended 2 days ago  │        │
│ │ [Manage] [View Reports] │ │ [View Summary] [Archive]│        │
│ └─────────────────────────┘ └─────────────────────────┘        │
├─────────────────────────────────────────────────────────────────┤
│ 📈 Recent Activity                                [View All]    │
│ • New report submitted - DevConf Berlin (2 hours ago)          │
│ • Report resolved - PyCon Portland (1 day ago)                 │
│ • New team member added - Sarah Chen (3 days ago)              │
├─────────────────────────────────────────────────────────────────┤
│ 🎯 Quick Actions                                                │
│ [➕ Create Event] [👥 Manage Team] [📊 View Reports] [⚙️ Settings]│
└─────────────────────────────────────────────────────────────────┘
```

### Organization Reports Overview Wireframe

```
┌─────────────────────────────────────────────────────────────────┐
│ [←] ACME Conf • Reports Overview                      [Export ▼]│
├─────────────────────────────────────────────────────────────────┤
│ 📊 Cross-Event Report Analytics                                 │
│ Time Period: [Last 12 Months ▼] Event Filter: [All Events ▼]   │
├─────────────────────────────────────────────────────────────────┤
│ 📈 Key Metrics                                                  │
│ ┌─────────────┐ ┌─────────────┐ ┌─────────────┐ ┌─────────────┐│  
│ │📋 Total     │ │⚡ Avg       │ │✅ Resolution│ │🔄 Recurring ││
│ │   Reports   │ │ Response    │ │    Rate     │ │  Patterns   ││
│ │     47      │ │  4.2 hrs    │ │    94%      │ │     3       ││
│ └─────────────┘ └─────────────┘ └─────────────┘ └─────────────┘│
├─────────────────────────────────────────────────────────────────┤
│ 📊 Reports by Event                                             │
│ ┌─ DevConf Berlin: 18 reports (6 pending)                      │
│ ┌─ PyCon Portland: 12 reports (all resolved)                   │
│ ┌─ JSConf Austin: 8 reports (2 investigating)                  │
│ ┌─ RustConf Denver: 9 reports (all resolved)                   │
├─────────────────────────────────────────────────────────────────┤
│ 🚨 Pattern Alerts                                               │
│ ⚠️ Similar behavior reported across 2 events - Review needed    │
│ 📈 Harassment reports increased 40% - Consider additional training│
├─────────────────────────────────────────────────────────────────┤
│ 📅 Monthly Trend                                                │
│ [Line chart showing report volume over time]                    │
│ Jan Feb Mar Apr May Jun Jul Aug Sep Oct Nov Dec                 │
│  3   5   8  12  15  18  22  19  16  14  12   9                │
└─────────────────────────────────────────────────────────────────┘
```

### Organization Team Management Wireframe

```
┌─────────────────────────────────────────────────────────────────┐
│ [←] ACME Conf • Team Management                     [Invite ▼]  │
├─────────────────────────────────────────────────────────────────┤
│ 👥 Organization Team                                            │
│ [Search members...] [Filter: All Roles ▼] [Sort: Name ▼]       │
├─────────────────────────────────────────────────────────────────┤
│ 🏢 Organization Level (2 members)                               │
│ ┌─────────────────────────────────────────────────────────────┐ │
│ │ 👤 John Doe          Org Admin    Since: Jan 2024  [Edit ▼]│ │
│ │ 📧 john@acmeconf.org              All events access         │ │
│ │                                                             │ │
│ │ 👤 Sarah Chen        Org Viewer   Since: Mar 2024  [Edit ▼]│ │
│ │ 📧 sarah@acmeconf.org             Reports overview only     │ │
│ └─────────────────────────────────────────────────────────────┘ │
├─────────────────────────────────────────────────────────────────┤
│ 🎯 Event-Level Roles                                            │
│ ┌─ DevConf Berlin (6 members)                          [Expand]│
│   • 2 Event Admins • 3 Responders • 1 Reporter                 │
│ ┌─ PyCon Portland (4 members)                          [Expand]│
│   • 1 Event Admin • 2 Responders • 1 Reporter                  │
├─────────────────────────────────────────────────────────────────┤
│ 📊 Team Performance                                             │
│ • Average response time: 4.2 hours                             │
│ • Most active responder: Mike Wilson (12 reports handled)      │
│ • Training completion rate: 87%                                │
├─────────────────────────────────────────────────────────────────┤
│ 🎯 Quick Actions                                                │
│ [📧 Invite Org Admin] [👥 Bulk Assign Events] [📋 Export Team] │
└─────────────────────────────────────────────────────────────────┘
```

## Data Migration Strategy

### Migration Path for Existing Data

#### Phase 1: Schema Updates
1. Add organization tables to database
2. Create default organization for orphaned events
3. Update RLS policies to handle organization context

#### Phase 2: Data Migration
1. **Automatic Migration**: Create "Legacy Events" organization for events without explicit org assignment
2. **User-Guided Migration**: Provide interface for users to group related events into organizations
3. **Role Preservation**: Maintain existing event-level permissions while adding org-level options

#### Phase 3: Feature Rollout
1. **Beta Access**: Invite existing multi-event users to test org features
2. **Gradual Migration**: Allow users to opt-in to organization structure
3. **Full Rollout**: Make organization structure the default for new multi-event setups

### Backward Compatibility

- All existing URLs remain functional
- Event-level permissions unchanged
- Existing workflows continue without interruption
- Optional migration to organization structure

## Security Considerations

### Access Control Updates

#### Row-Level Security (RLS) Enhancements

```sql
-- Organization data access
CREATE POLICY org_member_access ON organizations
  USING (
    -- SuperAdmin sees all orgs
    auth.is_super_admin() OR
    -- Org members see their org
    id IN (
      SELECT organization_id FROM organization_memberships 
      WHERE user_id = auth.uid()
    )
  );

-- Cross-organization report access prevention
CREATE POLICY org_scoped_reports ON reports
  USING (
    -- Existing event-level access OR
    event_id IN (SELECT id FROM events WHERE ... existing logic ...) AND
    -- Organization boundary check
    event_id IN (
      SELECT e.id FROM events e
      JOIN organization_memberships om ON e.organization_id = om.organization_id
      WHERE om.user_id = auth.uid()
      WHEN auth.has_org_role()
    )
  );
```

#### Audit Trail Enhancements

- All organization-level actions logged with org context
- Cross-organization access attempts flagged
- Role elevation events tracked
- Data access patterns monitored

### Privacy Considerations

#### Data Segregation
- Organization admins cannot access detailed reports unless also event admin
- Cross-organization data sharing requires explicit consent
- Aggregated metrics anonymized appropriately

#### Compliance Implications
- GDPR data controller relationships clarified (org vs event level)
- Data retention policies inherit from organization settings
- Cross-border data transfer policies at org level

## Implementation Timeline

### Phase 1: Foundation (Weeks 1-4)
- [ ] Database schema implementation
- [ ] Basic organization CRUD operations
- [ ] Role management updates
- [ ] RLS policy updates

### Phase 2: Core UI (Weeks 5-8)
- [ ] Organization dashboard
- [ ] Events management interface
- [ ] Team management interface
- [ ] Navigation hierarchy updates

### Phase 3: Advanced Features (Weeks 9-12)
- [ ] Reports overview and analytics
- [ ] Pattern detection algorithms
- [ ] Export and compliance features
- [ ] Mobile optimization

### Phase 4: Migration & Polish (Weeks 13-16)
- [ ] Data migration tools
- [ ] User migration interface
- [ ] Performance optimization
- [ ] User acceptance testing

## Success Criteria

### Technical Success
- [ ] Zero downtime migration for existing users
- [ ] Sub-200ms query performance for org dashboards
- [ ] Mobile-responsive design across all new interfaces
- [ ] WCAG 2.2 AA compliance maintained

### User Experience Success
- [ ] 90% of beta users complete organization setup within 1 week
- [ ] Average time to create new event reduced by 60%
- [ ] Multi-event administrative overhead reduced by 40%
- [ ] User satisfaction score > 4.5/5 for new features

### Business Success
- [ ] 20% of existing users adopt organization structure within 6 months
- [ ] 50% increase in multi-event user retention
- [ ] Enable enterprise sales opportunities
- [ ] Reduce support tickets related to multi-event management

## Risk Mitigation

### Technical Risks
- **Database Performance**: Implement proper indexing and query optimization
- **Migration Complexity**: Phased rollout with rollback capabilities
- **Security Vulnerabilities**: Comprehensive security testing and audit

### User Experience Risks
- **Confusion**: Clear documentation and onboarding flow
- **Feature Creep**: Maintain focus on core org admin needs
- **Mobile Usability**: Mobile-first design approach

### Business Risks
- **Low Adoption**: Incentivize migration with exclusive features
- **Complexity Overhead**: Keep organization features optional
- **Support Burden**: Comprehensive documentation and training materials

This organizational enhancement transforms Conducky from an event-centric platform to a scalable hierarchical system that can serve the needs of large conference series, foundations, and corporate programs while maintaining the granular control and security that makes it effective for individual events.
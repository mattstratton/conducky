# Glossary

Terms as Conducky uses them. Prefer these in code, issues, docs and UI copy.

## Structure

- **Organization**: top-level tenant that owns many events (`Organization`). Has its own members, invite links, logo and analytics.
- **Event**: one conference or gathering with its own Code of Conduct team and incidents (`Event`). The unit of data isolation: incident data never crosses events.
- **System** (scope): the whole installation. Admin settings, logging, OAuth and email config live here (`SystemSetting`).

## Roles (Unified RBAC)

Roles are `UnifiedRole` rows assigned to users per scope via `UserRole`. Scopes: `system`, `organization`, `event`.

- **System Admin**: installation-wide admin (formerly "SuperAdmin"). Manages orgs and system settings. **No event data access without an explicit event role.**
- **Organization Admin** (`org_admin`): manages an org and its events. Not automatically an event member; added as Event Admin on each event *at creation only*.
- **Organization Viewer** (`org_viewer`): read-only on org details and event list.
- **Event Admin**: full control of one event: settings, roles, all incidents.
- **Responder**: Code of Conduct team member who triages and resolves incidents. Can see internal comments and reporter contact info.
- **Reporter**: submits incidents and sees only their own (and their public updates). May be anonymous.

## Incidents

- **Incident**: a Code of Conduct report submitted for an event (`Incident`). Called "report" in older code, routes and docs (`report.service.ts`, `ReportForm`); the entity is an **incident**.
- **Incident state**: `submitted` → `acknowledged` → `investigating` → `resolved` → `closed` (can skip forward; `IncidentState`). Changes are recorded in `IncidentStateHistory`.
- **Severity**: `low | medium | high | critical`.
- **Tag**: label on an incident (`Tag`, `IncidentTag`). Replaced the old fixed incident *type*.
- **Comment**: message on an incident. **Visibility** is `public` (reporter, responders, admins) or `internal` (responders and admins only).
- **Related file**: attachment on an incident (`RelatedFile`).
- **Pinned incident**: a responder's personal shortcut to an incident (`UserPinnedIncident`).
- **Cross-event incidents**: a user's incidents or assignments across several events, shown in the global dashboard.

## Access and plumbing

- **Invite link**: code granting a role on an event (`EventInviteLink`) or org (`OrganizationInviteLink`).
- **Public event page**: event landing page where people can submit an incident, when enabled.
- **Notification**: in-app (and optionally email) message about incident activity (`Notification`, `UserNotificationSettings`).
- **Audit log**: record of security-relevant actions (`AuditLog`, written via `logAudit`).
- **Encrypted field**: sensitive column stored as AES-256-GCM ciphertext. Needs `ENCRYPTION_KEY`; losing or rotating the key without migration makes data unreadable.
- **Social login**: Google or GitHub OAuth (`SocialAccount`). Credentials are stored encrypted in system settings, not env vars.

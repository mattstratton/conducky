# Security Audit Report
Date: 2025-07-09T17:24:24.923Z

## Executive Summary
- **Total Issues Found**: 234
- **Critical**: 25 🚨
- **High**: 75 ❌
- **Medium**: 134 ⚠️
- **Low**: 0 ℹ️
- **Dependency Vulnerabilities**: 0

## Risk Assessment
🚨 **CRITICAL RISK** - Immediate action required
❌ **HIGH RISK** - Address before production
⚠️ **MEDIUM RISK** - Address in next release

## Security Status by Category

### ✅ Strengths
- Authentication middleware properly implemented
- Rate limiting in place for critical endpoints
- Input sanitization using DOMPurify
- File upload restrictions and validation
- CORS properly configured for production
- Session security configured
- No SQL injection vulnerabilities (using Prisma ORM)

### Issues Found

#### HIGH: Session configuration issues
- **File**: /Users/mattstratton/src/github.com/mattstratton/conducky/backend/src/config/session.ts:141
- **Code**: `secure: false`


#### HIGH: Session configuration issues
- **File**: /Users/mattstratton/src/github.com/mattstratton/conducky/backend/src/config/session.ts:152
- **Code**: `secure: false`


#### CRITICAL: Hardcoded credentials
- **File**: /Users/mattstratton/src/github.com/mattstratton/conducky/backend/src/routes/admin.routes.ts:721
- **Code**: `key: 'email'`


#### CRITICAL: Hardcoded credentials
- **File**: /Users/mattstratton/src/github.com/mattstratton/conducky/backend/src/routes/admin.routes.ts:827
- **Code**: `key: 'email'`


#### CRITICAL: Hardcoded credentials
- **File**: /Users/mattstratton/src/github.com/mattstratton/conducky/backend/src/routes/admin.routes.ts:832
- **Code**: `key: 'email'`


#### CRITICAL: Hardcoded credentials
- **File**: /Users/mattstratton/src/github.com/mattstratton/conducky/backend/src/routes/admin.routes.ts:955
- **Code**: `key: 'googleOAuth'`


#### CRITICAL: Hardcoded credentials
- **File**: /Users/mattstratton/src/github.com/mattstratton/conducky/backend/src/routes/admin.routes.ts:1008
- **Code**: `key: 'googleOAuth'`


#### CRITICAL: Hardcoded credentials
- **File**: /Users/mattstratton/src/github.com/mattstratton/conducky/backend/src/routes/admin.routes.ts:1013
- **Code**: `key: 'googleOAuth'`


#### CRITICAL: Hardcoded credentials
- **File**: /Users/mattstratton/src/github.com/mattstratton/conducky/backend/src/routes/admin.routes.ts:1037
- **Code**: `key: 'githubOAuth'`


#### CRITICAL: Hardcoded credentials
- **File**: /Users/mattstratton/src/github.com/mattstratton/conducky/backend/src/routes/admin.routes.ts:1090
- **Code**: `key: 'githubOAuth'`


#### CRITICAL: Hardcoded credentials
- **File**: /Users/mattstratton/src/github.com/mattstratton/conducky/backend/src/routes/admin.routes.ts:1095
- **Code**: `key: 'githubOAuth'`


#### HIGH: Missing authentication middleware
- **File**: /Users/mattstratton/src/github.com/mattstratton/conducky/backend/src/routes/audit.routes.ts:16
- **Code**: `router.get('/events/:eventId/audit',`


#### HIGH: Missing authentication middleware
- **File**: /Users/mattstratton/src/github.com/mattstratton/conducky/backend/src/routes/audit.routes.ts:19
- **Code**: `router.get('/organizations/:organizationId/audit',`


#### HIGH: Missing authentication middleware
- **File**: /Users/mattstratton/src/github.com/mattstratton/conducky/backend/src/routes/audit.routes.ts:22
- **Code**: `router.get('/system/audit',`


#### HIGH: Missing authentication middleware
- **File**: /Users/mattstratton/src/github.com/mattstratton/conducky/backend/src/routes/auth.routes.ts:52
- **Code**: `router.post('/register',`


#### HIGH: Missing authentication middleware
- **File**: /Users/mattstratton/src/github.com/mattstratton/conducky/backend/src/routes/auth.routes.ts:93
- **Code**: `router.get('/session',`


#### HIGH: Missing authentication middleware
- **File**: /Users/mattstratton/src/github.com/mattstratton/conducky/backend/src/routes/auth.routes.ts:115
- **Code**: `router.get('/session-debug',`


#### HIGH: Missing authentication middleware
- **File**: /Users/mattstratton/src/github.com/mattstratton/conducky/backend/src/routes/auth.routes.ts:167
- **Code**: `router.get('/check-email',`


#### HIGH: Missing authentication middleware
- **File**: /Users/mattstratton/src/github.com/mattstratton/conducky/backend/src/routes/auth.routes.ts:170
- **Code**: `router.post('/forgot-password',`


#### HIGH: Missing authentication middleware
- **File**: /Users/mattstratton/src/github.com/mattstratton/conducky/backend/src/routes/auth.routes.ts:220
- **Code**: `router.get('/validate-reset-token',`


#### HIGH: Missing authentication middleware
- **File**: /Users/mattstratton/src/github.com/mattstratton/conducky/backend/src/routes/auth.routes.ts:256
- **Code**: `router.get('/google',`


#### HIGH: Missing authentication middleware
- **File**: /Users/mattstratton/src/github.com/mattstratton/conducky/backend/src/routes/auth.routes.ts:282
- **Code**: `router.get('/google/callback',`


#### HIGH: Missing authentication middleware
- **File**: /Users/mattstratton/src/github.com/mattstratton/conducky/backend/src/routes/auth.routes.ts:323
- **Code**: `router.get('/github',`


#### HIGH: Missing authentication middleware
- **File**: /Users/mattstratton/src/github.com/mattstratton/conducky/backend/src/routes/auth.routes.ts:349
- **Code**: `router.get('/github/callback',`


#### HIGH: Missing authentication middleware
- **File**: /Users/mattstratton/src/github.com/mattstratton/conducky/backend/src/routes/config.routes.ts:8
- **Code**: `router.get('/email-enabled',`


#### HIGH: Missing authentication middleware
- **File**: /Users/mattstratton/src/github.com/mattstratton/conducky/backend/src/routes/event.routes.ts:325
- **Code**: `router.post('/',`


#### HIGH: Missing authentication middleware
- **File**: /Users/mattstratton/src/github.com/mattstratton/conducky/backend/src/routes/event.routes.ts:354
- **Code**: `router.get('/',`


#### HIGH: Missing authentication middleware
- **File**: /Users/mattstratton/src/github.com/mattstratton/conducky/backend/src/routes/event.routes.ts:371
- **Code**: `router.get('/:eventId',`


#### HIGH: Missing authentication middleware
- **File**: /Users/mattstratton/src/github.com/mattstratton/conducky/backend/src/routes/event.routes.ts:390
- **Code**: `router.get('/:eventId/users',`


#### HIGH: Missing authentication middleware
- **File**: /Users/mattstratton/src/github.com/mattstratton/conducky/backend/src/routes/event.routes.ts:539
- **Code**: `router.get('/:eventId/incidents',`


#### HIGH: Missing authentication middleware
- **File**: /Users/mattstratton/src/github.com/mattstratton/conducky/backend/src/routes/event.routes.ts:572
- **Code**: `router.get('/:eventId/incidents/:incidentId',`


#### HIGH: Missing authentication middleware
- **File**: /Users/mattstratton/src/github.com/mattstratton/conducky/backend/src/routes/event.routes.ts:937
- **Code**: `router.get('/:eventId/incidents/:incidentId/evidence',`


#### HIGH: Missing authentication middleware
- **File**: /Users/mattstratton/src/github.com/mattstratton/conducky/backend/src/routes/event.routes.ts:956
- **Code**: `router.get('/:eventId/incidents/:incidentId/evidence/:evidenceId/download',`


#### HIGH: Missing authentication middleware
- **File**: /Users/mattstratton/src/github.com/mattstratton/conducky/backend/src/routes/event.routes.ts:1036
- **Code**: `router.get('/:eventId/logo',`


#### HIGH: Missing authentication middleware
- **File**: /Users/mattstratton/src/github.com/mattstratton/conducky/backend/src/routes/incident.routes.ts:22
- **Code**: `router.get('/:incidentId/evidence',`


#### HIGH: Missing authentication middleware
- **File**: /Users/mattstratton/src/github.com/mattstratton/conducky/backend/src/routes/incident.routes.ts:41
- **Code**: `router.post('/:incidentId/evidence',`


#### HIGH: Missing authentication middleware
- **File**: /Users/mattstratton/src/github.com/mattstratton/conducky/backend/src/routes/incident.routes.ts:73
- **Code**: `router.get('/:incidentId/evidence/:evidenceId',`


#### HIGH: Missing authentication middleware
- **File**: /Users/mattstratton/src/github.com/mattstratton/conducky/backend/src/routes/incident.routes.ts:100
- **Code**: `router.delete('/:incidentId/evidence/:evidenceId',`


#### HIGH: Missing authentication middleware
- **File**: /Users/mattstratton/src/github.com/mattstratton/conducky/backend/src/routes/invite.routes.ts:12
- **Code**: `router.get('/:code',`


#### HIGH: Missing authentication middleware
- **File**: /Users/mattstratton/src/github.com/mattstratton/conducky/backend/src/routes/organization.routes.ts:293
- **Code**: `router.get('/me',`


#### HIGH: Missing authentication middleware
- **File**: /Users/mattstratton/src/github.com/mattstratton/conducky/backend/src/routes/organization.routes.ts:527
- **Code**: `router.get('/:organizationId',`


#### HIGH: Missing authentication middleware
- **File**: /Users/mattstratton/src/github.com/mattstratton/conducky/backend/src/routes/organization.routes.ts:529
- **Code**: `router.put('/:organizationId',`


#### HIGH: Missing authentication middleware
- **File**: /Users/mattstratton/src/github.com/mattstratton/conducky/backend/src/routes/organization.routes.ts:614
- **Code**: `router.post('/:organizationId/members',`


#### HIGH: Missing authentication middleware
- **File**: /Users/mattstratton/src/github.com/mattstratton/conducky/backend/src/routes/organization.routes.ts:751
- **Code**: `router.put('/:organizationId/members/:userId',`


#### HIGH: Missing authentication middleware
- **File**: /Users/mattstratton/src/github.com/mattstratton/conducky/backend/src/routes/organization.routes.ts:753
- **Code**: `router.delete('/:organizationId/members/:userId',`


#### HIGH: Missing authentication middleware
- **File**: /Users/mattstratton/src/github.com/mattstratton/conducky/backend/src/routes/organization.routes.ts:945
- **Code**: `router.post('/:organizationId/events',`


#### HIGH: Missing authentication middleware
- **File**: /Users/mattstratton/src/github.com/mattstratton/conducky/backend/src/routes/organization.routes.ts:947
- **Code**: `router.get('/:organizationId/events',`


#### HIGH: Missing authentication middleware
- **File**: /Users/mattstratton/src/github.com/mattstratton/conducky/backend/src/routes/organization.routes.ts:954
- **Code**: `router.post('/:organizationId/logo',`


#### HIGH: Missing authentication middleware
- **File**: /Users/mattstratton/src/github.com/mattstratton/conducky/backend/src/routes/organization.routes.ts:960
- **Code**: `router.get('/:organizationId/logo',`


#### HIGH: Missing authentication middleware
- **File**: /Users/mattstratton/src/github.com/mattstratton/conducky/backend/src/routes/organization.routes.ts:1149
- **Code**: `router.post('/:organizationId/invites',`


#### HIGH: Missing authentication middleware
- **File**: /Users/mattstratton/src/github.com/mattstratton/conducky/backend/src/routes/organization.routes.ts:1151
- **Code**: `router.get('/:organizationId/invites',`


#### HIGH: Missing authentication middleware
- **File**: /Users/mattstratton/src/github.com/mattstratton/conducky/backend/src/routes/organization.routes.ts:1232
- **Code**: `router.patch('/:organizationId/invites/:inviteId',`


#### HIGH: Missing authentication middleware
- **File**: /Users/mattstratton/src/github.com/mattstratton/conducky/backend/src/routes/user.routes.ts:247
- **Code**: `router.get('/:userId/avatar',`


#### HIGH: Missing authentication middleware
- **File**: /Users/mattstratton/src/github.com/mattstratton/conducky/backend/src/routes/user.routes.ts:276
- **Code**: `router.post('/:userId/avatar',`


#### HIGH: Missing authentication middleware
- **File**: /Users/mattstratton/src/github.com/mattstratton/conducky/backend/src/routes/user.routes.ts:315
- **Code**: `router.delete('/:userId/avatar',`


#### CRITICAL: Hardcoded credentials
- **File**: /Users/mattstratton/src/github.com/mattstratton/conducky/backend/src/services/user.service.ts:254
- **Code**: `password:', error);
      return {
        success: false,
        error: '`


#### HIGH: Session configuration issues
- **File**: /Users/mattstratton/src/github.com/mattstratton/conducky/backend/src/utils/email.ts:135
- **Code**: `secure: false`


#### CRITICAL: Hardcoded credentials
- **File**: /Users/mattstratton/src/github.com/mattstratton/conducky/backend/src/utils/encryption.ts:50
- **Code**: `Key = 'test-encryption-key-32-characters-long!'`


#### MEDIUM: Missing input sanitization
- **File**: /Users/mattstratton/src/github.com/mattstratton/conducky/backend/src/controllers/organization.controller.ts:82
- **Code**: `req.params.organizationId`


#### MEDIUM: Missing input sanitization
- **File**: /Users/mattstratton/src/github.com/mattstratton/conducky/backend/src/controllers/user.controller.ts:178
- **Code**: `req.query.page`


#### MEDIUM: Missing input sanitization
- **File**: /Users/mattstratton/src/github.com/mattstratton/conducky/backend/src/controllers/user.controller.ts:179
- **Code**: `req.query.limit`


#### MEDIUM: Missing input sanitization
- **File**: /Users/mattstratton/src/github.com/mattstratton/conducky/backend/src/controllers/user.controller.ts:180
- **Code**: `req.query.eventFilter`


#### MEDIUM: Missing input sanitization
- **File**: /Users/mattstratton/src/github.com/mattstratton/conducky/backend/src/controllers/user.controller.ts:181
- **Code**: `req.query.statusFilter`


#### MEDIUM: Missing input sanitization
- **File**: /Users/mattstratton/src/github.com/mattstratton/conducky/backend/src/controllers/user.controller.ts:182
- **Code**: `req.query.sortBy`


#### MEDIUM: Missing input sanitization
- **File**: /Users/mattstratton/src/github.com/mattstratton/conducky/backend/src/controllers/user.controller.ts:183
- **Code**: `req.query.sortOrder`


#### MEDIUM: Missing input sanitization
- **File**: /Users/mattstratton/src/github.com/mattstratton/conducky/backend/src/middleware/auth.ts:118
- **Code**: `req.body.email`


#### MEDIUM: Missing input sanitization
- **File**: /Users/mattstratton/src/github.com/mattstratton/conducky/backend/src/middleware/unified-rbac.ts:54
- **Code**: `req.params.organizationId`


#### MEDIUM: Missing input sanitization
- **File**: /Users/mattstratton/src/github.com/mattstratton/conducky/backend/src/middleware/unified-rbac.ts:54
- **Code**: `req.params.orgId`


#### MEDIUM: Missing input sanitization
- **File**: /Users/mattstratton/src/github.com/mattstratton/conducky/backend/src/middleware/unified-rbac.ts:94
- **Code**: `req.params.eventId`


#### MEDIUM: Missing input sanitization
- **File**: /Users/mattstratton/src/github.com/mattstratton/conducky/backend/src/middleware/unified-rbac.ts:97
- **Code**: `req.params.eventSlug`


#### MEDIUM: Missing input sanitization
- **File**: /Users/mattstratton/src/github.com/mattstratton/conducky/backend/src/middleware/unified-rbac.ts:102
- **Code**: `req.params.eventSlug`


#### MEDIUM: Missing input sanitization
- **File**: /Users/mattstratton/src/github.com/mattstratton/conducky/backend/src/middleware/unified-rbac.ts:126
- **Code**: `req.params.eventId`


#### MEDIUM: Missing input sanitization
- **File**: /Users/mattstratton/src/github.com/mattstratton/conducky/backend/src/middleware/validation.ts:515
- **Code**: `req.body.password`


#### MEDIUM: Missing input sanitization
- **File**: /Users/mattstratton/src/github.com/mattstratton/conducky/backend/src/middleware/validation.ts:515
- **Code**: `req.body.password`


#### MEDIUM: Missing input sanitization
- **File**: /Users/mattstratton/src/github.com/mattstratton/conducky/backend/src/routes/auth.routes.ts:261
- **Code**: `req.query.state`


#### MEDIUM: Missing input sanitization
- **File**: /Users/mattstratton/src/github.com/mattstratton/conducky/backend/src/routes/auth.routes.ts:261
- **Code**: `req.query.state`


#### MEDIUM: Missing input sanitization
- **File**: /Users/mattstratton/src/github.com/mattstratton/conducky/backend/src/routes/auth.routes.ts:263
- **Code**: `req.query.state`


#### MEDIUM: Missing input sanitization
- **File**: /Users/mattstratton/src/github.com/mattstratton/conducky/backend/src/routes/auth.routes.ts:269
- **Code**: `req.query.state`


#### MEDIUM: Missing input sanitization
- **File**: /Users/mattstratton/src/github.com/mattstratton/conducky/backend/src/routes/auth.routes.ts:269
- **Code**: `req.query.state`


#### MEDIUM: Missing input sanitization
- **File**: /Users/mattstratton/src/github.com/mattstratton/conducky/backend/src/routes/auth.routes.ts:270
- **Code**: `req.query.state`


#### MEDIUM: Missing input sanitization
- **File**: /Users/mattstratton/src/github.com/mattstratton/conducky/backend/src/routes/auth.routes.ts:290
- **Code**: `req.query.state`


#### MEDIUM: Missing input sanitization
- **File**: /Users/mattstratton/src/github.com/mattstratton/conducky/backend/src/routes/auth.routes.ts:290
- **Code**: `req.query.state`


#### MEDIUM: Missing input sanitization
- **File**: /Users/mattstratton/src/github.com/mattstratton/conducky/backend/src/routes/auth.routes.ts:291
- **Code**: `req.query.state`


#### MEDIUM: Missing input sanitization
- **File**: /Users/mattstratton/src/github.com/mattstratton/conducky/backend/src/routes/auth.routes.ts:295
- **Code**: `req.query.state`


#### MEDIUM: Missing input sanitization
- **File**: /Users/mattstratton/src/github.com/mattstratton/conducky/backend/src/routes/auth.routes.ts:328
- **Code**: `req.query.state`


#### MEDIUM: Missing input sanitization
- **File**: /Users/mattstratton/src/github.com/mattstratton/conducky/backend/src/routes/auth.routes.ts:328
- **Code**: `req.query.state`


#### MEDIUM: Missing input sanitization
- **File**: /Users/mattstratton/src/github.com/mattstratton/conducky/backend/src/routes/auth.routes.ts:330
- **Code**: `req.query.state`


#### MEDIUM: Missing input sanitization
- **File**: /Users/mattstratton/src/github.com/mattstratton/conducky/backend/src/routes/auth.routes.ts:336
- **Code**: `req.query.state`


#### MEDIUM: Missing input sanitization
- **File**: /Users/mattstratton/src/github.com/mattstratton/conducky/backend/src/routes/auth.routes.ts:336
- **Code**: `req.query.state`


#### MEDIUM: Missing input sanitization
- **File**: /Users/mattstratton/src/github.com/mattstratton/conducky/backend/src/routes/auth.routes.ts:337
- **Code**: `req.query.state`


#### MEDIUM: Missing input sanitization
- **File**: /Users/mattstratton/src/github.com/mattstratton/conducky/backend/src/routes/auth.routes.ts:357
- **Code**: `req.query.state`


#### MEDIUM: Missing input sanitization
- **File**: /Users/mattstratton/src/github.com/mattstratton/conducky/backend/src/routes/auth.routes.ts:357
- **Code**: `req.query.state`


#### MEDIUM: Missing input sanitization
- **File**: /Users/mattstratton/src/github.com/mattstratton/conducky/backend/src/routes/auth.routes.ts:358
- **Code**: `req.query.state`


#### MEDIUM: Missing input sanitization
- **File**: /Users/mattstratton/src/github.com/mattstratton/conducky/backend/src/routes/auth.routes.ts:362
- **Code**: `req.query.state`


#### MEDIUM: Missing input sanitization
- **File**: /Users/mattstratton/src/github.com/mattstratton/conducky/backend/src/routes/event.routes.ts:53
- **Code**: `req.query.search`


#### MEDIUM: Missing input sanitization
- **File**: /Users/mattstratton/src/github.com/mattstratton/conducky/backend/src/routes/event.routes.ts:54
- **Code**: `req.query.sort`


#### MEDIUM: Missing input sanitization
- **File**: /Users/mattstratton/src/github.com/mattstratton/conducky/backend/src/routes/event.routes.ts:55
- **Code**: `req.query.order`


#### MEDIUM: Missing input sanitization
- **File**: /Users/mattstratton/src/github.com/mattstratton/conducky/backend/src/routes/event.routes.ts:56
- **Code**: `req.query.page`


#### MEDIUM: Missing input sanitization
- **File**: /Users/mattstratton/src/github.com/mattstratton/conducky/backend/src/routes/event.routes.ts:56
- **Code**: `req.query.page`


#### MEDIUM: Missing input sanitization
- **File**: /Users/mattstratton/src/github.com/mattstratton/conducky/backend/src/routes/event.routes.ts:57
- **Code**: `req.query.limit`


#### MEDIUM: Missing input sanitization
- **File**: /Users/mattstratton/src/github.com/mattstratton/conducky/backend/src/routes/event.routes.ts:57
- **Code**: `req.query.limit`


#### MEDIUM: Missing input sanitization
- **File**: /Users/mattstratton/src/github.com/mattstratton/conducky/backend/src/routes/event.routes.ts:58
- **Code**: `req.query.role`


#### MEDIUM: Missing input sanitization
- **File**: /Users/mattstratton/src/github.com/mattstratton/conducky/backend/src/routes/event.routes.ts:108
- **Code**: `req.query.page`


#### MEDIUM: Missing input sanitization
- **File**: /Users/mattstratton/src/github.com/mattstratton/conducky/backend/src/routes/event.routes.ts:109
- **Code**: `req.query.limit`


#### MEDIUM: Missing input sanitization
- **File**: /Users/mattstratton/src/github.com/mattstratton/conducky/backend/src/routes/event.routes.ts:135
- **Code**: `req.query.page`


#### MEDIUM: Missing input sanitization
- **File**: /Users/mattstratton/src/github.com/mattstratton/conducky/backend/src/routes/event.routes.ts:136
- **Code**: `req.query.limit`


#### MEDIUM: Missing input sanitization
- **File**: /Users/mattstratton/src/github.com/mattstratton/conducky/backend/src/routes/event.routes.ts:137
- **Code**: `req.query.type`


#### MEDIUM: Missing input sanitization
- **File**: /Users/mattstratton/src/github.com/mattstratton/conducky/backend/src/routes/event.routes.ts:542
- **Code**: `req.query.page`


#### MEDIUM: Missing input sanitization
- **File**: /Users/mattstratton/src/github.com/mattstratton/conducky/backend/src/routes/event.routes.ts:543
- **Code**: `req.query.limit`


#### MEDIUM: Missing input sanitization
- **File**: /Users/mattstratton/src/github.com/mattstratton/conducky/backend/src/routes/event.routes.ts:544
- **Code**: `req.query.status`


#### MEDIUM: Missing input sanitization
- **File**: /Users/mattstratton/src/github.com/mattstratton/conducky/backend/src/routes/event.routes.ts:545
- **Code**: `req.query.priority`


#### MEDIUM: Missing input sanitization
- **File**: /Users/mattstratton/src/github.com/mattstratton/conducky/backend/src/routes/event.routes.ts:546
- **Code**: `req.query.search`


#### MEDIUM: Missing input sanitization
- **File**: /Users/mattstratton/src/github.com/mattstratton/conducky/backend/src/routes/event.routes.ts:1127
- **Code**: `req.query.page`


#### MEDIUM: Missing input sanitization
- **File**: /Users/mattstratton/src/github.com/mattstratton/conducky/backend/src/routes/event.routes.ts:1128
- **Code**: `req.query.limit`


#### MEDIUM: Missing input sanitization
- **File**: /Users/mattstratton/src/github.com/mattstratton/conducky/backend/src/routes/event.routes.ts:1131
- **Code**: `req.query.search`


#### MEDIUM: Missing input sanitization
- **File**: /Users/mattstratton/src/github.com/mattstratton/conducky/backend/src/routes/event.routes.ts:1132
- **Code**: `req.query.status`


#### MEDIUM: Missing input sanitization
- **File**: /Users/mattstratton/src/github.com/mattstratton/conducky/backend/src/routes/event.routes.ts:1133
- **Code**: `req.query.severity`


#### MEDIUM: Missing input sanitization
- **File**: /Users/mattstratton/src/github.com/mattstratton/conducky/backend/src/routes/event.routes.ts:1134
- **Code**: `req.query.assigned`


#### MEDIUM: Missing input sanitization
- **File**: /Users/mattstratton/src/github.com/mattstratton/conducky/backend/src/routes/event.routes.ts:1135
- **Code**: `req.query.sort`


#### MEDIUM: Missing input sanitization
- **File**: /Users/mattstratton/src/github.com/mattstratton/conducky/backend/src/routes/event.routes.ts:1136
- **Code**: `req.query.order`


#### MEDIUM: Missing input sanitization
- **File**: /Users/mattstratton/src/github.com/mattstratton/conducky/backend/src/routes/event.routes.ts:1137
- **Code**: `req.query.userId`


#### MEDIUM: Missing input sanitization
- **File**: /Users/mattstratton/src/github.com/mattstratton/conducky/backend/src/routes/event.routes.ts:1138
- **Code**: `req.query.includeStats`


#### MEDIUM: Missing input sanitization
- **File**: /Users/mattstratton/src/github.com/mattstratton/conducky/backend/src/routes/event.routes.ts:1199
- **Code**: `req.params.slug`


#### MEDIUM: Missing input sanitization
- **File**: /Users/mattstratton/src/github.com/mattstratton/conducky/backend/src/routes/event.routes.ts:1206
- **Code**: `req.query.format`


#### MEDIUM: Missing input sanitization
- **File**: /Users/mattstratton/src/github.com/mattstratton/conducky/backend/src/routes/event.routes.ts:1207
- **Code**: `req.query.ids`


#### MEDIUM: Missing input sanitization
- **File**: /Users/mattstratton/src/github.com/mattstratton/conducky/backend/src/routes/event.routes.ts:1233
- **Code**: `req.query.search`


#### MEDIUM: Missing input sanitization
- **File**: /Users/mattstratton/src/github.com/mattstratton/conducky/backend/src/routes/event.routes.ts:1234
- **Code**: `req.query.status`


#### MEDIUM: Missing input sanitization
- **File**: /Users/mattstratton/src/github.com/mattstratton/conducky/backend/src/routes/event.routes.ts:1235
- **Code**: `req.query.severity`


#### MEDIUM: Missing input sanitization
- **File**: /Users/mattstratton/src/github.com/mattstratton/conducky/backend/src/routes/event.routes.ts:1236
- **Code**: `req.query.assigned`


#### MEDIUM: Missing input sanitization
- **File**: /Users/mattstratton/src/github.com/mattstratton/conducky/backend/src/routes/event.routes.ts:1239
- **Code**: `req.query.userId`


#### MEDIUM: Missing input sanitization
- **File**: /Users/mattstratton/src/github.com/mattstratton/conducky/backend/src/routes/event.routes.ts:1381
- **Code**: `req.query.page`


#### MEDIUM: Missing input sanitization
- **File**: /Users/mattstratton/src/github.com/mattstratton/conducky/backend/src/routes/event.routes.ts:1382
- **Code**: `req.query.limit`


#### MEDIUM: Missing input sanitization
- **File**: /Users/mattstratton/src/github.com/mattstratton/conducky/backend/src/routes/event.routes.ts:1383
- **Code**: `req.query.status`


#### MEDIUM: Missing input sanitization
- **File**: /Users/mattstratton/src/github.com/mattstratton/conducky/backend/src/routes/event.routes.ts:1384
- **Code**: `req.query.search`


#### MEDIUM: Missing input sanitization
- **File**: /Users/mattstratton/src/github.com/mattstratton/conducky/backend/src/routes/event.routes.ts:1975
- **Code**: `req.query.page`


#### MEDIUM: Missing input sanitization
- **File**: /Users/mattstratton/src/github.com/mattstratton/conducky/backend/src/routes/event.routes.ts:1976
- **Code**: `req.query.limit`


#### MEDIUM: Missing input sanitization
- **File**: /Users/mattstratton/src/github.com/mattstratton/conducky/backend/src/routes/event.routes.ts:1977
- **Code**: `req.query.visibility`


#### MEDIUM: Missing input sanitization
- **File**: /Users/mattstratton/src/github.com/mattstratton/conducky/backend/src/routes/event.routes.ts:1978
- **Code**: `req.query.search`


#### MEDIUM: Missing input sanitization
- **File**: /Users/mattstratton/src/github.com/mattstratton/conducky/backend/src/routes/event.routes.ts:1979
- **Code**: `req.query.sortBy`


#### MEDIUM: Missing input sanitization
- **File**: /Users/mattstratton/src/github.com/mattstratton/conducky/backend/src/routes/event.routes.ts:1980
- **Code**: `req.query.sortOrder`


#### MEDIUM: Missing input sanitization
- **File**: /Users/mattstratton/src/github.com/mattstratton/conducky/backend/src/routes/user.routes.ts:121
- **Code**: `req.query.page`


#### MEDIUM: Missing input sanitization
- **File**: /Users/mattstratton/src/github.com/mattstratton/conducky/backend/src/routes/user.routes.ts:121
- **Code**: `req.query.page`


#### MEDIUM: Missing input sanitization
- **File**: /Users/mattstratton/src/github.com/mattstratton/conducky/backend/src/routes/user.routes.ts:122
- **Code**: `req.query.limit`


#### MEDIUM: Missing input sanitization
- **File**: /Users/mattstratton/src/github.com/mattstratton/conducky/backend/src/routes/user.routes.ts:122
- **Code**: `req.query.limit`


#### MEDIUM: Missing input sanitization
- **File**: /Users/mattstratton/src/github.com/mattstratton/conducky/backend/src/routes/user.routes.ts:139
- **Code**: `req.query.search`


#### MEDIUM: Missing input sanitization
- **File**: /Users/mattstratton/src/github.com/mattstratton/conducky/backend/src/routes/user.routes.ts:140
- **Code**: `req.query.status`


#### MEDIUM: Missing input sanitization
- **File**: /Users/mattstratton/src/github.com/mattstratton/conducky/backend/src/routes/user.routes.ts:141
- **Code**: `req.query.severity`


#### MEDIUM: Missing input sanitization
- **File**: /Users/mattstratton/src/github.com/mattstratton/conducky/backend/src/routes/user.routes.ts:142
- **Code**: `req.query.event`


#### MEDIUM: Missing input sanitization
- **File**: /Users/mattstratton/src/github.com/mattstratton/conducky/backend/src/routes/user.routes.ts:143
- **Code**: `req.query.assigned`


#### MEDIUM: Missing input sanitization
- **File**: /Users/mattstratton/src/github.com/mattstratton/conducky/backend/src/routes/user.routes.ts:144
- **Code**: `req.query.sort`


#### MEDIUM: Missing input sanitization
- **File**: /Users/mattstratton/src/github.com/mattstratton/conducky/backend/src/routes/user.routes.ts:145
- **Code**: `req.query.order`


#### MEDIUM: Missing input sanitization
- **File**: /Users/mattstratton/src/github.com/mattstratton/conducky/backend/src/utils/rbac.ts:164
- **Code**: `req.params.organizationId`


#### MEDIUM: Missing input sanitization
- **File**: /Users/mattstratton/src/github.com/mattstratton/conducky/backend/src/utils/rbac.ts:164
- **Code**: `req.params.orgId`


#### MEDIUM: Missing input sanitization
- **File**: /Users/mattstratton/src/github.com/mattstratton/conducky/backend/src/utils/rbac.ts:198
- **Code**: `req.params.eventId`


#### MEDIUM: Missing input sanitization
- **File**: /Users/mattstratton/src/github.com/mattstratton/conducky/backend/src/utils/rbac.ts:198
- **Code**: `req.params.id`


#### MEDIUM: Missing input sanitization
- **File**: /Users/mattstratton/src/github.com/mattstratton/conducky/backend/src/utils/rbac.ts:201
- **Code**: `req.params.slug`


#### MEDIUM: Missing input sanitization
- **File**: /Users/mattstratton/src/github.com/mattstratton/conducky/backend/src/utils/rbac.ts:203
- **Code**: `req.params.slug`


#### CRITICAL: Password in response
- **File**: /Users/mattstratton/src/github.com/mattstratton/conducky/backend/src/config/passport.ts:73
- **Code**: `password: string, done) => {
    try {
      const user = await prisma.user.findUnique({
        where: { email: email.toLowerCase() }
      });

      if (!user) {`


#### CRITICAL: Password in response
- **File**: /Users/mattstratton/src/github.com/mattstratton/conducky/backend/src/config/passport.ts:83
- **Code**: `user.password`


#### CRITICAL: Password in response
- **File**: /Users/mattstratton/src/github.com/mattstratton/conducky/backend/src/config/passport.ts:87
- **Code**: `user.password`


#### CRITICAL: Password in response
- **File**: /Users/mattstratton/src/github.com/mattstratton/conducky/backend/src/middleware/auth.ts:33
- **Code**: `password: string, done: any) => {
        try {
          const user = await prisma.user.findUnique({ where: { email } });
          if (!user || !user.passwordHash) {
            return done(null, false, { message:`


#### CRITICAL: Password in response
- **File**: /Users/mattstratton/src/github.com/mattstratton/conducky/backend/src/middleware/auth.ts:39
- **Code**: `user.password`


#### MEDIUM: Error message exposure
- **File**: /Users/mattstratton/src/github.com/mattstratton/conducky/backend/src/routes/auth.routes.ts:162
- **Code**: `res.status(500).json({ error: 'Debug failed', details: error.message`


#### MEDIUM: Error message exposure
- **File**: /Users/mattstratton/src/github.com/mattstratton/conducky/backend/src/routes/user.routes.ts:310
- **Code**: `res.status(500).json({ error: 'Failed to upload avatar.', details: error.message`


#### MEDIUM: Error message exposure
- **File**: /Users/mattstratton/src/github.com/mattstratton/conducky/backend/src/routes/user.routes.ts:337
- **Code**: `res.status(500).json({ error: 'Failed to delete avatar.', details: error.message`


#### CRITICAL: Password in response
- **File**: /Users/mattstratton/src/github.com/mattstratton/conducky/backend/src/services/auth.service.ts:24
- **Code**: `password: string;
  name: string;
}

export interface PasswordResetRequest {
  email: string;
}

export interface PasswordResetData {
  token: string;
  password: string;
}

export interface SessionData {
  user: {
    id: string;
    email: string;
    name: string;
    roles: string[];
    avatarUrl: string | null;
  };
}

export interface RateLimitResult {
  allowed: boolean;
  timeRemaining: number;
}

export class AuthService {
  private rbacService = new UnifiedRBACService();

  // Rate limiting for password reset attempts
  // Uses database for persistence across server restarts
  constructor(private prisma: PrismaClient) {}

  /**
   * Validate password strength requirements
   */
  validatePassword(password: string): PasswordValidation {
    const requirements = {
      length: password.length >= 8,
      uppercase: /[A-Z]/.test(password),
      lowercase: /[a-z]/.test(password),
      number: /\d/.test(password),
      special: /[!@#$%^&*()_+\-=[\]{};`


#### CRITICAL: Password in response
- **File**: /Users/mattstratton/src/github.com/mattstratton/conducky/backend/src/services/invite.service.ts:51
- **Code**: `password: string;
  name?: string;
}

export class InviteService {
  private unifiedRBAC: UnifiedRBACService;

  constructor(private prisma: PrismaClient) {
    this.unifiedRBAC = new UnifiedRBACService(prisma);
  }

  /**
   * Generate a unique invite code
   */
  private generateInviteCode(length = 8): string {
    const chars =`


#### CRITICAL: Password in response
- **File**: /Users/mattstratton/src/github.com/mattstratton/conducky/backend/src/services/invite.service.ts:77
- **Code**: `password: string): { isValid: boolean; errors: string[] } {
    const errors: string[] = [];
    
    if (password.length < 8) {
      errors.push(`


#### CRITICAL: Password in response
- **File**: /Users/mattstratton/src/github.com/mattstratton/conducky/backend/src/services/user.service.ts:102
- **Code**: `password: string) {
    const requirements = {
      length: password.length >= 8,
      uppercase: /[A-Z]/.test(password),
      lowercase: /[a-z]/.test(password),
      number: /\d/.test(password),
      special: /[!@#$%^&*()_+\-=[\]{};`


#### CRITICAL: Password in response
- **File**: /Users/mattstratton/src/github.com/mattstratton/conducky/backend/src/services/user.service.ts:215
- **Code**: `user.password`


#### CRITICAL: Password in response
- **File**: /Users/mattstratton/src/github.com/mattstratton/conducky/backend/src/services/user.service.ts:254
- **Code**: `password:`


#### CRITICAL: Password in response
- **File**: /Users/mattstratton/src/github.com/mattstratton/conducky/backend/src/utils/email.ts:311
- **Code**: `password:
${resetUrl}

This link will expire in 1 hour for security reasons.

If you didn`


#### CRITICAL: Password in response
- **File**: /Users/mattstratton/src/github.com/mattstratton/conducky/backend/src/utils/email.ts:351
- **Code**: `password:</p>
      
      <div style=`


#### CRITICAL: Password in response
- **File**: /Users/mattstratton/src/github.com/mattstratton/conducky/backend/src/utils/validation.ts:13
- **Code**: `password: string): { valid: boolean; error?: string } {
  if (!password || password.length < 8) {
    return { valid: false, error:`


#### HIGH: Missing rate limiting on auth endpoints
- **File**: /Users/mattstratton/src/github.com/mattstratton/conducky/backend/src/routes/auth.routes.ts:52
- **Code**: `router.post('/register', authRateLimit, authController.register.bind(authController));`


#### HIGH: Missing rate limiting on auth endpoints
- **File**: /Users/mattstratton/src/github.com/mattstratton/conducky/backend/src/routes/auth.routes.ts:55
- **Code**: `router.post('/register/invite/:inviteCode', authRateLimit, async (req: Request, res: Response): Promise<void> => {`


#### HIGH: Missing rate limiting on auth endpoints
- **File**: /Users/mattstratton/src/github.com/mattstratton/conducky/backend/src/routes/auth.routes.ts:87
- **Code**: `router.post('/login', authRateLimit, loginMiddleware);`


#### HIGH: Missing rate limiting on auth endpoints
- **File**: /Users/mattstratton/src/github.com/mattstratton/conducky/backend/src/routes/auth.routes.ts:170
- **Code**: `router.post('/forgot-password', passwordResetRateLimit, async (req: Request, res: Response): Promise<void> => {`


#### MEDIUM: Missing rate limiting on upload endpoints
- **File**: /Users/mattstratton/src/github.com/mattstratton/conducky/backend/src/routes/event.routes.ts:459
- **Code**: `uploadEvidence.array('evidence'), validateUploadedFiles, async (req: Request, res: Response): Promise<void> => {`


#### MEDIUM: Missing rate limiting on upload endpoints
- **File**: /Users/mattstratton/src/github.com/mattstratton/conducky/backend/src/routes/event.routes.ts:896
- **Code**: `uploadEvidence.array('evidence'), async (req: Request, res: Response): Promise<void> => {`


#### MEDIUM: Missing rate limiting on upload endpoints
- **File**: /Users/mattstratton/src/github.com/mattstratton/conducky/backend/src/routes/event.routes.ts:1003
- **Code**: `uploadLogo.single`


#### MEDIUM: Missing rate limiting on upload endpoints
- **File**: /Users/mattstratton/src/github.com/mattstratton/conducky/backend/src/routes/event.routes.ts:1410
- **Code**: `uploadEvidence.array('evidence'), async (req: Request, res: Response): Promise<void> => {`


#### MEDIUM: Missing rate limiting on upload endpoints
- **File**: /Users/mattstratton/src/github.com/mattstratton/conducky/backend/src/routes/event.routes.ts:1594
- **Code**: `uploadLogo.single`


#### MEDIUM: Missing rate limiting on upload endpoints
- **File**: /Users/mattstratton/src/github.com/mattstratton/conducky/backend/src/routes/event.routes.ts:2195
- **Code**: `uploadEvidence.array('evidence'), async (req: Request, res: Response): Promise<void> => {`


#### MEDIUM: Missing rate limiting on upload endpoints
- **File**: /Users/mattstratton/src/github.com/mattstratton/conducky/backend/src/routes/incident.routes.ts:41
- **Code**: `uploadEvidence.array('evidence'), async (req: Request, res: Response): Promise<void> => {`


#### MEDIUM: Missing rate limiting on upload endpoints
- **File**: /Users/mattstratton/src/github.com/mattstratton/conducky/backend/src/routes/organization.routes.ts:954
- **Code**: `uploadLogo.single`


#### MEDIUM: Missing rate limiting on upload endpoints
- **File**: /Users/mattstratton/src/github.com/mattstratton/conducky/backend/src/routes/organization.routes.ts:957
- **Code**: `uploadLogo.single`


#### MEDIUM: Missing rate limiting on upload endpoints
- **File**: /Users/mattstratton/src/github.com/mattstratton/conducky/backend/src/routes/user.routes.ts:276
- **Code**: `uploadAvatar.single`


#### HIGH: Missing HTTPS enforcement
- **File**: /Users/mattstratton/src/github.com/mattstratton/conducky/backend/src/config/session.ts:152
- **Code**: `secure: false`


#### HIGH: Missing HTTPS enforcement
- **File**: /Users/mattstratton/src/github.com/mattstratton/conducky/backend/src/utils/email.ts:135
- **Code**: `secure: false`


#### HIGH: Unrestricted file upload
- **File**: /Users/mattstratton/src/github.com/mattstratton/conducky/backend/src/routes/event.routes.ts:30
- **Code**: `multer setup for logo uploads`


#### HIGH: Unrestricted file upload
- **File**: /Users/mattstratton/src/github.com/mattstratton/conducky/backend/src/routes/event.routes.ts:37
- **Code**: `multer setup for evidence uploads`


#### HIGH: Unrestricted file upload
- **File**: /Users/mattstratton/src/github.com/mattstratton/conducky/backend/src/routes/event.routes.ts:501
- **Code**: `multerFiles = req.files as Express.Multer.File[] | undefined;`


#### HIGH: Unrestricted file upload
- **File**: /Users/mattstratton/src/github.com/mattstratton/conducky/backend/src/routes/event.routes.ts:502
- **Code**: `multerFiles?.map(file => ({`


#### HIGH: Unrestricted file upload
- **File**: /Users/mattstratton/src/github.com/mattstratton/conducky/backend/src/routes/event.routes.ts:1459
- **Code**: `multerFiles = req.files as Express.Multer.File[] | undefined;`


#### HIGH: Unrestricted file upload
- **File**: /Users/mattstratton/src/github.com/mattstratton/conducky/backend/src/routes/event.routes.ts:1460
- **Code**: `multerFiles?.map(file => ({`


#### MEDIUM: Missing file size limits
- **File**: /Users/mattstratton/src/github.com/mattstratton/conducky/backend/src/routes/event.routes.ts:30
- **Code**: `multer setup for logo uploads`


#### MEDIUM: Missing file size limits
- **File**: /Users/mattstratton/src/github.com/mattstratton/conducky/backend/src/routes/event.routes.ts:37
- **Code**: `multer setup for evidence uploads`


#### MEDIUM: Missing file size limits
- **File**: /Users/mattstratton/src/github.com/mattstratton/conducky/backend/src/routes/event.routes.ts:501
- **Code**: `multerFiles = req.files as Express.Multer.File[] | undefined;`


#### MEDIUM: Missing file size limits
- **File**: /Users/mattstratton/src/github.com/mattstratton/conducky/backend/src/routes/event.routes.ts:502
- **Code**: `multerFiles?.map(file => ({`


#### MEDIUM: Missing file size limits
- **File**: /Users/mattstratton/src/github.com/mattstratton/conducky/backend/src/routes/event.routes.ts:1459
- **Code**: `multerFiles = req.files as Express.Multer.File[] | undefined;`


#### MEDIUM: Missing file size limits
- **File**: /Users/mattstratton/src/github.com/mattstratton/conducky/backend/src/routes/event.routes.ts:1460
- **Code**: `multerFiles?.map(file => ({`


#### HIGH: Unrestricted file upload
- **File**: /Users/mattstratton/src/github.com/mattstratton/conducky/backend/src/routes/incident.routes.ts:4
- **Code**: `multer from 'multer';`


#### HIGH: Unrestricted file upload
- **File**: /Users/mattstratton/src/github.com/mattstratton/conducky/backend/src/routes/incident.routes.ts:16
- **Code**: `multer({`


#### HIGH: Unrestricted file upload
- **File**: /Users/mattstratton/src/github.com/mattstratton/conducky/backend/src/routes/incident.routes.ts:17
- **Code**: `multer.memoryStorage(),`


#### HIGH: Unrestricted file upload
- **File**: /Users/mattstratton/src/github.com/mattstratton/conducky/backend/src/routes/incident.routes.ts:50
- **Code**: `multer files to EvidenceFile format`


#### MEDIUM: Missing file size limits
- **File**: /Users/mattstratton/src/github.com/mattstratton/conducky/backend/src/routes/incident.routes.ts:4
- **Code**: `multer from 'multer';`


#### MEDIUM: Missing file size limits
- **File**: /Users/mattstratton/src/github.com/mattstratton/conducky/backend/src/routes/incident.routes.ts:16
- **Code**: `multer({`


#### MEDIUM: Missing file size limits
- **File**: /Users/mattstratton/src/github.com/mattstratton/conducky/backend/src/routes/incident.routes.ts:17
- **Code**: `multer.memoryStorage(),`


#### MEDIUM: Missing file size limits
- **File**: /Users/mattstratton/src/github.com/mattstratton/conducky/backend/src/routes/incident.routes.ts:50
- **Code**: `multer files to EvidenceFile format`


#### HIGH: Unrestricted file upload
- **File**: /Users/mattstratton/src/github.com/mattstratton/conducky/backend/src/routes/organization.routes.ts:15
- **Code**: `multer setup for logo uploads`


#### MEDIUM: Missing file size limits
- **File**: /Users/mattstratton/src/github.com/mattstratton/conducky/backend/src/routes/organization.routes.ts:15
- **Code**: `multer setup for logo uploads`


#### HIGH: Unrestricted file upload
- **File**: /Users/mattstratton/src/github.com/mattstratton/conducky/backend/src/routes/user.routes.ts:6
- **Code**: `multer from 'multer';`


#### HIGH: Unrestricted file upload
- **File**: /Users/mattstratton/src/github.com/mattstratton/conducky/backend/src/routes/user.routes.ts:19
- **Code**: `multer({`


#### HIGH: Unrestricted file upload
- **File**: /Users/mattstratton/src/github.com/mattstratton/conducky/backend/src/routes/user.routes.ts:20
- **Code**: `multer.memoryStorage(),`


#### MEDIUM: Missing file size limits
- **File**: /Users/mattstratton/src/github.com/mattstratton/conducky/backend/src/routes/user.routes.ts:6
- **Code**: `multer from 'multer';`


#### MEDIUM: Missing file size limits
- **File**: /Users/mattstratton/src/github.com/mattstratton/conducky/backend/src/routes/user.routes.ts:19
- **Code**: `multer({`


#### MEDIUM: Missing file size limits
- **File**: /Users/mattstratton/src/github.com/mattstratton/conducky/backend/src/routes/user.routes.ts:20
- **Code**: `multer.memoryStorage(),`


#### HIGH: Unrestricted file upload
- **File**: /Users/mattstratton/src/github.com/mattstratton/conducky/backend/src/utils/upload.ts:1
- **Code**: `multer = require("multer");`


#### HIGH: Unrestricted file upload
- **File**: /Users/mattstratton/src/github.com/mattstratton/conducky/backend/src/utils/upload.ts:88
- **Code**: `multer upload middleware with specified configuration`


#### HIGH: Unrestricted file upload
- **File**: /Users/mattstratton/src/github.com/mattstratton/conducky/backend/src/utils/upload.ts:90
- **Code**: `multer middleware`


#### HIGH: Unrestricted file upload
- **File**: /Users/mattstratton/src/github.com/mattstratton/conducky/backend/src/utils/upload.ts:92
- **Code**: `multer.Multer {`


#### HIGH: Unrestricted file upload
- **File**: /Users/mattstratton/src/github.com/mattstratton/conducky/backend/src/utils/upload.ts:95
- **Code**: `multer({`


#### HIGH: Unrestricted file upload
- **File**: /Users/mattstratton/src/github.com/mattstratton/conducky/backend/src/utils/upload.ts:96
- **Code**: `multer.memoryStorage(),`


#### HIGH: Unrestricted file upload
- **File**: /Users/mattstratton/src/github.com/mattstratton/conducky/backend/src/utils/upload.ts:102
- **Code**: `multer.FileFilterCallback) => {`


#### HIGH: Unrestricted file upload
- **File**: /Users/mattstratton/src/github.com/mattstratton/conducky/backend/src/utils/upload.ts:124
- **Code**: `multer processing`


#### MEDIUM: Missing file size limits
- **File**: /Users/mattstratton/src/github.com/mattstratton/conducky/backend/src/utils/upload.ts:1
- **Code**: `multer = require("multer");`


#### MEDIUM: Missing file size limits
- **File**: /Users/mattstratton/src/github.com/mattstratton/conducky/backend/src/utils/upload.ts:88
- **Code**: `multer upload middleware with specified configuration`


#### MEDIUM: Missing file size limits
- **File**: /Users/mattstratton/src/github.com/mattstratton/conducky/backend/src/utils/upload.ts:90
- **Code**: `multer middleware`


#### MEDIUM: Missing file size limits
- **File**: /Users/mattstratton/src/github.com/mattstratton/conducky/backend/src/utils/upload.ts:92
- **Code**: `multer.Multer {`


#### MEDIUM: Missing file size limits
- **File**: /Users/mattstratton/src/github.com/mattstratton/conducky/backend/src/utils/upload.ts:95
- **Code**: `multer({`


#### MEDIUM: Missing file size limits
- **File**: /Users/mattstratton/src/github.com/mattstratton/conducky/backend/src/utils/upload.ts:96
- **Code**: `multer.memoryStorage(),`


#### MEDIUM: Missing file size limits
- **File**: /Users/mattstratton/src/github.com/mattstratton/conducky/backend/src/utils/upload.ts:102
- **Code**: `multer.FileFilterCallback) => {`


#### MEDIUM: Missing file size limits
- **File**: /Users/mattstratton/src/github.com/mattstratton/conducky/backend/src/utils/upload.ts:124
- **Code**: `multer processing`


## Recommendations

### Immediate Actions (Critical/High)

- Review and fix all critical and high severity issues
- Ensure no sensitive data is exposed in error messages
- Verify authentication is required on all protected endpoints


### Near-term Actions (Medium)

- Improve error message sanitization
- Add additional input validation
- Review rate limiting coverage


### Security Best Practices
- Regular dependency updates and vulnerability scanning
- Code review focusing on security concerns
- Penetration testing before major releases
- Security headers validation
- Input validation on all user inputs

## Compliance
- OWASP Top 10 considerations addressed
- Data protection measures in place
- Audit logging implemented
- Authentication and authorization enforced

## Next Steps
1. Address any critical/high severity issues
2. Implement additional security monitoring
3. Schedule regular security audits
4. Update dependency vulnerability scanning

---
*This report was generated automatically. Manual security review recommended.*

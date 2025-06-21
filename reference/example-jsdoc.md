# JSDoc Examples for Conducky API Documentation

This file contains comprehensive JSDoc comment examples for documenting Conducky's API endpoints. These comments are used to automatically generate OpenAPI specifications and interactive API documentation.

## Table of Contents

- [Authentication Routes](#authentication-routes)
- [Event Routes](#event-routes)
- [Report Routes](#report-routes)
- [User Management Routes](#user-management-routes)
- [Best Practices](#best-practices)
- [Workflow](#workflow)

## Authentication Routes

### Login Endpoint

```typescript
/**
 * @swagger
 * /api/auth/login:
 *   post:
 *     tags: [Authentication]
 *     summary: User login
 *     description: Authenticate a user with email and password. Creates a session cookie upon successful login.
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - email
 *               - password
 *             properties:
 *               email:
 *                 type: string
 *                 format: email
 *                 description: User's email address
 *                 example: user@example.com
 *               password:
 *                 type: string
 *                 format: password
 *                 description: User's password
 *                 example: securePassword123
 *     responses:
 *       200:
 *         description: Login successful
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: Login successful
 *                 user:
 *                   $ref: '#/components/schemas/User'
 *         headers:
 *           Set-Cookie:
 *             description: Session cookie
 *             schema:
 *               type: string
 *               example: connect.sid=s%3A...; Path=/; HttpOnly
 *       400:
 *         description: Invalid credentials or missing fields
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *             examples:
 *               missing_fields:
 *                 summary: Missing required fields
 *                 value:
 *                   error: Email and password are required
 *               invalid_credentials:
 *                 summary: Invalid login credentials
 *                 value:
 *                   error: Invalid email or password
 *       429:
 *         description: Too many login attempts
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *             example:
 *               error: Too many login attempts. Please try again later.
 *       500:
 *         description: Internal server error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.post('/login', loginMiddleware);
```

### Logout Endpoint

```typescript
/**
 * @swagger
 * /api/auth/logout:
 *   post:
 *     tags: [Authentication]
 *     summary: User logout
 *     description: Logout the current user and destroy the session
 *     security:
 *       - sessionAuth: []
 *     responses:
 *       200:
 *         description: Logout successful
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: Logout successful
 *       401:
 *         description: Not authenticated
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       500:
 *         description: Internal server error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.post('/logout', logoutMiddleware);
```

### Session Status Endpoint

```typescript
/**
 * @swagger
 * /api/auth/session:
 *   get:
 *     tags: [Authentication]
 *     summary: Get current session status
 *     description: Check if the user is authenticated and return user information
 *     security:
 *       - sessionAuth: []
 *     responses:
 *       200:
 *         description: Session status retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               oneOf:
 *                 - type: object
 *                   properties:
 *                     authenticated:
 *                       type: boolean
 *                       example: true
 *                     user:
 *                       $ref: '#/components/schemas/User'
 *                 - type: object
 *                   properties:
 *                     authenticated:
 *                       type: boolean
 *                       example: false
 *       500:
 *         description: Internal server error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.get('/session', async (req: any, res: Response): Promise<void> => {
```

## Event Routes

### Get All Events

```typescript
/**
 * @swagger
 * /api/events:
 *   get:
 *     tags: [Events]
 *     summary: Get all events
 *     description: Retrieve a list of events accessible to the authenticated user. SuperAdmins see all events, others see only events they have roles in.
 *     security:
 *       - sessionAuth: []
 *     parameters:
 *       - in: query
 *         name: search
 *         schema:
 *           type: string
 *         description: Search term for event name or description
 *         example: "DevConf 2024"
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *           enum: [active, inactive, upcoming, past]
 *         description: Filter events by status
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           minimum: 1
 *           default: 1
 *         description: Page number for pagination
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           minimum: 1
 *           maximum: 100
 *           default: 20
 *         description: Number of events per page
 *       - in: query
 *         name: sort
 *         schema:
 *           type: string
 *           enum: [name, startDate, endDate, createdAt]
 *           default: createdAt
 *         description: Field to sort by
 *       - in: query
 *         name: order
 *         schema:
 *           type: string
 *           enum: [asc, desc]
 *           default: desc
 *         description: Sort order
 *     responses:
 *       200:
 *         description: Events retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 events:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/Event'
 *                 pagination:
 *                   type: object
 *                   properties:
 *                     page:
 *                       type: integer
 *                       example: 1
 *                     limit:
 *                       type: integer
 *                       example: 20
 *                     total:
 *                       type: integer
 *                       example: 45
 *                     totalPages:
 *                       type: integer
 *                       example: 3
 *       401:
 *         description: Not authenticated
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       500:
 *         description: Internal server error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.get('/', requireAuth, async (req: Request, res: Response): Promise<void> => {
```

### Create New Event

```typescript
/**
 * @swagger
 * /api/events:
 *   post:
 *     tags: [Events]
 *     summary: Create a new event
 *     description: Create a new event. Only SuperAdmins can create events.
 *     security:
 *       - sessionAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - name
 *               - slug
 *               - startDate
 *               - endDate
 *             properties:
 *               name:
 *                 type: string
 *                 description: Event name
 *                 example: "DevConf 2024"
 *                 minLength: 1
 *                 maxLength: 255
 *               slug:
 *                 type: string
 *                 description: URL-friendly event identifier
 *                 example: "devconf-2024"
 *                 pattern: "^[a-z0-9-]+$"
 *               description:
 *                 type: string
 *                 description: Event description
 *                 example: "Annual developer conference"
 *               startDate:
 *                 type: string
 *                 format: date-time
 *                 description: Event start date and time
 *                 example: "2024-06-15T09:00:00Z"
 *               endDate:
 *                 type: string
 *                 format: date-time
 *                 description: Event end date and time
 *                 example: "2024-06-17T18:00:00Z"
 *               location:
 *                 type: string
 *                 description: Event location
 *                 example: "Prague, Czech Republic"
 *               website:
 *                 type: string
 *                 format: uri
 *                 description: Event website URL
 *                 example: "https://devconf.cz"
 *               isActive:
 *                 type: boolean
 *                 description: Whether the event is active
 *                 default: true
 *     responses:
 *       201:
 *         description: Event created successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: Event created successfully
 *                 event:
 *                   $ref: '#/components/schemas/Event'
 *       400:
 *         description: Invalid input data
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *             examples:
 *               missing_fields:
 *                 summary: Missing required fields
 *                 value:
 *                   error: Name, slug, start date, and end date are required
 *               duplicate_slug:
 *                 summary: Slug already exists
 *                 value:
 *                   error: Event with this slug already exists
 *               invalid_dates:
 *                 summary: Invalid date range
 *                 value:
 *                   error: End date must be after start date
 *       401:
 *         description: Not authenticated
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       403:
 *         description: Insufficient permissions
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       500:
 *         description: Internal server error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.post('/', requireRole(['SuperAdmin']), async (req: Request, res: Response): Promise<void> => {
```

## Report Routes

### Get Reports for Event

```typescript
/**
 * @swagger
 * /api/events/{eventSlug}/reports:
 *   get:
 *     tags: [Reports]
 *     summary: Get reports for an event
 *     description: Retrieve reports for a specific event. Access level depends on user role.
 *     security:
 *       - sessionAuth: []
 *     parameters:
 *       - in: path
 *         name: eventSlug
 *         required: true
 *         schema:
 *           type: string
 *         description: Event slug identifier
 *         example: "devconf-2024"
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *           enum: [open, in_progress, resolved, closed]
 *         description: Filter reports by status
 *       - in: query
 *         name: priority
 *         schema:
 *           type: string
 *           enum: [low, medium, high, critical]
 *         description: Filter reports by priority
 *       - in: query
 *         name: assignedTo
 *         schema:
 *           type: string
 *         description: Filter reports by assigned user ID
 *       - in: query
 *         name: search
 *         schema:
 *           type: string
 *         description: Search in report titles and descriptions
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           minimum: 1
 *           default: 1
 *         description: Page number for pagination
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           minimum: 1
 *           maximum: 100
 *           default: 20
 *         description: Number of reports per page
 *     responses:
 *       200:
 *         description: Reports retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 reports:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/Report'
 *                 pagination:
 *                   type: object
 *                   properties:
 *                     page:
 *                       type: integer
 *                     limit:
 *                       type: integer
 *                     total:
 *                       type: integer
 *                     totalPages:
 *                       type: integer
 *       401:
 *         description: Not authenticated
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       403:
 *         description: Insufficient permissions for this event
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       404:
 *         description: Event not found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       500:
 *         description: Internal server error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.get('/slug/:slug/reports', requireRole(['Reporter', 'Responder', 'Admin', 'SuperAdmin']), async (req: Request, res: Response): Promise<void> => {
```

### Create New Report

```typescript
/**
 * @swagger
 * /api/events/{eventSlug}/reports:
 *   post:
 *     tags: [Reports]
 *     summary: Create a new report
 *     description: Submit a new incident report for an event. Can be submitted anonymously or by authenticated users.
 *     security:
 *       - sessionAuth: []
 *     parameters:
 *       - in: path
 *         name: eventSlug
 *         required: true
 *         schema:
 *           type: string
 *         description: Event slug identifier
 *         example: "devconf-2024"
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             required:
 *               - title
 *               - description
 *             properties:
 *               title:
 *                 type: string
 *                 description: Brief title of the incident
 *                 example: "Inappropriate behavior at networking event"
 *                 maxLength: 255
 *               description:
 *                 type: string
 *                 description: Detailed description of the incident
 *                 example: "During the networking session, an attendee made inappropriate comments..."
 *               contactEmail:
 *                 type: string
 *                 format: email
 *                 description: Contact email for follow-up (optional for anonymous reports)
 *                 example: "reporter@example.com"
 *               contactPhone:
 *                 type: string
 *                 description: Contact phone number (optional)
 *                 example: "+1-555-0123"
 *               isAnonymous:
 *                 type: boolean
 *                 description: Whether to submit the report anonymously
 *                 default: false
 *               priority:
 *                 type: string
 *                 enum: [low, medium, high, critical]
 *                 description: Report priority level
 *                 default: medium
 *               evidence:
 *                 type: array
 *                 items:
 *                   type: string
 *                   format: binary
 *                 description: Evidence files (images, documents)
 *                 maxItems: 5
 *     responses:
 *       201:
 *         description: Report created successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: Report submitted successfully
 *                 report:
 *                   $ref: '#/components/schemas/Report'
 *                 reportId:
 *                   type: string
 *                   description: Unique report identifier for tracking
 *                   example: "RPT-2024-001"
 *       400:
 *         description: Invalid input data
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *             examples:
 *               missing_fields:
 *                 summary: Missing required fields
 *                 value:
 *                   error: Title and description are required
 *               file_too_large:
 *                 summary: File size exceeded
 *                 value:
 *                   error: File size exceeds 10MB limit
 *               invalid_file_type:
 *                 summary: Invalid file type
 *                 value:
 *                   error: Only images and PDF files are allowed
 *       401:
 *         description: Not authenticated (for non-anonymous reports)
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       404:
 *         description: Event not found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       413:
 *         description: Payload too large
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       500:
 *         description: Internal server error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.post('/slug/:slug/reports', uploadEvidence.array('evidence', 5), validateUploadedFiles, async (req: Request, res: Response): Promise<void> => {
```

## User Management Routes

### Get All Users

```typescript
/**
 * @swagger
 * /api/users:
 *   get:
 *     tags: [Users]
 *     summary: Get all users (SuperAdmin only)
 *     description: Retrieve a list of all users in the system. Only accessible to SuperAdmins.
 *     security:
 *       - sessionAuth: []
 *     parameters:
 *       - in: query
 *         name: search
 *         schema:
 *           type: string
 *         description: Search term for user name or email
 *         example: "john.doe"
 *       - in: query
 *         name: role
 *         schema:
 *           type: string
 *           enum: [SuperAdmin, Admin, Responder, Reporter]
 *         description: Filter users by role
 *       - in: query
 *         name: isActive
 *         schema:
 *           type: boolean
 *         description: Filter users by active status
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           minimum: 1
 *           default: 1
 *         description: Page number for pagination
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           minimum: 1
 *           maximum: 100
 *           default: 20
 *         description: Number of users per page
 *       - in: query
 *         name: sort
 *         schema:
 *           type: string
 *           enum: [name, email, createdAt, lastLogin]
 *           default: createdAt
 *         description: Field to sort by
 *       - in: query
 *         name: order
 *         schema:
 *           type: string
 *           enum: [asc, desc]
 *           default: desc
 *         description: Sort order
 *     responses:
 *       200:
 *         description: Users retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 users:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/User'
 *                 pagination:
 *                   type: object
 *                   properties:
 *                     page:
 *                       type: integer
 *                     limit:
 *                       type: integer
 *                     total:
 *                       type: integer
 *                     totalPages:
 *                       type: integer
 *       401:
 *         description: Not authenticated
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       403:
 *         description: Insufficient permissions (SuperAdmin required)
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       500:
 *         description: Internal server error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.get('/', requireRole(['SuperAdmin']), async (req: Request, res: Response): Promise<void> => {
```

## Best Practices

### 1. Consistent Structure
- Always include `tags` for grouping endpoints
- Use descriptive `summary` and `description` fields
- Include `security` requirements where appropriate

### 2. Parameter Documentation
- Document all path parameters as `required: true`
- Include query parameters with appropriate types and constraints
- Provide realistic examples for all parameters

### 3. Request Body Documentation
- Use `required: true` for mandatory request bodies
- Define complete schemas with validation rules
- Include examples for all properties

### 4. Response Documentation
- Document all possible HTTP status codes
- Include complete response schemas
- Provide multiple examples for different scenarios
- Use `$ref` to reference common schemas

### 5. Error Handling
- Document all error scenarios with appropriate status codes
- Use consistent error response format
- Include helpful error messages and examples

### 6. Security Documentation
- Always specify authentication requirements
- Document role-based access control
- Include security-related error responses

## Workflow

### 1. Add JSDoc Comments
Add the appropriate JSDoc comments above your route handlers in the route files.

### 2. Generate OpenAPI Specification
```bash
cd backend
npm run generate-docs
```

### 3. Generate API Documentation
```bash
cd website
npm run gen-api-docs conducky
```

### 4. Build and Test
```bash
npm run build
npm run start
```

### 5. Verify Documentation
- Visit http://localhost:3000 for the documentation site
- Navigate to Developer Docs → API Reference
- Test the interactive features

## Schema References

The following schemas are available for reference in your JSDoc comments:

- `#/components/schemas/User` - User entity
- `#/components/schemas/Event` - Event entity  
- `#/components/schemas/Report` - Report entity
- `#/components/schemas/Error` - Standard error response

These schemas are defined in `backend/src/config/swagger.ts` and can be extended as needed. 
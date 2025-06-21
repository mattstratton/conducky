import { Router } from 'express';
import { OrganizationController } from '../controllers/organization.controller';
import { requireAuth } from '../middleware/auth';
import { requireSuperAdmin } from '../utils/rbac';
import { createUploadMiddleware } from '../utils/upload';

const router = Router();
const organizationController = new OrganizationController();

// Secure multer setup for logo uploads
const uploadLogo = createUploadMiddleware({
  maxSizeMB: 5, // 5MB limit
  allowedMimeTypes: ['image/jpeg', 'image/png', 'image/gif', 'image/webp'],
  allowedExtensions: ['jpg', 'jpeg', 'png', 'gif', 'webp']
});

/**
 * Public Organization Invite Routes (no auth required)
 */

/**
 * @swagger
 * /api/organizations/invite/{code}:
 *   get:
 *     tags: [Organizations]
 *     summary: Get organization invite details
 *     description: Retrieve details about an organization invite link using the invite code. This is a public endpoint that doesn't require authentication.
 *     parameters:
 *       - in: path
 *         name: code
 *         required: true
 *         schema:
 *           type: string
 *         description: The unique invite code
 *         example: "abc123def456"
 *     responses:
 *       200:
 *         description: Invite details retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 organization:
 *                   $ref: '#/components/schemas/Organization'
 *                 invite:
 *                   type: object
 *                   properties:
 *                     id:
 *                       type: string
 *                       format: uuid
 *                     code:
 *                       type: string
 *                     role:
 *                       type: string
 *                       enum: [org_admin, org_viewer]
 *                     expiresAt:
 *                       type: string
 *                       format: date-time
 *                       nullable: true
 *                     maxUses:
 *                       type: integer
 *                       nullable: true
 *                     useCount:
 *                       type: integer
 *       404:
 *         description: Invite not found or expired
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
router.get('/invite/:code', organizationController.getInviteDetails.bind(organizationController));

// All other routes require authentication
router.use(requireAuth);

/**
 * Organization Management Routes
 */

/**
 * @swagger
 * /api/organizations:
 *   post:
 *     tags: [Organizations]
 *     summary: Create a new organization
 *     description: Create a new organization. Only SuperAdmins can create organizations.
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
 *             properties:
 *               name:
 *                 type: string
 *                 description: Organization name
 *                 example: "DevConf Organization"
 *                 minLength: 1
 *                 maxLength: 255
 *               slug:
 *                 type: string
 *                 description: URL-friendly organization identifier
 *                 example: "devconf-org"
 *                 pattern: "^[a-z0-9-]+$"
 *               description:
 *                 type: string
 *                 description: Organization description
 *                 example: "Organization managing developer conferences"
 *               website:
 *                 type: string
 *                 format: uri
 *                 description: Organization website URL
 *                 example: "https://devconf.org"
 *     responses:
 *       201:
 *         description: Organization created successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: Organization created successfully
 *                 organization:
 *                   $ref: '#/components/schemas/Organization'
 *       400:
 *         description: Invalid input data
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
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
router.post('/', requireSuperAdmin(), organizationController.createOrganization.bind(organizationController));

/**
 * @swagger
 * /api/organizations:
 *   get:
 *     tags: [Organizations]
 *     summary: List all organizations
 *     description: Retrieve a list of all organizations in the system. Only accessible to SuperAdmins.
 *     security:
 *       - sessionAuth: []
 *     parameters:
 *       - in: query
 *         name: search
 *         schema:
 *           type: string
 *         description: Search term for organization name or description
 *         example: "DevConf"
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
 *         description: Number of organizations per page
 *     responses:
 *       200:
 *         description: Organizations retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 organizations:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/Organization'
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
router.get('/', requireSuperAdmin(), organizationController.listOrganizations.bind(organizationController));

/**
 * @swagger
 * /api/organizations/me:
 *   get:
 *     tags: [Organizations]
 *     summary: Get user's organizations
 *     description: Retrieve organizations that the authenticated user is a member of.
 *     security:
 *       - sessionAuth: []
 *     responses:
 *       200:
 *         description: User organizations retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 organizations:
 *                   type: array
 *                   items:
 *                     allOf:
 *                       - $ref: '#/components/schemas/Organization'
 *                       - type: object
 *                         properties:
 *                           membership:
 *                             type: object
 *                             properties:
 *                               role:
 *                                 type: string
 *                                 enum: [org_admin, org_viewer]
 *                               createdAt:
 *                                 type: string
 *                                 format: date-time
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
router.get('/me', organizationController.getUserOrganizations.bind(organizationController));

/**
 * @swagger
 * /api/organizations/slug/{orgSlug}:
 *   get:
 *     tags: [Organizations]
 *     summary: Get organization by slug
 *     description: Retrieve organization details using the organization slug. User must be a member of the organization.
 *     security:
 *       - sessionAuth: []
 *     parameters:
 *       - in: path
 *         name: orgSlug
 *         required: true
 *         schema:
 *           type: string
 *         description: Organization slug identifier
 *         example: "devconf-org"
 *     responses:
 *       200:
 *         description: Organization retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 organization:
 *                   $ref: '#/components/schemas/Organization'
 *       401:
 *         description: Not authenticated
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       403:
 *         description: Access denied - not a member of this organization
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       404:
 *         description: Organization not found
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
router.get('/slug/:orgSlug', organizationController.getOrganizationBySlug.bind(organizationController));

/**
 * @swagger
 * /api/organizations/{organizationId}:
 *   get:
 *     tags: [Organizations]
 *     summary: Get organization by ID
 *     description: Retrieve organization details using the organization ID. User must be a member of the organization.
 *     security:
 *       - sessionAuth: []
 *     parameters:
 *       - in: path
 *         name: organizationId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: Organization ID
 *         example: "123e4567-e89b-12d3-a456-426614174000"
 *     responses:
 *       200:
 *         description: Organization retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Organization'
 *       401:
 *         description: Not authenticated
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       403:
 *         description: Access denied - not a member of this organization
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       404:
 *         description: Organization not found
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
 *   put:
 *     tags: [Organizations]
 *     summary: Update organization
 *     description: Update organization details. Only organization admins can update organizations.
 *     security:
 *       - sessionAuth: []
 *     parameters:
 *       - in: path
 *         name: organizationId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: Organization ID
 *         example: "123e4567-e89b-12d3-a456-426614174000"
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               name:
 *                 type: string
 *                 description: Organization name
 *                 example: "Updated DevConf Organization"
 *               description:
 *                 type: string
 *                 description: Organization description
 *                 example: "Updated organization description"
 *               website:
 *                 type: string
 *                 format: uri
 *                 description: Organization website URL
 *                 example: "https://updated-devconf.org"
 *     responses:
 *       200:
 *         description: Organization updated successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: Organization updated successfully
 *                 organization:
 *                   $ref: '#/components/schemas/Organization'
 *       400:
 *         description: Invalid input data
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       401:
 *         description: Not authenticated
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       403:
 *         description: Insufficient permissions (Organization Admin required)
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       404:
 *         description: Organization not found
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
 *   delete:
 *     tags: [Organizations]
 *     summary: Delete organization
 *     description: Delete an organization and all its associated data. Only SuperAdmins can delete organizations.
 *     security:
 *       - sessionAuth: []
 *     parameters:
 *       - in: path
 *         name: organizationId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: Organization ID
 *         example: "123e4567-e89b-12d3-a456-426614174000"
 *     responses:
 *       200:
 *         description: Organization deleted successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: Organization deleted successfully
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
 *       404:
 *         description: Organization not found
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
router.get('/:organizationId', organizationController.getOrganization.bind(organizationController));

router.put('/:organizationId', organizationController.updateOrganization.bind(organizationController));

router.delete('/:organizationId', requireSuperAdmin(), organizationController.deleteOrganization.bind(organizationController));

/**
 * Organization Membership Routes
 */

/**
 * @swagger
 * /api/organizations/{organizationId}/members:
 *   post:
 *     tags: [Organizations]
 *     summary: Add member to organization
 *     description: Add a new member to an organization. Only organization admins can add members.
 *     security:
 *       - sessionAuth: []
 *     parameters:
 *       - in: path
 *         name: organizationId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: Organization ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - userId
 *               - role
 *             properties:
 *               userId:
 *                 type: string
 *                 format: uuid
 *                 description: User ID to add as member
 *               role:
 *                 type: string
 *                 enum: [org_admin, org_viewer]
 *                 description: Role to assign to the member
 *     responses:
 *       201:
 *         description: Member added successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: Member added successfully
 *       400:
 *         description: Invalid input or user already a member
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
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
 *       404:
 *         description: Organization or user not found
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
router.post('/:organizationId/members', organizationController.addMember.bind(organizationController));

/**
 * @swagger
 * /api/organizations/{organizationId}/members/{userId}:
 *   put:
 *     tags: [Organizations]
 *     summary: Update member role
 *     description: Update a member's role in an organization. Only organization admins can update member roles.
 *     security:
 *       - sessionAuth: []
 *     parameters:
 *       - in: path
 *         name: organizationId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: Organization ID
 *       - in: path
 *         name: userId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: User ID of the member
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - role
 *             properties:
 *               role:
 *                 type: string
 *                 enum: [org_admin, org_viewer]
 *                 description: New role for the member
 *     responses:
 *       200:
 *         description: Member role updated successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: Member role updated successfully
 *       400:
 *         description: Invalid input data
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
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
 *       404:
 *         description: Organization or member not found
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
 *   delete:
 *     tags: [Organizations]
 *     summary: Remove member from organization
 *     description: Remove a member from an organization. Only organization admins can remove members.
 *     security:
 *       - sessionAuth: []
 *     parameters:
 *       - in: path
 *         name: organizationId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: Organization ID
 *       - in: path
 *         name: userId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: User ID of the member to remove
 *     responses:
 *       200:
 *         description: Member removed successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: Member removed successfully
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
 *       404:
 *         description: Organization or member not found
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
router.put('/:organizationId/members/:userId', organizationController.updateMemberRole.bind(organizationController));

router.delete('/:organizationId/members/:userId', organizationController.removeMember.bind(organizationController));

/**
 * Organization Events Routes
 */

/**
 * @swagger
 * /api/organizations/{organizationId}/events:
 *   post:
 *     tags: [Organizations]
 *     summary: Create event in organization
 *     description: Create a new event within an organization. Only organization admins can create events.
 *     security:
 *       - sessionAuth: []
 *     parameters:
 *       - in: path
 *         name: organizationId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: Organization ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - name
 *               - slug
 *             properties:
 *               name:
 *                 type: string
 *                 description: Event name
 *                 example: "DevConf 2024"
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
 *                 description: Event start date
 *               endDate:
 *                 type: string
 *                 format: date-time
 *                 description: Event end date
 *               website:
 *                 type: string
 *                 format: uri
 *                 description: Event website URL
 *               contactEmail:
 *                 type: string
 *                 format: email
 *                 description: Contact email for the event
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
 *       404:
 *         description: Organization not found
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
 *   get:
 *     tags: [Organizations]
 *     summary: List organization events
 *     description: Retrieve events belonging to an organization. Users must be members of the organization.
 *     security:
 *       - sessionAuth: []
 *     parameters:
 *       - in: path
 *         name: organizationId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: Organization ID
 *       - in: query
 *         name: search
 *         schema:
 *           type: string
 *         description: Search term for event name or description
 *       - in: query
 *         name: isActive
 *         schema:
 *           type: boolean
 *         description: Filter by active status
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
 *         description: Access denied
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       404:
 *         description: Organization not found
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
router.post('/:organizationId/events', organizationController.createEvent.bind(organizationController));

router.get('/:organizationId/events', organizationController.getEvents.bind(organizationController));

/**
 * Organization Logo Routes
 */

// Upload organization logo (Org Admin only)
router.post('/:organizationId/logo', uploadLogo.single('logo'), organizationController.uploadLogo.bind(organizationController));

// Upload organization logo by slug (Org Admin only)
router.post('/slug/:orgSlug/logo', uploadLogo.single('logo'), organizationController.uploadLogoBySlug.bind(organizationController));

// Get organization logo
router.get('/:organizationId/logo', organizationController.getLogo.bind(organizationController));

// Get organization logo by slug
router.get('/slug/:orgSlug/logo', organizationController.getLogoBySlug.bind(organizationController));

/**
 * Organization Invite Routes
 */

/**
 * @swagger
 * /api/organizations/{organizationId}/invites:
 *   post:
 *     tags: [Organizations]
 *     summary: Create organization invite link
 *     description: Create a new invite link for an organization. Only organization admins can create invite links.
 *     security:
 *       - sessionAuth: []
 *     parameters:
 *       - in: path
 *         name: organizationId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: Organization ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - role
 *             properties:
 *               role:
 *                 type: string
 *                 enum: [org_admin, org_viewer]
 *                 description: Role to assign when invite is used
 *               expiresAt:
 *                 type: string
 *                 format: date-time
 *                 description: Optional expiration date for the invite
 *               maxUses:
 *                 type: integer
 *                 minimum: 1
 *                 description: Optional maximum number of times the invite can be used
 *               note:
 *                 type: string
 *                 description: Optional note about the invite
 *     responses:
 *       201:
 *         description: Invite link created successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: Invite link created successfully
 *                 invite:
 *                   type: object
 *                   properties:
 *                     id:
 *                       type: string
 *                       format: uuid
 *                     code:
 *                       type: string
 *                     role:
 *                       type: string
 *                       enum: [org_admin, org_viewer]
 *                     expiresAt:
 *                       type: string
 *                       format: date-time
 *                       nullable: true
 *                     maxUses:
 *                       type: integer
 *                       nullable: true
 *                     note:
 *                       type: string
 *                       nullable: true
 *       400:
 *         description: Invalid input data
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
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
 *       404:
 *         description: Organization not found
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
 *   get:
 *     tags: [Organizations]
 *     summary: Get organization invite links
 *     description: Retrieve all invite links for an organization. Only organization admins can view invite links.
 *     security:
 *       - sessionAuth: []
 *     parameters:
 *       - in: path
 *         name: organizationId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: Organization ID
 *     responses:
 *       200:
 *         description: Invite links retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 invites:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       id:
 *                         type: string
 *                         format: uuid
 *                       code:
 *                         type: string
 *                       role:
 *                         type: string
 *                         enum: [org_admin, org_viewer]
 *                       expiresAt:
 *                         type: string
 *                         format: date-time
 *                         nullable: true
 *                       maxUses:
 *                         type: integer
 *                         nullable: true
 *                       useCount:
 *                         type: integer
 *                       disabled:
 *                         type: boolean
 *                       note:
 *                         type: string
 *                         nullable: true
 *                       createdAt:
 *                         type: string
 *                         format: date-time
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
 *       404:
 *         description: Organization not found
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
router.post('/:organizationId/invites', organizationController.createInviteLink.bind(organizationController));

router.get('/:organizationId/invites', organizationController.getInviteLinks.bind(organizationController));

/**
 * @swagger
 * /api/organizations/{organizationId}/invites/{inviteId}:
 *   patch:
 *     tags: [Organizations]
 *     summary: Update organization invite link
 *     description: Update an existing invite link (e.g., disable it). Only organization admins can update invite links.
 *     security:
 *       - sessionAuth: []
 *     parameters:
 *       - in: path
 *         name: organizationId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: Organization ID
 *       - in: path
 *         name: inviteId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: Invite ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               disabled:
 *                 type: boolean
 *                 description: Whether to disable the invite
 *               note:
 *                 type: string
 *                 description: Updated note for the invite
 *     responses:
 *       200:
 *         description: Invite link updated successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: Invite link updated successfully
 *       400:
 *         description: Invalid input data
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
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
 *       404:
 *         description: Organization or invite not found
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
router.patch('/:organizationId/invites/:inviteId', organizationController.updateInviteLink.bind(organizationController));

/**
 * @swagger
 * /api/organizations/invite/{code}/use:
 *   post:
 *     tags: [Organizations]
 *     summary: Use organization invite link
 *     description: Accept an organization invite and join the organization with the specified role.
 *     security:
 *       - sessionAuth: []
 *     parameters:
 *       - in: path
 *         name: code
 *         required: true
 *         schema:
 *           type: string
 *         description: Invite code
 *         example: "abc123def456"
 *     responses:
 *       200:
 *         description: Invite used successfully, user added to organization
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: Successfully joined organization
 *                 organization:
 *                   $ref: '#/components/schemas/Organization'
 *                 role:
 *                   type: string
 *                   enum: [org_admin, org_viewer]
 *       400:
 *         description: Invalid invite or user already a member
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       401:
 *         description: Not authenticated
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       404:
 *         description: Invite not found or expired
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       410:
 *         description: Invite expired or disabled
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
router.post('/invite/:code/use', organizationController.useInviteLink.bind(organizationController));

export default router; 
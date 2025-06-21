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

// Get organization invite details (public endpoint)
router.get('/invite/:code', organizationController.getInviteDetails.bind(organizationController));

// All other routes require authentication
router.use(requireAuth);

/**
 * Organization Management Routes
 */

// Create organization (SuperAdmin only)
router.post('/', requireSuperAdmin(), organizationController.createOrganization.bind(organizationController));

// List all organizations (SuperAdmin only)
router.get('/', requireSuperAdmin(), organizationController.listOrganizations.bind(organizationController));

// Get user's organizations
router.get('/me', organizationController.getUserOrganizations.bind(organizationController));

// Get organization by slug (must come before /:organizationId to avoid conflicts)
router.get('/slug/:orgSlug', organizationController.getOrganizationBySlug.bind(organizationController));

// Get organization by ID
router.get('/:organizationId', organizationController.getOrganization.bind(organizationController));

// Update organization (Org Admin only)
router.put('/:organizationId', organizationController.updateOrganization.bind(organizationController));

// Delete organization (SuperAdmin only)
router.delete('/:organizationId', requireSuperAdmin(), organizationController.deleteOrganization.bind(organizationController));

/**
 * Organization Membership Routes
 */

// Add member to organization (Org Admin only)
router.post('/:organizationId/members', organizationController.addMember.bind(organizationController));

// Update member role (Org Admin only)
router.put('/:organizationId/members/:userId', organizationController.updateMemberRole.bind(organizationController));

// Remove member from organization (Org Admin only)
router.delete('/:organizationId/members/:userId', organizationController.removeMember.bind(organizationController));

/**
 * Organization Events Routes
 */

// Create event in organization (Org Admin only)
router.post('/:organizationId/events', organizationController.createEvent.bind(organizationController));

// List organization events
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

// Create organization invite link (Org Admin only)
router.post('/:organizationId/invites', organizationController.createInviteLink.bind(organizationController));

// Get organization invite links (Org Admin only)
router.get('/:organizationId/invites', organizationController.getInviteLinks.bind(organizationController));

// Update organization invite link (Org Admin only)
router.patch('/:organizationId/invites/:inviteId', organizationController.updateInviteLink.bind(organizationController));

// Use organization invite link (requires auth)
router.post('/invite/:code/use', organizationController.useInviteLink.bind(organizationController));

export default router; 
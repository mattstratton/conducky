import { Router } from 'express';
import { OrganizationController } from '../controllers/organization.controller';
import { requireAuth } from '../middleware/auth';

const router = Router();
const organizationController = new OrganizationController();

// All routes require authentication
router.use(requireAuth);

/**
 * Organization Management Routes
 */

// Create organization (SuperAdmin only)
router.post('/', organizationController.createOrganization.bind(organizationController));

// List all organizations (SuperAdmin only)
router.get('/', organizationController.listOrganizations.bind(organizationController));

// Get user's organizations
router.get('/me', organizationController.getUserOrganizations.bind(organizationController));

// Get organization by slug (must come before /:organizationId to avoid conflicts)
router.get('/slug/:orgSlug', organizationController.getOrganizationBySlug.bind(organizationController));

// Get organization by ID
router.get('/:organizationId', organizationController.getOrganization.bind(organizationController));

// Update organization (Org Admin only)
router.put('/:organizationId', organizationController.updateOrganization.bind(organizationController));

// Delete organization (SuperAdmin only)
router.delete('/:organizationId', organizationController.deleteOrganization.bind(organizationController));

/**
 * Organization Membership Routes
 */

// Add member to organization (Org Admin only)
router.post('/:organizationId/members', organizationController.addMember.bind(organizationController));

// Update member role (Org Admin only)
router.put('/:organizationId/members/:userId', organizationController.updateMemberRole.bind(organizationController));

// Remove member from organization (Org Admin only)
router.delete('/:organizationId/members/:userId', organizationController.removeMember.bind(organizationController));



export default router; 
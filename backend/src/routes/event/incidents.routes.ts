import { Router, Request, Response } from 'express';
import { IncidentService } from '../../services/incident.service';
import { EventService } from '../../services/event.service';
import { requireEventRole } from '../../middleware/unified-rbac';
import { requireRole } from '../../middleware/rbac';
import { UserResponse } from '../../types';
import { PrismaClient } from '@prisma/client';
import { createUploadMiddleware } from '../../utils/upload';
import { reportCreationRateLimit, fileUploadRateLimit } from '../../middleware/rate-limit';
import { validateReport, handleValidationErrors } from '../../middleware/validation';
import logger from '../../config/logger';

const router = Router({ mergeParams: true });
const prisma = new PrismaClient();
const incidentService = new IncidentService(prisma);
const eventService = new EventService(prisma);

const uploadRelatedFile = createUploadMiddleware({
    allowedMimeTypes: ['image/png', 'image/jpeg', 'image/jpg', 'application/pdf', 'text/plain'],
    maxSizeMB: 10,
    allowedExtensions: ['png', 'jpg', 'jpeg', 'pdf', 'txt']
});

// Create a new incident within an event
router.post(
    '/',
    reportCreationRateLimit,
    requireRole(['reporter', 'responder', 'event_admin', 'system_admin']),
    uploadRelatedFile.array('relatedFiles'),
    validateReport,
    handleValidationErrors,
    async (req: Request, res: Response): Promise<void> => {
        try {
            const { eventId, slug } = req.params;
            const user = req.user as UserResponse;
            const { title, description, incidentAt, location, involvedParties, severity } = req.body;
            const multerFiles = req.files as Express.Multer.File[] | undefined;

            let currentEventId = eventId;
            if (slug) {
                const eventIdFromSlug = await eventService.getEventIdBySlug(slug);
                if (!eventIdFromSlug) {
                    res.status(404).json({ error: 'Event not found.' });
                    return;
                }
                currentEventId = eventIdFromSlug;
            }

            if (!currentEventId) {
                res.status(400).json({ error: 'Event ID or slug is required.' });
                return;
            }

            const incidentData = {
                eventId: currentEventId,
                reporterId: user.id,
                title,
                description,
                incidentAt: incidentAt ? new Date(incidentAt) : null,
                location,
                parties: involvedParties,
                urgency: severity,
            };

            const relatedFiles = multerFiles?.map(file => ({
                filename: file.originalname,
                mimetype: file.mimetype,
                data: file.buffer,
                size: file.size,
                uploaderId: user.id,
            }));

            const result = await incidentService.createIncident(incidentData, relatedFiles);

            if (result.success) {
                res.status(201).json(result.data);
            } else {
                res.status(400).json({ error: result.error });
            }
        } catch (error: any) {
            logger().error('Create incident error:', error);
            res.status(500).json({ error: 'Failed to create incident.' });
        }
    }
);

// Export incidents
router.get('/export', requireRole(['responder', 'event_admin', 'system_admin']), async (req: Request, res: Response): Promise<void> => {
    try {
        const { eventId, slug } = req.params;
        const { format, ids } = req.query;
        const user = req.user as any;

        // Validate format
        if (!format || !['csv', 'pdf'].includes(format as string)) {
            res.status(400).json({ error: 'Invalid format. Must be csv or pdf.' });
            return;
        }

        let currentEventId = eventId;
        if (slug) {
            const eventIdFromSlug = await eventService.getEventIdBySlug(slug);
            if (!eventIdFromSlug) {
                res.status(404).json({ error: 'Event not found.' });
                return;
            }
            currentEventId = eventIdFromSlug;
        }

        // Verify user has proper permissions for this specific event
        const { UnifiedRBACService } = require('../../services/unified-rbac.service');
        const rbacService = new UnifiedRBACService(prisma);
        const hasEventRole = await rbacService.hasEventRole(user.id, currentEventId, ['responder', 'event_admin']);
        if (!hasEventRole) {
            res.status(403).json({ error: 'Insufficient permissions to export incidents from this event' });
            return;
        }

        // Get incidents to export
        let queryOptions: any = { page: 1, limit: 1000 };
        if (ids) {
            const incidentIds = (ids as string).split(',');
            queryOptions.incidentIds = incidentIds;
        }

        const result = await incidentService.getEventIncidents(currentEventId, user.id, queryOptions);
        if (!result.success || !result.data) {
            res.status(500).json({ error: 'Failed to fetch incidents' });
            return;
        }

        const incidents = result.data.incidents;
        const eventResult = await eventService.getEventById(currentEventId);
        const eventName = eventResult.success && eventResult.data ? eventResult.data.event.name : 'Event';

        if (format === 'csv') {
            // Generate CSV
            const csvHeader = 'ID,Title,Status,Severity,Reporter,Assigned,Created,Description,URL\n';
            const csvRows = incidents.map(incident => {
                const url = `${req.protocol}://${req.get('host')}/events/${slug}/incidents/${incident.id}`;
                return [
                    incident.id,
                    `"${incident.title.replace(/"/g, '""')}"`,
                    incident.state,
                    incident.severity || '',
                    incident.reporter?.name || '',
                    incident.assignedResponder?.name || '',
                    incident.createdAt.toISOString().split('T')[0],
                    `"${incident.description.replace(/"/g, '""')}"`,
                    url
                ].join(',');
            }).join('\n');

            const csv = csvHeader + csvRows;
            const filename = `reports_${slug}_${new Date().toISOString().split('T')[0]}.csv`;

            res.setHeader('Content-Type', 'text/csv; charset=utf-8');
            res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
            res.send(csv);
        } else {
            // Generate simple text format for PDF
            let content = `Event Reports - ${slug}\n`;
            content += `Generated on: ${new Date().toLocaleDateString()}\n\n`;
            
            incidents.forEach(incident => {
                content += `ID: ${incident.id}\n`;
                content += `Title: ${incident.title}\n`;
                content += `Status: ${incident.state}\n`;
                content += `Severity: ${incident.severity || 'N/A'}\n`;
                content += `Reporter: ${incident.reporter?.name || 'N/A'}\n`;
                content += `Created: ${incident.createdAt.toLocaleDateString()}\n`;
                content += `Description: ${incident.description}\n`;
                content += `URL: ${req.protocol}://${req.get('host')}/events/${slug}/incidents/${incident.id}\n`;
                content += '\n---\n\n';
            });

            const filename = `reports_${slug}_${new Date().toISOString().split('T')[0]}.txt`;

            res.setHeader('Content-Type', 'text/plain; charset=utf-8');
            res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
            res.send(content);
        }
    } catch (error: any) {
        logger().error('Export incidents error:', error);
        res.status(500).json({ error: 'Failed to export incidents.' });
    }
});

// Bulk actions on incidents
router.post('/bulk', requireRole(['responder', 'event_admin', 'system_admin']), async (req: Request, res: Response): Promise<void> => {
    try {
        const { eventId, slug } = req.params;
        const { action, incidentIds, assignedTo, status, notes } = req.body;
        const user = req.user as any;

        // Validate required fields
        if (!action || !incidentIds || !Array.isArray(incidentIds) || incidentIds.length === 0) {
            res.status(400).json({ error: 'Action and incidentIds array are required' });
            return;
        }

        // Validate action type
        if (!['assign', 'status', 'delete'].includes(action)) {
            res.status(400).json({ error: 'Invalid action. Must be assign, status, or delete.' });
            return;
        }

        let currentEventId = eventId;
        if (slug) {
            const eventIdFromSlug = await eventService.getEventIdBySlug(slug);
            if (!eventIdFromSlug) {
                res.status(404).json({ error: 'Event not found.' });
                return;
            }
            currentEventId = eventIdFromSlug;
        }

        const result = await incidentService.bulkUpdateIncidents(
            currentEventId,
            incidentIds,
            action,
            {
                assignedTo,
                status,
                notes,
                userId: user.id
            }
        );

        if (result.success) {
            // Check if there were validation errors
            if (result.data && result.data.errors && result.data.errors.length > 0) {
                // Return 400 for validation errors with error details
                res.status(400).json({ 
                    error: 'Validation errors occurred',
                    details: result.data.errors,
                    updated: result.data.updated || 0
                });
            } else {
                // Return 200 for successful operations
                res.status(200).json(result.data);
            }
        } else {
            res.status(400).json({ error: result.error });
        }
    } catch (error: any) {
        logger().error('Bulk update incidents error:', error);
        res.status(500).json({ error: 'Failed to perform bulk action.' });
    }
});

// Get all incidents for an event
router.get('/', requireRole(['reporter', 'responder', 'event_admin', 'system_admin']), async (req: Request, res: Response): Promise<void> => {
    try {
        const { eventId, slug } = req.params;
        const user = req.user as UserResponse;
        
        // Parse and validate pagination parameters
        const page = req.query.page ? parseInt(req.query.page as string) : 1;
        const limit = req.query.limit ? parseInt(req.query.limit as string) : 10;
        
        // Validate pagination parameters before proceeding
        if (isNaN(page) || isNaN(limit) || page < 1 || limit < 1) {
            res.status(400).json({ error: 'Invalid pagination parameters. Page and limit must be positive integers.' });
            return;
        }
        
        // Extract all query parameters that the service expects
        const queryOptions = {
            page,
            limit,
            sort: req.query.sort as string || 'createdAt',
            order: req.query.order as string || 'desc',
            search: req.query.search as string || '',
            status: req.query.status as string,
            severity: req.query.severity as string,
            assigned: req.query.assigned as string,
            userId: req.query.userId as string,
            includeStats: req.query.includeStats === 'true'
        };

        let currentEventId = eventId;
        if (slug) {
            const eventIdFromSlug = await eventService.getEventIdBySlug(slug);
            if (!eventIdFromSlug) {
                res.status(404).json({ error: 'Event not found.' });
                return;
            }
            currentEventId = eventIdFromSlug;
        }

        if (!currentEventId) {
            res.status(400).json({ error: 'Event ID or slug is required.' });
            return;
        }

        // Use the enhanced service method that handles filtering
        const result = await incidentService.getEventIncidents(currentEventId, user.id, queryOptions);

        if (result.success) {
            res.json(result.data);
        } else {
            res.status(500).json({ error: result.error });
        }
    } catch (error: any) {
        logger().error('Get event incidents error:', error);
        res.status(500).json({ error: 'Failed to get event incidents.' });
    }
});


// Get a specific incident
router.get('/:incidentId', requireRole(['reporter', 'responder', 'event_admin', 'system_admin']), async (req: Request, res: Response): Promise<void> => {
    try {
        const { eventId, slug, incidentId } = req.params;
        const user = req.user as any;

        let currentEventId = eventId;
        if (slug) {
            const eventIdFromSlug = await eventService.getEventIdBySlug(slug);
            if (!eventIdFromSlug) {
                res.status(404).json({ error: 'Event not found.' });
                return;
            }
            currentEventId = eventIdFromSlug;
        }

        const accessResult = await incidentService.checkIncidentAccess(user.id, incidentId, currentEventId);
        if (!accessResult.success || !accessResult.data?.hasAccess) {
            res.status(403).json({ error: accessResult.error || 'Forbidden: insufficient role' });
            return;
        }

        const result = await incidentService.getIncidentByIdFiltered(incidentId, user.id, currentEventId);

        if (result.success) {
            res.json(result.data);
        } else {
            res.status(404).json({ error: result.error });
        }
    } catch (error: any) {
        logger().error('Get incident details error:', error);
        res.status(500).json({ error: 'Failed to get incident details.' });
    }
});

// Upload related files for an incident
router.post('/:incidentId/related-files', fileUploadRateLimit, requireRole(['reporter', 'responder', 'event_admin', 'system_admin']), uploadRelatedFile.array('relatedFiles'), async (req: Request, res: Response): Promise<void> => {
    try {
        const { eventId, slug, incidentId } = req.params;
        const user = req.user as any;
        const relatedFiles = req.files as Express.Multer.File[];

        if (!relatedFiles || relatedFiles.length === 0) {
            res.status(400).json({ error: 'No files uploaded.' });
            return;
        }

        let currentEventId = eventId;
        if (slug) {
             const eventIdFromSlug = await eventService.getEventIdBySlug(slug);
            if (!eventIdFromSlug) {
                res.status(404).json({ error: 'Event not found.' });
                return;
            }
            currentEventId = eventIdFromSlug;
        }

        const accessResult = await incidentService.checkIncidentAccess(user.id, incidentId, currentEventId);
        if (!accessResult.success || !accessResult.data) {
            res.status(403).json({ error: accessResult.error });
            return;
        }
        
        const incidentAccessData = accessResult.data;

        // For reporters, ensure they can only upload files to their own incidents
        if (incidentAccessData.roles.some((roleName: string) => roleName === 'reporter') && incidentAccessData.isReporter) {
            const incidentResult = await incidentService.getIncidentById(incidentId);
            if (!incidentResult.success || !incidentResult.data) {
                res.status(404).json({ error: 'Incident not found.' });
                return;
            }
            if (incidentResult.data.incident.reporterId !== user.id) {
                res.status(403).json({ error: 'Reporters can only upload files to their own incidents.' });
                return;
            }
        }

        const relatedFilesData = relatedFiles.map(file => ({
            filename: file.originalname,
            mimetype: file.mimetype,
            size: file.size,
            data: file.buffer,
            uploaderId: user.id
        }));

        const result = await incidentService.uploadRelatedFiles(incidentId, relatedFilesData);

        if (result.success) {
            logger().info('Successfully uploaded related files');
            res.status(201).json(result.data);
        } else {
            res.status(500).json({ error: result.error });
        }
    } catch (error: any) {
        logger().error('Upload related files error:', error);
        res.status(500).json({ error: 'Failed to upload related files.' });
    }
});

// Download a related file
router.get('/:incidentId/related-files/:fileId/download', requireRole(['reporter', 'responder', 'event_admin', 'system_admin']), async (req: Request, res: Response): Promise<void> => {
    try {
        const { eventId, slug, incidentId, fileId } = req.params;
        const user = req.user as any;

        let currentEventId = eventId;
        if (slug) {
            const eventIdFromSlug = await eventService.getEventIdBySlug(slug);
            if (!eventIdFromSlug) {
                res.status(404).json({ error: 'Event not found.' });
                return;
            }
            currentEventId = eventIdFromSlug;
        }

        const accessResult = await incidentService.checkIncidentAccess(user.id, incidentId, currentEventId);
        if (!accessResult.success || !accessResult.data?.hasAccess) {
            res.status(403).json({ error: accessResult.error || 'Forbidden: insufficient role' });
            return;
        }

        const result = await incidentService.getRelatedFile(fileId);

        if (result.success && result.data) {
            res.setHeader('Content-Disposition', `attachment; filename="${result.data.filename.replace(/"/g, '\\"')}"`);

            res.setHeader('Content-Type', result.data.mimetype);
            res.setHeader('Content-Length', result.data.size.toString());
            res.send(result.data.data);
        } else {
            res.status(404).json({ error: result.error || 'File not found.' });
        }
    } catch (error: any) {
        logger().error('Download file error:', error);
        res.status(500).json({ error: 'Failed to download file.' });
    }
});

// Delete a related file
router.delete('/:incidentId/related-files/:fileId', requireRole(['responder', 'event_admin', 'system_admin']), async (req: Request, res: Response): Promise<void> => {
    try {
        const { eventId, slug, incidentId, fileId } = req.params;
        const user = req.user as any;
        
        let currentEventId = eventId;
        if (slug) {
            const eventIdFromSlug = await eventService.getEventIdBySlug(slug);
            if (!eventIdFromSlug) {
                res.status(404).json({ error: 'Event not found.' });
                return;
            }
            currentEventId = eventIdFromSlug;
        }
        
        const accessResult = await incidentService.checkIncidentAccess(user.id, incidentId, currentEventId);
        if (!accessResult.success || !accessResult.data?.hasAccess) {
            res.status(403).json({ error: accessResult.error || 'Forbidden: insufficient role' });
            return;
        }

        const result = await incidentService.deleteRelatedFile(fileId);

        if (result.success) {
            res.status(200).json({ message: result.data?.message });
        } else {
            res.status(404).json({ error: result.error || 'File not found or failed to delete.' });
        }
    } catch (error: any) {
        logger().error('Delete file error:', error);
        res.status(500).json({ error: 'Failed to delete file.' });
    }
});

// Update an incident
router.patch('/:incidentId', requireRole(['responder', 'event_admin', 'system_admin']), async (req: Request, res: Response): Promise<void> => {
    try {
        const { eventId, incidentId, slug } = req.params;
        const user = req.user as any;
        const updateData = req.body;

        let currentEventId = eventId;
        if (slug) {
            const eventIdFromSlug = await eventService.getEventIdBySlug(slug);
            if (!eventIdFromSlug) {
                res.status(404).json({ error: 'Event not found.' });
                return;
            }
            currentEventId = eventIdFromSlug;
        }
        
        const canEditResult = await incidentService.checkIncidentEditAccess(user.id, incidentId, currentEventId);
        if (!canEditResult.success || !canEditResult.data?.canEdit) {
            res.status(403).json({ error: canEditResult.error || 'You are not authorized to edit this incident.' });
            return;
        }

        const result = await incidentService.updateIncident(slug, incidentId, updateData);

        if (result.success && result.data) {
            if (result.data.originalAssignedResponderId !== result.data.incident.assignedResponderId ||
                result.data.originalState !== result.data.incident.state) {
                // To-do: Add Notifications
            }
            res.json(result.data);
        } else {
            res.status(400).json({ error: result.error });
        }
    } catch (error: any) {
        logger().error('Update incident error:', error);
        res.status(500).json({ error: 'Failed to update incident.' });
    }
});


// Update incident state
router.patch('/:incidentId/state', requireRole(['responder', 'event_admin', 'system_admin']), async (req: Request, res: Response): Promise<void> => {
    try {
        const { eventId, incidentId, slug } = req.params;
        const { state, notes, assignedToUserId } = req.body;
        const user = req.user as any;

        let currentEventId = eventId;
        if (slug) {
            const eventIdFromSlug = await eventService.getEventIdBySlug(slug);
            if (!eventIdFromSlug) {
                res.status(404).json({ error: 'Event not found.' });
                return;
            }
            currentEventId = eventIdFromSlug;
        }
        
        const canEditResult = await incidentService.checkIncidentEditAccess(user.id, incidentId, currentEventId);
        if (!canEditResult.success || !canEditResult.data?.canEdit) {
            res.status(403).json({ error: canEditResult.error || 'You are not authorized to change this incident\'s state.' });
            return;
        }

        const result = await incidentService.updateIncidentState(currentEventId, incidentId, state, user.id, notes, assignedToUserId);

        if (result.success) {
            res.json(result.data);
        } else {
            res.status(400).json({ error: result.error });
        }
    } catch (error: any) {
        logger().error('Update incident state error:', error);
        res.status(500).json({ error: 'Failed to update incident state.' });
    }
});

// Reopen incident
router.patch('/:incidentId/reopen', requireRole(['responder', 'event_admin', 'system_admin']), async (req: Request, res: Response): Promise<void> => {
    try {
        const { eventId, incidentId, slug } = req.params;
        const { notes, assignedToUserId } = req.body as { notes?: string; assignedToUserId?: string };
        const user = req.user as any;

        if (!notes || typeof notes !== 'string' || notes.trim().length === 0) {
            res.status(400).json({ error: 'Notes are required to reopen an incident.' });
            return;
        }

        let currentEventId = eventId;
        if (slug) {
            const eventIdFromSlug = await eventService.getEventIdBySlug(slug);
            if (!eventIdFromSlug) {
                res.status(404).json({ error: 'Event not found.' });
                return;
            }
            currentEventId = eventIdFromSlug;
        }

        // Fetch incident to validate current state and access
        const incidentResult = await incidentService.getIncidentById(incidentId);
        if (!incidentResult.success || !incidentResult.data) {
            res.status(404).json({ error: 'Incident not found.' });
            return;
        }
        const incident = incidentResult.data.incident as any;
        if (incident.eventId !== currentEventId) {
            res.status(404).json({ error: 'Incident not found for this event.' });
            return;
        }

        const canEditResult = await incidentService.checkIncidentEditAccess(user.id, incidentId, currentEventId);
        if (!canEditResult.success || !canEditResult.data?.canEdit) {
            res.status(403).json({ error: canEditResult.error || 'You are not authorized to reopen this incident.' });
            return;
        }

        if (!['resolved', 'closed'].includes(incident.state)) {
            res.status(400).json({ error: 'Only resolved or closed incidents can be reopened.' });
            return;
        }

        // Branching: if assignedToUserId provided, go to investigating (requires assignment handled by service rules)
        // otherwise go to acknowledged
        const targetState = assignedToUserId ? 'investigating' : 'acknowledged';

        const result = await incidentService.updateIncidentState(currentEventId, incidentId, targetState, user.id, notes, assignedToUserId);

        if (result.success) {
            res.json(result.data);
        } else {
            res.status(400).json({ error: result.error });
        }
    } catch (error: any) {
        logger().error('Reopen incident error:', error);
        res.status(500).json({ error: 'Failed to reopen incident.' });
    }
});

// Update incident description
router.patch('/:incidentId/description', requireRole(['reporter', 'responder', 'event_admin', 'system_admin']), async (req: Request, res: Response): Promise<void> => {
    try {
        const { eventId, incidentId, slug } = req.params;
        const { description } = req.body;
        const user = req.user as any;

        let currentEventId = eventId;
        if (slug) {
            const eventIdFromSlug = await eventService.getEventIdBySlug(slug);
            if (!eventIdFromSlug) {
                res.status(404).json({ error: 'Event not found.' });
                return;
            }
            currentEventId = eventIdFromSlug;
        }

        // Check permissions first before validation to return proper error codes
        const incident = await incidentService.getIncidentById(incidentId);
        if (!incident.success || !incident.data) {
            res.status(404).json({ error: 'Incident not found.' });
            return;
        }

        if (incident.data.incident.eventId !== currentEventId) {
            res.status(404).json({ error: 'Incident not found for this event.' });
            return;
        }

        // Check authorization before validation
        const isReporter = !!(incident.data.incident.reporterId && user.id === incident.data.incident.reporterId);
        // Use unified RBAC to check event permissions (description requires admin+ access)
        const hasEventRole = await incidentService.checkIncidentEditAccess(user.id, incidentId, currentEventId);

        if (!hasEventRole.success || !hasEventRole.data?.canEdit) {
            res.status(403).json({ error: 'Insufficient permissions to edit this incident description.' });
            return;
        }

        // Now validate the description input
        if (!description || typeof description !== 'string' || description.trim().length === 0) {
            res.status(400).json({ error: 'Description is required' });
            return;
        }

        const result = await incidentService.updateIncidentDescription(currentEventId, incidentId, description.trim(), user.id);

        if (result.success) {
            res.json(result.data);
        } else {
            res.status(400).json({ error: result.error });
        }
    } catch (error: any) {
        logger().error('Update incident description error:', error);
        res.status(500).json({ error: 'Failed to update incident description.' });
    }
});

// Update incident date
router.patch('/:incidentId/incident-date', requireRole(['reporter', 'responder', 'event_admin', 'system_admin']), async (req: Request, res: Response): Promise<void> => {
    try {
        const { eventId, incidentId, slug } = req.params;
        const { incidentAt } = req.body;
        const user = req.user as any;

        if (!incidentAt) {
            res.status(400).json({ error: 'Incident date is required' });
            return;
        }

        let currentEventId = eventId;
        if (slug) {
            const eventIdFromSlug = await eventService.getEventIdBySlug(slug);
            if (!eventIdFromSlug) {
                res.status(404).json({ error: 'Event not found.' });
                return;
            }
            currentEventId = eventIdFromSlug;
        }

        const result = await incidentService.updateIncidentIncidentDate(currentEventId, incidentId, incidentAt, user.id);

        if (result.success) {
            res.json(result.data);
        } else {
            res.status(400).json({ error: result.error });
        }
    } catch (error: any) {
        logger().error('Update incident date error:', error);
        res.status(500).json({ error: 'Failed to update incident date.' });
    }
});

// Update incident parties
router.patch('/:incidentId/parties', requireRole(['reporter', 'responder', 'event_admin', 'system_admin']), async (req: Request, res: Response): Promise<void> => {
    try {
        const { eventId, incidentId, slug } = req.params;
        const { parties } = req.body;
        const user = req.user as any;

        if (!parties || typeof parties !== 'string') {
            res.status(400).json({ error: 'Parties is required' });
            return;
        }

        let currentEventId = eventId;
        if (slug) {
            const eventIdFromSlug = await eventService.getEventIdBySlug(slug);
            if (!eventIdFromSlug) {
                res.status(404).json({ error: 'Event not found.' });
                return;
            }
            currentEventId = eventIdFromSlug;
        }

        const result = await incidentService.updateIncidentParties(currentEventId, incidentId, parties.trim(), user.id);

        if (result.success) {
            res.json(result.data);
        } else {
            res.status(400).json({ error: result.error });
        }
    } catch (error: any) {
        logger().error('Update incident parties error:', error);
        res.status(500).json({ error: 'Failed to update incident parties.' });
    }
});

// Get incident state history
router.get('/:incidentId/state-history', requireRole(['reporter', 'responder', 'event_admin', 'system_admin']), async (req: Request, res: Response): Promise<void> => {
    try {
        const { eventId, slug, incidentId } = req.params;
        const user = req.user as any;

        let currentEventId = eventId;
        if (slug) {
            const eventIdFromSlug = await eventService.getEventIdBySlug(slug);
            if (!eventIdFromSlug) {
                res.status(404).json({ error: 'Event not found.' });
                return;
            }
            currentEventId = eventIdFromSlug;
        }

        const accessResult = await incidentService.checkIncidentAccess(user.id, incidentId, currentEventId);
        if (!accessResult.success || !accessResult.data?.hasAccess) {
            res.status(403).json({ error: accessResult.error || 'Forbidden: insufficient role' });
            return;
        }

        const result = await incidentService.getIncidentStateHistory(incidentId);

        if (result.success) {
            res.json(result.data);
        } else {
            res.status(404).json({ error: result.error });
        }
    } catch (error: any) {
        logger().error('Get incident state history error:', error);
        res.status(500).json({ error: 'Failed to get incident state history.' });
    }
});

// Assign or update incident details (severity, resolution, assignee)
router.patch('/:incidentId/assignment', requireRole(['responder', 'event_admin', 'system_admin']), async (req: Request, res: Response): Promise<void> => {
    try {
        const { eventId, incidentId, slug } = req.params;
        const user = req.user as any;
        const { assignedResponderId, severity, resolution } = req.body;

        let currentEventId = eventId;
        if (slug) {
            const eventIdFromSlug = await eventService.getEventIdBySlug(slug);
            if (!eventIdFromSlug) {
                res.status(404).json({ error: 'Event not found.' });
                return;
            }
            currentEventId = eventIdFromSlug;
        }
        
        const canEditResult = await incidentService.checkIncidentEditAccess(user.id, incidentId, currentEventId);
        if (!canEditResult.success || !canEditResult.data?.canEdit) {
            res.status(403).json({ error: canEditResult.error || 'You are not authorized to update this incident.' });
            return;
        }

        const result = await incidentService.updateIncident(slug, incidentId, {
            assignedResponderId,
            severity,
            resolution
        });

        if (result.success) {
            res.json(result.data);
        } else {
            res.status(400).json({ error: result.error });
        }
    } catch (error: any) {
        logger().error('Update incident assignment error:', error);
        res.status(500).json({ error: 'Failed to update incident assignment.' });
    }
});

// Add tags to an incident
router.post('/:incidentId/tags', requireRole(['responder', 'event_admin', 'system_admin']), async (req: Request, res: Response): Promise<void> => {
    try {
        const { incidentId } = req.params;
        const { tagIds } = req.body;
        const user = req.user as UserResponse;
        
        if (!tagIds || !Array.isArray(tagIds)) {
            res.status(400).json({ error: 'tagIds must be an array of strings.' });
            return;
        }
        
        const result = await incidentService.updateIncidentTags(incidentId, tagIds, user.id);

        if (result.success) {
            res.status(200).json(result.data);
        } else {
            res.status(400).json({ error: result.error });
        }
    } catch (error: any) {
        logger().error('Error adding tags to incident:', error);
        res.status(500).json({ error: 'Failed to add tags to incident.' });
    }
});


// Remove a tag from an incident
router.delete('/:incidentId/tags/:tagId', requireRole(['responder', 'event_admin', 'system_admin']), async (req: Request, res: Response): Promise<void> => {
    try {
        const { incidentId, tagId } = req.params;
        const user = req.user as UserResponse;

        // Fetch current tags to perform removal
        const incidentResult = await incidentService.getIncidentById(incidentId);
        if (!incidentResult.success || !incidentResult.data) {
            res.status(404).json({ error: 'Incident not found.' });
            return;
        }
        const currentTagIds = incidentResult.data.incident.tags?.map(t => t.id) || [];
        const newTagIds = currentTagIds.filter(id => id !== tagId);

        const result = await incidentService.updateIncidentTags(incidentId, newTagIds, user.id);
        
        if (result.success) {
            res.status(200).json(result.data);
        } else {
            res.status(400).json({ error: result.error });
        }
    } catch (error: any) {
        logger().error('Error removing tag from incident:', error);
        res.status(500).json({ error: 'Failed to remove tag from incident.' });
    }
});


export default router;
import { Router, Request, Response } from 'express';
import { CommentService } from '../../services/comment.service';
import { IncidentService } from '../../services/incident.service';
import { EventService } from '../../services/event.service';
import { requireRole } from '../../middleware/rbac';
import { CommentVisibility } from '../../generated/prisma/client';
import { createPrismaClient } from '../../config/prisma-client';
import { commentCreationRateLimit } from '../../middleware/rate-limit';
import { validateComment, handleValidationErrors } from '../../middleware/validation';
import logger from '../../config/logger';

const router = Router({ mergeParams: true });
const prisma = createPrismaClient();
const commentService = new CommentService(prisma);
const incidentService = new IncidentService(prisma);
const eventService = new EventService(prisma);

// Get comments for an incident
router.get('/', requireRole(['reporter', 'responder', 'event_admin', 'system_admin']), async (req: Request, res: Response): Promise<void> => {
    try {
        const { incidentId } = req.params;
        const user = req.user as any;

        // Future: Implement query parameter parsing for pagination, etc.
        const query = {};

        const result = await commentService.getIncidentComments(incidentId, query);

        if (result.success) {
            res.json(result.data);
        } else {
            res.status(500).json({ error: result.error });
        }
    } catch (error: any) {
        logger().error('Get comments error:', error);
        res.status(500).json({ error: 'Failed to fetch comments.' });
    }
});

// Add a comment to an incident
router.post(
    '/',
    commentCreationRateLimit,
    requireRole(['reporter', 'responder', 'event_admin', 'system_admin']),
    validateComment,
    handleValidationErrors,
    async (req: Request, res: Response): Promise<void> => {
        try {
            const { eventId, slug, incidentId } = req.params;
            const user = req.user as any;
            const { body, isMarkdown, visibility } = req.body;

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
                res.status(403).json({ error: 'You do not have permission to comment on this incident.' });
                return;
            }

            const commentData = {
                incidentId,
                authorId: user.id,
                body,
                isMarkdown,
                visibility: visibility as CommentVisibility,
            };

            const result = await commentService.createComment(commentData);

            if (result.success) {
                res.status(201).json(result.data);
            } else {
                res.status(400).json({ error: result.error });
            }
        } catch (error: any) {
            logger().error('Create comment error:', error);
            res.status(500).json({ error: 'Failed to create comment.' });
        }
    }
);

export default router; 
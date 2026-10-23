import { Router } from 'express';
import incidentRoutes from './event/incidents.routes';
import userRoutes from './event/users.routes';
import commentRoutes from './event/comments.routes';
import mainEventRoutes from './event/main.routes';
import { Request, Response } from 'express';
import { PrismaClient } from '../generated/prisma/client';
import { createPrismaClient } from '../config/prisma-client';
import { requireSystemAdmin } from '../utils/rbac';
import logger from '../config/logger';
import { EventService } from '../services/event.service';

const router = Router();

// Create single PrismaClient instance to reuse across requests
const prisma = createPrismaClient();
const eventService = new EventService(prisma);

// Get all events (System Admin only)
router.get('/', requireSystemAdmin(), async (req: Request, res: Response): Promise<void> => {
    try {
        const result = await eventService.listAllEvents();

        if (result.success) {
            res.status(200).json(result.data);
        } else {
            res.status(500).json({ error: result.error });
        }
    } catch (error: any) {
        logger().error('Failed to list events', { error: error.message });
        res.status(500).json({ error: 'Failed to list events' });
    }
});

// Create a new event (System Admin only)
router.post('/', requireSystemAdmin(), async (req: Request, res: Response): Promise<void> => {
    try {
        const result = await eventService.createEvent(req.body);

        if (result.success) {
            res.status(201).json(result.data);
        } else {
            if (result.error === 'Slug already exists.') {
                res.status(409).json({ error: result.error });
            } else {
                res.status(400).json({ error: result.error });
            }
        }
    } catch (error: any) {
        logger().error('Failed to create event', { error: error.message });
        res.status(500).json({ error: 'Failed to create event' });
    }
});

// Assign a role to a user in an event (System Admin only)
router.post('/:eventId/roles', requireSystemAdmin(), async (req: Request, res: Response): Promise<void> => {
    try {
        const { eventId } = req.params;
        const { userId, roleName } = req.body;

        const result = await eventService.assignUserRole(eventId, { userId, roleName });

        if (result.success) {
            res.status(201).json(result.data);
        } else {
            res.status(400).json({ error: result.error });
        }
    } catch (error: any) {
        logger().error('Failed to assign role', { error: error.message, eventId: req.params.eventId });
        res.status(500).json({ error: 'Failed to assign role' });
    }
});


// Base routes for event by slug
const slugRouter = Router({ mergeParams: true });
slugRouter.use('/', mainEventRoutes);
slugRouter.use('/users', userRoutes);
slugRouter.use('/incidents', incidentRoutes);
slugRouter.use('/incidents/:incidentId/comments', commentRoutes);

// Base routes for event by ID
const idRouter = Router({ mergeParams: true });
idRouter.use('/', mainEventRoutes);
idRouter.use('/users', userRoutes);
idRouter.use('/incidents', incidentRoutes);
idRouter.use('/incidents/:incidentId/comments', commentRoutes);

// Register the slug and ID based routers
router.use('/slug/:slug', slugRouter);
router.use('/:eventId', idRouter);

export default router;
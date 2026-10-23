import { Router, Request, Response } from 'express';
import { TagService } from '../services/tag.service';
import { createPrismaClient } from '../config/prisma-client';
import { requireRole } from '../middleware/rbac';
import { logger } from '../utils/logger';

const router = Router();
const prisma = createPrismaClient();
const tagService = new TagService(prisma);

/**
 * @swagger
 * /api/tags/event/{eventId}:
 *   get:
 *     summary: Get all tags for an event
 *     tags: [Tags]
 *     parameters:
 *       - in: path
 *         name: eventId
 *         required: true
 *         schema:
 *           type: string
 *         description: Event ID
 *     responses:
 *       200:
 *         description: Successfully retrieved tags
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 tags:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       id:
 *                         type: string
 *                       name:
 *                         type: string
 *                       color:
 *                         type: string
 *                       eventId:
 *                         type: string
 *                       _count:
 *                         type: object
 *                         properties:
 *                           incidents:
 *                             type: number
 *       403:
 *         description: Forbidden - No access to event
 *       500:
 *         description: Internal server error
 */
router.get('/event/:eventId', requireRole(['reporter', 'responder', 'event_admin', 'system_admin']), async (req: Request, res: Response): Promise<void> => {
  try {
    const { eventId } = req.params;
    const user = req.user as any;

    if (!user || !user.id) {
      res.status(401).json({ error: 'Authentication required' });
      return;
    }

    const result = await tagService.getTagsByEvent(eventId, user.id);

    if (!result.success) {
      if (result.error === 'No access to this event.') {
        res.status(403).json({ error: result.error });
        return;
      }
      res.status(500).json({ error: result.error });
      return;
    }

    res.json(result.data);
  } catch (error: any) {
    logger.error('Error fetching tags:', error);
    res.status(500).json({ error: 'Failed to fetch tags.' });
  }
});

/**
 * @swagger
 * /api/tags/event/slug/{eventSlug}:
 *   get:
 *     summary: Get all tags for an event by slug
 *     tags: [Tags]
 *     parameters:
 *       - in: path
 *         name: eventSlug
 *         required: true
 *         schema:
 *           type: string
 *         description: Event slug
 *     responses:
 *       200:
 *         description: Successfully retrieved tags
 *       403:
 *         description: Forbidden - No access to event
 *       404:
 *         description: Event not found
 *       500:
 *         description: Internal server error
 */
router.get('/event/slug/:eventSlug', requireRole(['reporter', 'responder', 'event_admin', 'system_admin']), async (req: Request, res: Response): Promise<void> => {
  try {
    const { eventSlug } = req.params;
    const user = req.user as any;

    if (!user || !user.id) {
      res.status(401).json({ error: 'Authentication required' });
      return;
    }

    // First, get the event by slug to get the eventId
    const event = await prisma.event.findUnique({
      where: { slug: eventSlug },
      select: { id: true }
    });

    if (!event) {
      res.status(404).json({ error: 'Event not found' });
      return;
    }

    const result = await tagService.getTagsByEvent(event.id, user.id);

    if (!result.success) {
      if (result.error === 'No access to this event.') {
        res.status(403).json({ error: result.error });
        return;
      }
      res.status(500).json({ error: result.error });
      return;
    }

    res.json(result.data);
  } catch (error: any) {
    logger.error('Error fetching tags by event slug:', error);
    res.status(500).json({ error: 'Failed to fetch tags.' });
  }
});

/**
 * @swagger
 * /api/tags:
 *   post:
 *     summary: Create a new tag
 *     tags: [Tags]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - name
 *               - color
 *               - eventId
 *             properties:
 *               name:
 *                 type: string
 *                 description: Tag name (1-50 characters)
 *               color:
 *                 type: string
 *                 description: Hex color code (e.g., #FF0000)
 *               eventId:
 *                 type: string
 *                 description: Event ID
 *     responses:
 *       201:
 *         description: Tag created successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 tag:
 *                   type: object
 *                   properties:
 *                     id:
 *                       type: string
 *                     name:
 *                       type: string
 *                     color:
 *                       type: string
 *                     eventId:
 *                       type: string
 *       400:
 *         description: Validation error
 *       403:
 *         description: Forbidden - Insufficient permissions
 *       500:
 *         description: Internal server error
 */
router.post('/', requireRole(['responder', 'event_admin', 'system_admin']), async (req: Request, res: Response): Promise<void> => {
  try {
    const { name, color, eventId } = req.body;
    const user = req.user as any;

    if (!user || !user.id) {
      res.status(401).json({ error: 'Authentication required' });
      return;
    }

    const result = await tagService.createTag({ name, color, eventId }, user.id);

    if (!result.success) {
      if (result.error === 'Insufficient permissions. Only responders and above can manage tags.') {
        res.status(403).json({ error: result.error });
        return;
      }
      res.status(400).json({ error: result.error });
      return;
    }

    res.status(201).json(result.data);
  } catch (error: any) {
    logger.error('Error creating tag:', error);
    res.status(500).json({ error: 'Failed to create tag.' });
  }
});

/**
 * @swagger
 * /api/tags/{tagId}:
 *   put:
 *     summary: Update a tag
 *     tags: [Tags]
 *     parameters:
 *       - in: path
 *         name: tagId
 *         required: true
 *         schema:
 *           type: string
 *         description: Tag ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               name:
 *                 type: string
 *                 description: Tag name (1-50 characters)
 *               color:
 *                 type: string
 *                 description: Hex color code (e.g., #FF0000)
 *     responses:
 *       200:
 *         description: Tag updated successfully
 *       400:
 *         description: Validation error
 *       403:
 *         description: Forbidden - Insufficient permissions
 *       404:
 *         description: Tag not found
 *       500:
 *         description: Internal server error
 */
router.put('/:tagId', requireRole(['responder', 'event_admin', 'system_admin']), async (req: Request, res: Response): Promise<void> => {
  try {
    const { tagId } = req.params;
    const { name, color } = req.body;
    const user = req.user as any;

    if (!user || !user.id) {
      res.status(401).json({ error: 'Authentication required' });
      return;
    }

    const result = await tagService.updateTag(tagId, { name, color }, user.id);

    if (!result.success) {
      if (result.error === 'Insufficient permissions. Only responders and above can manage tags.') {
        res.status(403).json({ error: result.error });
        return;
      }
      if (result.error === 'Tag not found.') {
        res.status(404).json({ error: result.error });
        return;
      }
      res.status(400).json({ error: result.error });
      return;
    }

    res.json(result.data);
  } catch (error: any) {
    logger.error('Error updating tag:', error);
    res.status(500).json({ error: 'Failed to update tag.' });
  }
});

/**
 * @swagger
 * /api/tags/{tagId}:
 *   delete:
 *     summary: Delete a tag
 *     tags: [Tags]
 *     parameters:
 *       - in: path
 *         name: tagId
 *         required: true
 *         schema:
 *           type: string
 *         description: Tag ID
 *     responses:
 *       200:
 *         description: Tag deleted successfully
 *       400:
 *         description: Tag is in use and cannot be deleted
 *       403:
 *         description: Forbidden - Insufficient permissions
 *       404:
 *         description: Tag not found
 *       500:
 *         description: Internal server error
 */
router.delete('/:tagId', requireRole(['responder', 'event_admin', 'system_admin']), async (req: Request, res: Response): Promise<void> => {
  try {
    const { tagId } = req.params;
    const user = req.user as any;

    if (!user || !user.id) {
      res.status(401).json({ error: 'Authentication required' });
      return;
    }

    const result = await tagService.deleteTag(tagId, user.id);

    if (!result.success) {
      if (result.error === 'Insufficient permissions. Only responders and above can manage tags.') {
        res.status(403).json({ error: result.error });
        return;
      }
      if (result.error === 'Tag not found.') {
        res.status(404).json({ error: result.error });
        return;
      }
      res.status(400).json({ error: result.error });
      return;
    }

    res.json(result.data);
  } catch (error: any) {
    logger.error('Error deleting tag:', error);
    res.status(500).json({ error: 'Failed to delete tag.' });
  }
});

/**
 * @swagger
 * /api/tags/incident/{incidentId}/add:
 *   post:
 *     summary: Add tags to an incident
 *     tags: [Tags]
 *     parameters:
 *       - in: path
 *         name: incidentId
 *         required: true
 *         schema:
 *           type: string
 *         description: Incident ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - tagIds
 *             properties:
 *               tagIds:
 *                 type: array
 *                 items:
 *                   type: string
 *                 description: Array of tag IDs to add
 *     responses:
 *       200:
 *         description: Tags added successfully
 *       400:
 *         description: Validation error
 *       403:
 *         description: Forbidden - Insufficient permissions
 *       404:
 *         description: Incident not found
 *       500:
 *         description: Internal server error
 */
router.post('/incident/:incidentId/add', requireRole(['responder', 'event_admin', 'system_admin']), async (req: Request, res: Response): Promise<void> => {
  try {
    const { incidentId } = req.params;
    const { tagIds } = req.body;
    const user = req.user as any;

    if (!user || !user.id) {
      res.status(401).json({ error: 'Authentication required' });
      return;
    }

    if (!Array.isArray(tagIds) || tagIds.length === 0) {
      res.status(400).json({ error: 'tagIds must be a non-empty array' });
      return;
    }

    const result = await tagService.addTagsToIncident(incidentId, tagIds, user.id);

    if (!result.success) {
      if (result.error === 'Insufficient permissions. Only responders and above can manage incident tags.') {
        res.status(403).json({ error: result.error });
        return;
      }
      if (result.error === 'Incident not found.') {
        res.status(404).json({ error: result.error });
        return;
      }
      res.status(400).json({ error: result.error });
      return;
    }

    res.json(result.data);
  } catch (error: any) {
    logger.error('Error adding tags to incident:', error);
    res.status(500).json({ error: 'Failed to add tags to incident.' });
  }
});

/**
 * @swagger
 * /api/tags/incident/{incidentId}/remove:
 *   post:
 *     summary: Remove tags from an incident
 *     tags: [Tags]
 *     parameters:
 *       - in: path
 *         name: incidentId
 *         required: true
 *         schema:
 *           type: string
 *         description: Incident ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - tagIds
 *             properties:
 *               tagIds:
 *                 type: array
 *                 items:
 *                   type: string
 *                 description: Array of tag IDs to remove
 *     responses:
 *       200:
 *         description: Tags removed successfully
 *       400:
 *         description: Validation error
 *       403:
 *         description: Forbidden - Insufficient permissions
 *       404:
 *         description: Incident not found
 *       500:
 *         description: Internal server error
 */
router.post('/incident/:incidentId/remove', requireRole(['responder', 'event_admin', 'system_admin']), async (req: Request, res: Response): Promise<void> => {
  try {
    const { incidentId } = req.params;
    const { tagIds } = req.body;
    const user = req.user as any;

    if (!user || !user.id) {
      res.status(401).json({ error: 'Authentication required' });
      return;
    }

    if (!Array.isArray(tagIds) || tagIds.length === 0) {
      res.status(400).json({ error: 'tagIds must be a non-empty array' });
      return;
    }

    const result = await tagService.removeTagsFromIncident(incidentId, tagIds, user.id);

    if (!result.success) {
      if (result.error === 'Insufficient permissions. Only responders and above can manage incident tags.') {
        res.status(403).json({ error: result.error });
        return;
      }
      if (result.error === 'Incident not found.') {
        res.status(404).json({ error: result.error });
        return;
      }
      res.status(400).json({ error: result.error });
      return;
    }

    res.json(result.data);
  } catch (error: any) {
    logger.error('Error removing tags from incident:', error);
    res.status(500).json({ error: 'Failed to remove tags from incident.' });
  }
});

/**
 * @swagger
 * /api/tags/{tagId}/incidents:
 *   get:
 *     summary: Get all incidents with a specific tag
 *     tags: [Tags]
 *     parameters:
 *       - in: path
 *         name: tagId
 *         required: true
 *         schema:
 *           type: string
 *         description: Tag ID
 *     responses:
 *       200:
 *         description: Successfully retrieved incidents
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 incidents:
 *                   type: array
 *                   items:
 *                     type: object
 *       403:
 *         description: Forbidden - No access to event
 *       404:
 *         description: Tag not found
 *       500:
 *         description: Internal server error
 */
router.get('/:tagId/incidents', requireRole(['reporter', 'responder', 'event_admin', 'system_admin']), async (req: Request, res: Response): Promise<void> => {
  try {
    const { tagId } = req.params;
    const user = req.user as any;

    if (!user || !user.id) {
      res.status(401).json({ error: 'Authentication required' });
      return;
    }

    const result = await tagService.getIncidentsByTag(tagId, user.id);

    if (!result.success) {
      if (result.error === 'No access to this event.') {
        res.status(403).json({ error: result.error });
        return;
      }
      if (result.error === 'Tag not found.') {
        res.status(404).json({ error: result.error });
        return;
      }
      res.status(500).json({ error: result.error });
      return;
    }

    res.json(result.data);
  } catch (error: any) {
    logger.error('Error fetching incidents by tag:', error);
    res.status(500).json({ error: 'Failed to fetch incidents by tag.' });
  }
});

export default router; 
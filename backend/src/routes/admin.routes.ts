import { Router, Request, Response } from 'express';
import { requireSuperAdmin } from '../utils/rbac';
import { PrismaClient } from '@prisma/client';

const router = Router();
const prisma = new PrismaClient();

/**
 * GET /api/admin/events
 * Get all events with statistics (SuperAdmin only)
 */
router.get('/events', requireSuperAdmin(), async (req: Request, res: Response): Promise<void> => {
  try {
    // Get all events with user and report counts
    const events = await prisma.event.findMany({
      include: {
        userEventRoles: {
          include: {
            user: true,
            role: true,
          },
        },
        reports: {
          select: {
            id: true,
            createdAt: true,
            state: true,
          },
        },
        _count: {
          select: {
            userEventRoles: true,
            reports: true,
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    // Calculate statistics
    const totalUsers = await prisma.user.count();
    const totalReports = await prisma.report.count();
    const activeEvents = events.length; // All events are active for now, will add status field later

    // Transform events data for API response
    const eventsData = events.map((event) => {
      // Find the most recent activity (report or user join)
      const reportDates = event.reports.map(r => r.createdAt);
      const userDates = event.userEventRoles.map(uer => uer.user.createdAt);
      const allDates = [...reportDates, ...userDates, event.createdAt];
      const lastActivity = allDates.length > 0 
        ? new Date(Math.max(...allDates.map(d => d.getTime())))
        : event.createdAt;

      return {
        id: event.id,
        name: event.name,
        slug: event.slug,
        description: event.description,
        status: 'active' as const, // Will implement enable/disable later
        userCount: event._count.userEventRoles,
        reportCount: event._count.reports,
        createdAt: event.createdAt.toISOString(),
        updatedAt: event.updatedAt.toISOString(),
        lastActivity: lastActivity.toISOString(),
        website: event.website,
        contactEmail: event.contactEmail,
      };
    });

    const statistics = {
      totalEvents: events.length,
      activeEvents,
      totalUsers,
      totalReports,
    };

    res.json({
      events: eventsData,
      statistics,
    });
  } catch (error: any) {
    console.error('Error fetching admin events:', error);
    res.status(500).json({
      error: 'Failed to fetch events',
      details: error.message,
    });
  }
});

/**
 * POST /api/admin/events
 * Create a new event (SuperAdmin only)
 */
router.post('/events', requireSuperAdmin(), async (req: Request, res: Response): Promise<void> => {
  try {
    const {
      name,
      slug,
      description,
      website,
      contactEmail,
      startDate,
      endDate,
      codeOfConduct,
      initialAdminEmail,
    } = req.body;

    // Validation
    if (!name || name.length < 3 || name.length > 100) {
      res.status(400).json({
        error: 'Event name is required and must be 3-100 characters',
      });
      return;
    }

    if (!slug || slug.length < 3 || slug.length > 50) {
      res.status(400).json({
        error: 'Event slug is required and must be 3-50 characters',
      });
      return;
    }

    if (!contactEmail || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(contactEmail)) {
      res.status(400).json({
        error: 'Valid contact email is required',
      });
      return;
    }

    if (!initialAdminEmail || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(initialAdminEmail)) {
      res.status(400).json({
        error: 'Valid initial admin email is required',
      });
      return;
    }

    // Validate slug format (lowercase, hyphens only)
    if (!/^[a-z0-9-]+$/.test(slug)) {
      res.status(400).json({
        error: 'Slug must contain only lowercase letters, numbers, and hyphens',
      });
      return;
    }

    // Check if slug already exists
    const existingEvent = await prisma.event.findUnique({
      where: { slug },
    });

    if (existingEvent) {
      res.status(409).json({
        error: 'An event with this slug already exists',
      });
      return;
    }

    // Validate dates if provided
    if (startDate && endDate) {
      const start = new Date(startDate);
      const end = new Date(endDate);
      if (end <= start) {
        res.status(400).json({
          error: 'End date must be after start date',
        });
        return;
      }
    }

    // Create the event
    const event = await prisma.event.create({
      data: {
        name,
        slug,
        description: description || null,
        website: website || null,
        contactEmail,
        startDate: startDate ? new Date(startDate) : null,
        endDate: endDate ? new Date(endDate) : null,
        codeOfConduct: codeOfConduct || null,
      },
    });

    // Find or create the initial admin user
    let adminUser = await prisma.user.findUnique({
      where: { email: initialAdminEmail },
    });

    if (!adminUser) {
      // Create a user without password - they'll need to use magic link to log in
      adminUser = await prisma.user.create({
        data: {
          email: initialAdminEmail,
          name: initialAdminEmail.split('@')[0], // Use email prefix as default name
        },
      });
    }

    // Find the Admin role
    const adminRole = await prisma.role.findUnique({
      where: { name: 'Admin' },
    });

    if (!adminRole) {
      throw new Error('Admin role not found in database');
    }

    // Assign admin role to the user for this event
    await prisma.userEventRole.create({
      data: {
        userId: adminUser.id,
        eventId: event.id,
        roleId: adminRole.id,
      },
    });

    // TODO: Send welcome email to initial admin
    // This would be implemented when we add email functionality

    res.status(201).json({
      message: 'Event created successfully',
      event: {
        id: event.id,
        name: event.name,
        slug: event.slug,
        description: event.description,
        contactEmail: event.contactEmail,
        initialAdmin: adminUser.email,
      },
    });
  } catch (error: any) {
    console.error('Error creating event:', error);
    
    if (error.code === 'P2002') {
      res.status(409).json({
        error: 'Event with this slug already exists',
      });
      return;
    }
    
    res.status(500).json({
      error: 'Failed to create event',
      details: error.message,
    });
  }
});

/**
 * GET /api/admin/events/check-slug/:slug
 * Check if a slug is available (SuperAdmin only)
 */
router.get('/events/check-slug/:slug', requireSuperAdmin(), async (req: Request, res: Response): Promise<void> => {
  try {
    const { slug } = req.params;

    if (!slug) {
      res.status(400).json({
        error: 'Slug parameter is required',
      });
      return;
    }

    // Validate slug format
    if (!/^[a-z0-9-]+$/.test(slug)) {
      res.json({
        available: false,
        reason: 'Slug must contain only lowercase letters, numbers, and hyphens',
      });
      return;
    }

    if (slug.length < 3 || slug.length > 50) {
      res.json({
        available: false,
        reason: 'Slug must be 3-50 characters long',
      });
      return;
    }

    const existingEvent = await prisma.event.findUnique({
      where: { slug },
    });

    res.json({
      available: !existingEvent,
      reason: existingEvent ? 'Slug is already taken' : null,
    });
  } catch (error: any) {
    console.error('Error checking slug availability:', error);
    res.status(500).json({
      error: 'Failed to check slug availability',
      details: error.message,
    });
  }
});

/**
 * GET /api/admin/events/stats
 * Get system-wide statistics (SuperAdmin only)
 */
router.get('/events/stats', requireSuperAdmin(), async (req: Request, res: Response): Promise<void> => {
  try {
    const [
      totalEvents,
      totalUsers,
      totalReports,
      recentActivity,
    ] = await Promise.all([
      prisma.event.count(),
      prisma.user.count(),
      prisma.report.count(),
      prisma.report.findMany({
        take: 10,
        orderBy: { createdAt: 'desc' },
        include: {
          event: {
            select: { name: true, slug: true },
          },
        },
      }),
    ]);

    // Calculate reports by state
    const reportsByState = await prisma.report.groupBy({
      by: ['state'],
      _count: {
        state: true,
      },
    });

    const stateStats = reportsByState.reduce((acc, item) => {
      acc[item.state] = item._count.state;
      return acc;
    }, {} as Record<string, number>);

    res.json({
      totalEvents,
      activeEvents: totalEvents, // Will implement enable/disable later
      totalUsers,
      totalReports,
      reportsByState: stateStats,
      recentActivity: recentActivity.map(report => ({
        id: report.id,
        title: report.title,
        state: report.state,
        eventName: report.event.name,
        eventSlug: report.event.slug,
        createdAt: report.createdAt.toISOString(),
      })),
    });
  } catch (error: any) {
    console.error('Error fetching system stats:', error);
    res.status(500).json({
      error: 'Failed to fetch system statistics',
      details: error.message,
    });
  }
});

/**
 * PATCH /api/admin/system/settings
 * Update system settings (SuperAdmin only)
 */
router.patch('/system/settings', requireSuperAdmin(), async (req: Request, res: Response): Promise<void> => {
  try {
    const updates = req.body;

    if (!updates || typeof updates !== 'object') {
      res.status(400).json({
        error: 'Updates object is required',
      });
      return;
    }

    const results = [];

    // Update each setting
    for (const [key, value] of Object.entries(updates)) {
      if (typeof value !== 'string') {
        res.status(400).json({
          error: `Setting value for '${key}' must be a string`,
        });
        return;
      }

      const setting = await prisma.systemSetting.upsert({
        where: { key },
        update: { value: value as string },
        create: { key, value: value as string },
      });

      results.push(setting);
    }

    res.json({
      message: 'System settings updated successfully',
      updated: results.map(setting => ({
        key: setting.key,
        value: setting.value,
      })),
    });
  } catch (error: any) {
    console.error('Error updating system settings:', error);
    res.status(500).json({
      error: 'Failed to update system settings',
      details: error.message,
    });
  }
});

/**
 * PATCH /api/admin/events/:eventId/toggle
 * Toggle event active status (SuperAdmin only)
 */
router.patch('/events/:eventId/toggle', requireSuperAdmin(), async (req: Request, res: Response): Promise<void> => {
  try {
    const { eventId } = req.params;
    const { enabled } = req.body;

    if (typeof enabled !== 'boolean') {
      res.status(400).json({ error: 'enabled field must be a boolean' });
      return;
    }

    // Update the event's active status
    const updatedEvent = await prisma.event.update({
      where: { id: eventId },
      data: { isActive: enabled },
      select: {
        id: true,
        name: true,
        slug: true,
        isActive: true,
        updatedAt: true,
      },
    });

    res.json({
      message: `Event ${enabled ? 'enabled' : 'disabled'} successfully`,
      event: updatedEvent,
    });
  } catch (error) {
    console.error('Error toggling event status:', error);
    if (error instanceof Error && error.message.includes('Record to update not found')) {
      res.status(404).json({ error: 'Event not found' });
      return;
    }
    res.status(500).json({ error: 'Failed to toggle event status' });
  }
});

export default router; 
import { PrismaClient, NotificationType } from '../generated/prisma/client';
import { ServiceResult } from '../types';
import { UnifiedRBACService } from './unified-rbac.service';
import logger from '../config/logger';

export interface NotificationQuery {
  page?: number;
  limit?: number;
  unreadOnly?: boolean;
  type?: string;
  priority?: string;
}

export interface NotificationCreateData {
  userId: string;
  type: NotificationType;
  priority?: 'low' | 'normal' | 'high' | 'urgent';
  title: string;
  message: string;
  eventId?: string | null;
  incidentId?: string | null;
  actionData?: any;
  actionUrl?: string | null;
}

export interface NotificationWithDetails {
  id: string;
  userId: string;
  type: string;
  priority: string;
  title: string;
  message: string;
  isRead: boolean;
  readAt?: Date | null;
  createdAt: Date;
  updatedAt: Date;
  eventId?: string | null;
  incidentId?: string | null;
  actionData?: any;
  actionUrl?: string | null;
  event?: {
    id: string;
    name: string;
    slug: string;
  } | null;
  incident?: {
    id: string;
    title: string;
    state: string;
  } | null;
}

export interface NotificationListResponse {
  notifications: NotificationWithDetails[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
  unreadCount: number;
}

export interface NotificationStats {
  total: number;
  unread: number;
  byType: Record<string, number>;
  byPriority: Record<string, number>;
}

export class NotificationService {
  private unifiedRBAC: UnifiedRBACService;

  constructor(private prisma: PrismaClient) {
    this.unifiedRBAC = new UnifiedRBACService(prisma);
  }

  /**
   * Get user's notifications with pagination and filtering
   */
  async getUserNotifications(userId: string, query: NotificationQuery): Promise<ServiceResult<NotificationListResponse>> {
    try {
      const {
        page = 1,
        limit = 20,
        unreadOnly = false,
        type,
        priority
      } = query;

      // Validate and parse pagination
      const pageNum = parseInt(page.toString());
      const limitNum = Math.min(parseInt(limit.toString()), 100); // Max 100 per page

      if (pageNum < 1 || limitNum < 1) {
        return {
          success: false,
          error: 'Invalid pagination parameters'
        };
      }

      const skip = (pageNum - 1) * limitNum;

      // Build where clause
      const whereClause: any = { userId };

      if (unreadOnly) {
        whereClause.isRead = false;
      }

      if (type) {
        whereClause.type = type;
      }

      if (priority) {
        whereClause.priority = priority;
      }

      // Get total count
      const total = await this.prisma.notification.count({ where: whereClause });

      // Get notifications with related data
      const notifications = await this.prisma.notification.findMany({
        where: whereClause,
        include: {
          event: {
            select: { id: true, name: true, slug: true }
          },
          incident: {
            select: { id: true, title: true, state: true }
          }
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limitNum
      });

      // Get unread count for the user
      const unreadCount = await this.prisma.notification.count({
        where: { userId, isRead: false }
      });

      return {
        success: true,
        data: {
          notifications,
          pagination: {
            page: pageNum,
            limit: limitNum,
            total,
            totalPages: Math.ceil(total / limitNum)
          },
          unreadCount
        }
      };
    } catch (error: any) {
      logger().error('Error fetching notifications:', error);
      return {
        success: false,
        error: 'Failed to fetch notifications.'
      };
    }
  }

  /**
   * Mark a notification as read
   */
  async markNotificationAsRead(notificationId: string, userId: string): Promise<ServiceResult<{ message: string }>> {
    try {
      // Check if notification belongs to user
      const notification = await this.prisma.notification.findUnique({
        where: { id: notificationId }
      });

      if (!notification) {
        return {
          success: false,
          error: 'Notification not found'
        };
      }

      if (notification.userId !== userId) {
        return {
          success: false,
          error: 'Not authorized to access this notification'
        };
      }

      // Mark as read if not already read
      if (!notification.isRead) {
        await this.prisma.notification.update({
          where: { id: notificationId },
          data: {
            isRead: true,
            readAt: new Date()
          }
        });
      }

      return {
        success: true,
        data: { message: 'Notification marked as read' }
      };
    } catch (error: any) {
      logger().error('Error marking notification as read:', error);
      return {
        success: false,
        error: 'Failed to mark notification as read.'
      };
    }
  }

  /**
   * Mark all notifications as read for a user
   */
  async markAllNotificationsAsRead(userId: string): Promise<ServiceResult<{ message: string; updatedCount: number }>> {
    try {
      const result = await this.prisma.notification.updateMany({
        where: {
          userId,
          isRead: false
        },
        data: {
          isRead: true,
          readAt: new Date()
        }
      });

      return {
        success: true,
        data: {
          message: 'All notifications marked as read',
          updatedCount: result.count
        }
      };
    } catch (error: any) {
      logger().error('Error marking all notifications as read:', error);
      return {
        success: false,
        error: 'Failed to mark all notifications as read.'
      };
    }
  }

  /**
   * Delete a notification
   */
  async deleteNotification(notificationId: string, userId: string): Promise<ServiceResult<{ message: string }>> {
    try {
      // Check if notification belongs to user
      const notification = await this.prisma.notification.findUnique({
        where: { id: notificationId }
      });

      if (!notification) {
        return {
          success: false,
          error: 'Notification not found'
        };
      }

      if (notification.userId !== userId) {
        return {
          success: false,
          error: 'Not authorized to delete this notification'
        };
      }

      await this.prisma.notification.delete({
        where: { id: notificationId }
      });

      return {
        success: true,
        data: { message: 'Notification deleted successfully' }
      };
    } catch (error: any) {
      logger().error('Error deleting notification:', error);
      return {
        success: false,
        error: 'Failed to delete notification.'
      };
    }
  }

  /**
   * Get notification statistics for user
   */
  async getNotificationStats(userId: string): Promise<ServiceResult<NotificationStats>> {
    try {
      // Get counts by type and priority
      const [
        totalCount,
        unreadCount,
        typeCounts,
        priorityCounts
      ] = await Promise.all([
        this.prisma.notification.count({ where: { userId } }),
        this.prisma.notification.count({ where: { userId, isRead: false } }),
        this.prisma.notification.groupBy({
          by: ['type'],
          where: { userId },
          _count: { type: true }
        }),
        this.prisma.notification.groupBy({
          by: ['priority'],
          where: { userId },
          _count: { priority: true }
        })
      ]);

      const typeStats: any = {};
      typeCounts.forEach((item: any) => {
        typeStats[item.type] = item._count.type;
      });

      const priorityStats: any = {};
      priorityCounts.forEach((item: any) => {
        priorityStats[item.priority] = item._count.priority;
      });

      return {
        success: true,
        data: {
          total: totalCount,
          unread: unreadCount,
          byType: typeStats,
          byPriority: priorityStats
        }
      };
    } catch (error: any) {
      logger().error('Error fetching notification stats:', error);
      return {
        success: false,
        error: 'Failed to fetch notification statistics.'
      };
    }
  }

  /**
   * Create a new notification
   */
  async createNotification(data: NotificationCreateData): Promise<ServiceResult<{ notification: any }>> {
    try {
      const {
        userId,
        type,
        priority = 'normal',
        title,
        message,
        eventId = null,
        incidentId = null,
        actionData = null,
        actionUrl = null
      } = data;

      const notification = await this.prisma.notification.create({
        data: {
          userId,
          type,
          priority,
          title,
          message,
          eventId,
          incidentId: incidentId,
          actionData,
          actionUrl,
          isRead: false
        }
      });

      return {
        success: true,
        data: { notification }
      };
    } catch (error: any) {
      logger().error('Error creating notification:', error);
      return {
        success: false,
        error: 'Failed to create notification.'
      };
    }
  }

  /**
   * Create notifications for incident events
   */
  async notifyIncidentEvent(incidentId: string, type: string, excludeUserId: string | null = null): Promise<ServiceResult<{ notificationsCreated: number }>> {
    try {
      // Get incident with event and related users
      const incident = await this.prisma.incident.findUnique({
        where: { id: incidentId },
        include: {
          event: true,
          reporter: true,
          assignedResponder: true
        }
      });

      if (!incident) {
        return {
          success: false,
          error: 'Incident not found'
        };
      }

      const usersToNotify = new Set<string>();

      // Add reporter (if exists and not excluded)
      if (incident.reporterId && incident.reporterId !== excludeUserId) {
        usersToNotify.add(incident.reporterId);
      }

      // Add assigned responder (if exists and not excluded)
      if (incident.assignedResponderId && incident.assignedResponderId !== excludeUserId) {
        usersToNotify.add(incident.assignedResponderId);
      }

      // Add event admins and responders using unified RBAC (excluding the user who triggered the action)
      const eventUserRoles = await this.prisma.userRole.findMany({
        where: {
          scopeType: 'event',
          scopeId: incident.eventId,
          role: {
            name: { in: ['event_admin', 'responder'] }
          }
        },
        select: { userId: true }
      });

      eventUserRoles.forEach(userRole => {
        if (userRole.userId !== excludeUserId) {
          usersToNotify.add(userRole.userId);
        }
      });

      // Create notifications
      let notificationsCreated = 0;
      const notifications = [];

             for (const userId of usersToNotify) {
         let title: string;
         let message: string;
         let notificationType: NotificationType;

         switch (type) {
           case 'incident_submitted':
             title = 'New Incident Submitted';
             message = `A new incident "${incident.title}" has been submitted for ${incident.event.name}`;
             notificationType = 'incident_submitted';
             break;
           case 'incident_assigned':
             title = 'Incident Assigned';
             message = `Incident "${incident.title}" has been assigned in ${incident.event.name}`;
             notificationType = 'incident_assigned';
             break;
           case 'incident_status_changed':
             title = 'Incident Status Updated';
             message = `Incident "${incident.title}" status has been updated in ${incident.event.name}`;
             notificationType = 'incident_status_changed';
             break;
           case 'comment_added':
             title = 'New Comment Added';
             message = `A new comment has been added to incident "${incident.title}" in ${incident.event.name}`;
             notificationType = 'incident_comment_added';
             break;
           default:
             continue; // Skip unknown types
         }

         const notification = await this.prisma.notification.create({
           data: {
             userId,
             type: notificationType,
            priority: 'normal',
            title,
            message,
            eventId: incident.eventId,
            incidentId: incident.id,
            actionUrl: `/events/${incident.event.slug}/incidents/${incident.id}`,
            isRead: false
          }
        });

        notifications.push(notification);
        notificationsCreated++;
      }

      return {
        success: true,
        data: { notificationsCreated }
      };
    } catch (error: any) {
      logger().error('Error creating incident event notifications:', error);
      return {
        success: false,
        error: 'Failed to create incident event notifications.'
      };
    }
  }

  /**
   * Create a test notification (for development/testing)
   */
  async createTestNotification(userId: string): Promise<ServiceResult<{ notification: any }>> {
    try {
      const frontendBaseUrl = process.env.FRONTEND_BASE_URL || 'http://localhost:3000';
      const notification = await this.createNotification({
        userId,
        type: 'system_announcement' as NotificationType,
        priority: 'normal',
        title: 'Test Notification',
        message: 'This is a test notification to verify the notification system is working.',
        actionUrl: `${frontendBaseUrl}/dashboard`
      });

      return notification;
    } catch (error: any) {
      logger().error('Error creating test notification:', error);
      return {
        success: false,
        error: 'Failed to create test notification.'
      };
    }
  }
} 
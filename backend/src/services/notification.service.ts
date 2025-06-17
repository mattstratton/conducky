import { PrismaClient, NotificationType } from '@prisma/client';
import { ServiceResult } from '../types';

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
  reportId?: string | null;
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
  reportId?: string | null;
  actionData?: any;
  actionUrl?: string | null;
  event?: {
    id: string;
    name: string;
    slug: string;
  } | null;
  report?: {
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
  constructor(private prisma: PrismaClient) {}

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
          report: {
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
      console.error('Error fetching notifications:', error);
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
      console.error('Error marking notification as read:', error);
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
      console.error('Error marking all notifications as read:', error);
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
      console.error('Error deleting notification:', error);
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
      console.error('Error fetching notification stats:', error);
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
        reportId = null,
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
          reportId,
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
      console.error('Error creating notification:', error);
      return {
        success: false,
        error: 'Failed to create notification.'
      };
    }
  }

  /**
   * Create notifications for report events
   */
  async notifyReportEvent(reportId: string, type: string, excludeUserId: string | null = null): Promise<ServiceResult<{ notificationsCreated: number }>> {
    try {
      // Get report with event and related users
      const report = await this.prisma.report.findUnique({
        where: { id: reportId },
        include: {
          event: true,
          reporter: true,
          assignedResponder: true
        }
      });

      if (!report) {
        return {
          success: false,
          error: 'Report not found'
        };
      }

      const usersToNotify = new Set<string>();

      // Add reporter (if exists and not excluded)
      if (report.reporterId && report.reporterId !== excludeUserId) {
        usersToNotify.add(report.reporterId);
      }

      // Add assigned responder (if exists and not excluded)
      if (report.assignedResponderId && report.assignedResponderId !== excludeUserId) {
        usersToNotify.add(report.assignedResponderId);
      }

      // Add event admins and responders (excluding the user who triggered the action)
      const eventUsers = await this.prisma.userEventRole.findMany({
        where: {
          eventId: report.eventId,
          role: {
            name: { in: ['Admin', 'Responder'] }
          }
        },
        include: { user: true }
      });

      eventUsers.forEach(eur => {
        if (eur.userId !== excludeUserId) {
          usersToNotify.add(eur.userId);
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
           case 'report_submitted':
             title = 'New Report Submitted';
             message = `A new report "${report.title}" has been submitted for ${report.event.name}`;
             notificationType = 'report_submitted';
             break;
           case 'report_assigned':
             title = 'Report Assigned';
             message = `Report "${report.title}" has been assigned in ${report.event.name}`;
             notificationType = 'report_assigned';
             break;
           case 'report_status_changed':
             title = 'Report Status Updated';
             message = `Report "${report.title}" status has been updated in ${report.event.name}`;
             notificationType = 'report_status_changed';
             break;
           case 'comment_added':
             title = 'New Comment Added';
             message = `A new comment has been added to report "${report.title}" in ${report.event.name}`;
             notificationType = 'report_comment_added';
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
            eventId: report.eventId,
            reportId: report.id,
            actionUrl: `/events/${report.event.slug}/reports/${report.id}`,
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
      console.error('Error creating report event notifications:', error);
      return {
        success: false,
        error: 'Failed to create report event notifications.'
      };
    }
  }

  /**
   * Create a test notification (for development/testing)
   */
  async createTestNotification(userId: string): Promise<ServiceResult<{ notification: any }>> {
    try {
      const notification = await this.createNotification({
        userId,
        type: 'system_announcement' as NotificationType,
        priority: 'normal',
        title: 'Test Notification',
        message: 'This is a test notification to verify the notification system is working.',
        actionUrl: '/dashboard'
      });

      return notification;
    } catch (error: any) {
      console.error('Error creating test notification:', error);
      return {
        success: false,
        error: 'Failed to create test notification.'
      };
    }
  }
} 
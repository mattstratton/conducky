/**
 * Notification Utilities
 * 
 * This module handles notification creation and management
 */

import { prisma } from '../config/database';

/**
 * Create a notification for a user
 */
export async function createNotification({
  userId,
  type,
  priority = 'normal',
  title,
  message,
  eventId = null,
  reportId = null,
  actionData = null,
  actionUrl = null
}: {
  userId: string;
  type: 'report_submitted' | 'report_assigned' | 'report_status_changed' | 'report_comment_added' | 'event_invitation' | 'event_role_changed' | 'system_announcement';
  priority?: 'low' | 'normal' | 'high' | 'urgent';
  title: string;
  message: string;
  eventId?: string | null;
  reportId?: string | null;
  actionData?: any;
  actionUrl?: string | null;
}) {
  try {
    const notification = await prisma.notification.create({
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
      },
    });
    return notification;
  } catch (error) {
    console.error('Failed to create notification:', error);
    throw error;
  }
}

/**
 * Notify users about report events
 */
export async function notifyReportEvent(reportId: string, type: string, excludeUserId: string | null = null) {
  try {
    // Get the report with event and reporter info
    const report = await prisma.report.findUnique({
      where: { id: reportId },
      include: {
        event: true,
        reporter: true,
      },
    });

    if (!report) {
      console.error('Report not found for notification:', reportId);
      return;
    }

    // Get all users with Responder or Admin roles for this event
    const eventUsers = await prisma.userEventRole.findMany({
      where: {
        eventId: report.eventId,
        role: {
          name: {
            in: ['Responder', 'Admin'],
          },
        },
      },
      include: {
        user: true,
        role: true,
      },
    });

    // Create notifications for each relevant user
    const notifications = eventUsers
      .filter(userRole => userRole.userId !== excludeUserId)
      .map(userRole => {
        let title = '';
        let message = '';
        let priority: 'low' | 'normal' | 'high' | 'urgent' = 'normal';

        switch (type) {
          case 'submitted':
            title = 'New Report Submitted';
            message = `A new report has been submitted for ${report.event.name}`;
            priority = 'high';
            break;
          case 'assigned':
            title = 'Report Assigned';
            message = `Report #${report.id.substring(0, 8)} has been assigned`;
            priority = 'normal';
            break;
          case 'status_changed':
            title = 'Report Status Updated';
            message = `Report #${report.id.substring(0, 8)} status has been updated`;
            priority = 'normal';
            break;
          case 'comment_added':
            title = 'New Comment Added';
            message = `A new comment has been added to report #${report.id.substring(0, 8)}`;
            priority = 'normal';
            break;
          default:
            title = 'Report Update';
            message = `Report #${report.id.substring(0, 8)} has been updated`;
            priority = 'normal';
        }

        return createNotification({
          userId: userRole.userId,
          type: type === 'submitted' ? 'report_submitted' : 
                type === 'assigned' ? 'report_assigned' :
                type === 'status_changed' ? 'report_status_changed' :
                type === 'comment_added' ? 'report_comment_added' : 'report_submitted',
          priority,
          title,
          message,
          eventId: report.eventId,
          reportId: report.id,
          actionUrl: `/events/${report.event.slug}/reports/${report.id}`,
        });
      });

    await Promise.all(notifications);
    console.log(`Created ${notifications.length} notifications for report ${reportId}`);
  } catch (error) {
    console.error('Failed to notify report event:', error);
  }
}

/**
 * Mark notification as read
 */
export async function markNotificationAsRead(notificationId: string, userId: string) {
  try {
    const notification = await prisma.notification.updateMany({
      where: {
        id: notificationId,
        userId: userId, // Ensure user can only mark their own notifications as read
      },
      data: {
        isRead: true,
        readAt: new Date(),
      },
    });
    return notification;
  } catch (error) {
    console.error('Failed to mark notification as read:', error);
    throw error;
  }
}

/**
 * Mark all notifications as read for a user
 */
export async function markAllNotificationsAsRead(userId: string) {
  try {
    const result = await prisma.notification.updateMany({
      where: {
        userId: userId,
        isRead: false,
      },
      data: {
        isRead: true,
        readAt: new Date(),
      },
    });
    return result;
  } catch (error) {
    console.error('Failed to mark all notifications as read:', error);
    throw error;
  }
}

/**
 * Get notification statistics for a user
 */
export async function getNotificationStats(userId: string) {
  try {
    const [total, unread, urgent] = await Promise.all([
      prisma.notification.count({
        where: { userId },
      }),
      prisma.notification.count({
        where: { userId, isRead: false },
      }),
      prisma.notification.count({
        where: { userId, isRead: false, priority: 'urgent' },
      }),
    ]);

    return { total, unread, urgent };
  } catch (error) {
    console.error('Failed to get notification stats:', error);
    throw error;
  }
} 
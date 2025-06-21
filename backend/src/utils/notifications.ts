/**
 * Notification Utilities
 * 
 * This module handles notification creation and management
 */

import { prisma } from '../config/database';
import { getUserNotificationSettings } from '../services/user-notification-settings.service';
import { emailService } from './email';

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

    // Check user notification settings for email delivery
    const settings = await getUserNotificationSettings(userId);
    let shouldSendEmail = false;
    // Type-safe mapping for settings key
    const emailTypeMap: Record<string, keyof typeof settings> = {
      report_submitted: 'reportSubmittedEmail',
      report_assigned: 'reportAssignedEmail',
      report_status_changed: 'reportStatusChangedEmail',
      report_comment_added: 'reportCommentAddedEmail',
      event_invitation: 'eventInvitationEmail',
      event_role_changed: 'eventRoleChangedEmail',
      system_announcement: 'systemAnnouncementEmail',
    };
    const emailTypeKey = emailTypeMap[type];
    if (emailTypeKey && settings[emailTypeKey]) {
      // Fetch user email (assume userId is valid)
      const user = await prisma.user.findUnique({ where: { id: userId } });
      if (user && user.email) {
        try {
          await emailService.sendNotificationEmail({
            to: user.email,
            name: user.name || user.email,
            subject: title,
            message,
            actionUrl: actionUrl || undefined,
          });
        } catch (emailError) {
          console.error('Failed to send notification email:', emailError);
          // Continue with notification creation even if email fails
        }
      }
    }
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
      if (process.env.NODE_ENV !== 'test') {
        console.error('Report not found for notification:', reportId);
      }
      return;
    }

    // Get all users with Responder or Event Admin roles for this event
    const eventUsers = await prisma.userEventRole.findMany({
      where: {
        eventId: report.eventId,
        role: {
          name: {
            in: ['Responder', 'Event Admin'],
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
          case 'report_submitted':
          case 'submitted': // backward compatibility
            title = 'New Report Submitted';
            message = `A new report has been submitted for ${report.event.name}`;
            priority = 'high';
            break;
          case 'report_assigned':
          case 'assigned': // backward compatibility
            title = 'Report Assigned';
            message = `Report #${report.id.substring(0, 8)} has been assigned`;
            priority = 'normal';
            break;
          case 'report_status_changed':
          case 'status_changed': // backward compatibility
            title = 'Report Status Updated';
            message = `Report #${report.id.substring(0, 8)} status has been updated`;
            priority = 'normal';
            break;
          case 'report_comment_added':
          case 'comment_added': // backward compatibility
            title = 'New Comment Added';
            message = `A new comment has been added to report #${report.id.substring(0, 8)}`;
            priority = 'normal';
            break;
          default:
            title = 'Report Update';
            message = `Report #${report.id.substring(0, 8)} has been updated`;
            priority = 'normal';
        }

        const frontendBaseUrl = process.env.FRONTEND_BASE_URL || 'http://localhost:3000';
        const actionUrl = `${frontendBaseUrl}/events/${report.event.slug}/reports/${report.id}`;
        
        // Map notification types with fallback error handling
        const getNotificationType = (inputType: string): 'report_submitted' | 'report_assigned' | 'report_status_changed' | 'report_comment_added' => {
          const typeMap: Record<string, 'report_submitted' | 'report_assigned' | 'report_status_changed' | 'report_comment_added'> = {
            'report_submitted': 'report_submitted', 
            'submitted': 'report_submitted',
            'report_assigned': 'report_assigned', 
            'assigned': 'report_assigned',
            'report_status_changed': 'report_status_changed', 
            'status_changed': 'report_status_changed',
            'report_comment_added': 'report_comment_added', 
            'comment_added': 'report_comment_added'
          };
          
          if (!(inputType in typeMap)) {
            console.warn(`Unknown notification type: ${inputType}, falling back to 'report_submitted'`);
            return 'report_submitted';
          }
          return typeMap[inputType];
        };

        return createNotification({
          userId: userRole.userId,
          type: getNotificationType(type) as 'report_submitted' | 'report_assigned' | 'report_status_changed' | 'report_comment_added' | 'event_invitation' | 'event_role_changed' | 'system_announcement',
          priority,
          title,
          message,
          eventId: report.eventId,
          reportId: report.id,
          actionUrl,
        });
      });

    await Promise.all(notifications);
    
    // Only log in non-test environments
    if (process.env.NODE_ENV !== 'test') {
      console.log(`Created ${notifications.length} notifications for report ${reportId}`);
    }
  } catch (error) {
    if (process.env.NODE_ENV !== 'test') {
      console.error('Failed to notify report event:', error);
    }
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
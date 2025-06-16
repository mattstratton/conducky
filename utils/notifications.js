const { prisma } = require("../config/database");

// Helper function to create notifications
async function createNotification({
  userId,
  type,
  priority = 'normal',
  title,
  message,
  eventId = null,
  reportId = null,
  actionData = null,
  actionUrl = null
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
        actionData: actionData ? JSON.stringify(actionData) : null,
        actionUrl
      }
    });
    return notification;
  } catch (err) {
    console.error("Error creating notification:", err);
    throw err;
  }
}

// Helper function to notify users about report events
async function notifyReportEvent(reportId, type, excludeUserId = null) {
  try {
    const report = await prisma.report.findUnique({
      where: { id: reportId },
      include: {
        event: true,
        reporter: true,
        assignedResponder: true
      }
    });

    if (!report) return;

    const notifications = [];

    switch (type) {
      case 'report_submitted':
        // Notify event admins and responders
        const eventStaff = await prisma.userEventRole.findMany({
          where: {
            eventId: report.eventId,
            role: { name: { in: ['Admin', 'Responder'] } }
          },
          include: { user: true }
        });

        for (const staff of eventStaff) {
          if (staff.userId !== excludeUserId) {
            notifications.push(createNotification({
              userId: staff.userId,
              type: 'report_submitted',
              priority: 'high',
              title: 'New Report Submitted',
              message: `A new report "${report.title}" was submitted in ${report.event.name}`,
              eventId: report.eventId,
              reportId: report.id,
              actionUrl: `/events/${report.event.slug}/reports/${report.id}`
            }));
          }
        }
        break;

      case 'report_assigned':
        // Notify the assigned responder
        if (report.assignedResponderId && report.assignedResponderId !== excludeUserId) {
          notifications.push(createNotification({
            userId: report.assignedResponderId,
            type: 'report_assigned',
            priority: 'high',
            title: 'Report Assigned to You',
            message: `You have been assigned to report "${report.title}" in ${report.event.name}`,
            eventId: report.eventId,
            reportId: report.id,
            actionUrl: `/events/${report.event.slug}/reports/${report.id}`
          }));
        }
        break;

      case 'report_status_changed':
        // Notify reporter and assigned responder
        const usersToNotify = [];
        if (report.reporterId && report.reporterId !== excludeUserId) {
          usersToNotify.push(report.reporterId);
        }
        if (report.assignedResponderId && report.assignedResponderId !== excludeUserId) {
          usersToNotify.push(report.assignedResponderId);
        }

        for (const userId of usersToNotify) {
          notifications.push(createNotification({
            userId,
            type: 'report_status_changed',
            priority: 'normal',
            title: 'Report Status Updated',
            message: `Report "${report.title}" status changed to ${report.state} in ${report.event.name}`,
            eventId: report.eventId,
            reportId: report.id,
            actionUrl: `/events/${report.event.slug}/reports/${report.id}`
          }));
        }
        break;

      case 'report_comment_added':
        // Notify reporter, assigned responder, and event admins (excluding commenter)
        const interestedUsers = new Set();
        if (report.reporterId) interestedUsers.add(report.reporterId);
        if (report.assignedResponderId) interestedUsers.add(report.assignedResponderId);

        // Add event admins
        const admins = await prisma.userEventRole.findMany({
          where: {
            eventId: report.eventId,
            role: { name: 'Admin' }
          }
        });
        admins.forEach(admin => interestedUsers.add(admin.userId));

        // Remove the commenter
        if (excludeUserId) interestedUsers.delete(excludeUserId);

        for (const userId of interestedUsers) {
          notifications.push(createNotification({
            userId,
            type: 'report_comment_added',
            priority: 'normal',
            title: 'New Comment on Report',
            message: `A new comment was added to report "${report.title}" in ${report.event.name}`,
            eventId: report.eventId,
            reportId: report.id,
            actionUrl: `/events/${report.event.slug}/reports/${report.id}`
          }));
        }
        break;
    }

    // Create all notifications
    await Promise.all(notifications);

  } catch (err) {
    console.error("Error creating report notifications:", err);
  }
}

module.exports = { createNotification, notifyReportEvent }; 
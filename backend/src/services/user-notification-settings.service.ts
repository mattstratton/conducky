import { PrismaClient } from '@prisma/client';
import { UserNotificationSettings } from '../../types';

const prisma = new PrismaClient();

export async function getUserNotificationSettings(userId: string): Promise<UserNotificationSettings> {
  let settings = await prisma.userNotificationSettings.findUnique({ where: { userId } });
  if (!settings) {
    // Create default settings if not present
    settings = await prisma.userNotificationSettings.create({
      data: { userId },
    });
  }
  return settings as UserNotificationSettings;
}

export async function updateUserNotificationSettings(userId: string, data: Partial<UserNotificationSettings>): Promise<UserNotificationSettings> {
  const settings = await prisma.userNotificationSettings.update({
    where: { userId },
    data,
  });
  return settings as UserNotificationSettings;
}

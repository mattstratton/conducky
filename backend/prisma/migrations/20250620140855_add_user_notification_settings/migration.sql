-- CreateTable
CREATE TABLE "UserNotificationSettings" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "reportSubmittedInApp" BOOLEAN NOT NULL DEFAULT true,
    "reportSubmittedEmail" BOOLEAN NOT NULL DEFAULT false,
    "reportAssignedInApp" BOOLEAN NOT NULL DEFAULT true,
    "reportAssignedEmail" BOOLEAN NOT NULL DEFAULT false,
    "reportStatusChangedInApp" BOOLEAN NOT NULL DEFAULT true,
    "reportStatusChangedEmail" BOOLEAN NOT NULL DEFAULT false,
    "reportCommentAddedInApp" BOOLEAN NOT NULL DEFAULT true,
    "reportCommentAddedEmail" BOOLEAN NOT NULL DEFAULT false,
    "eventInvitationInApp" BOOLEAN NOT NULL DEFAULT true,
    "eventInvitationEmail" BOOLEAN NOT NULL DEFAULT false,
    "eventRoleChangedInApp" BOOLEAN NOT NULL DEFAULT true,
    "eventRoleChangedEmail" BOOLEAN NOT NULL DEFAULT false,
    "systemAnnouncementInApp" BOOLEAN NOT NULL DEFAULT true,
    "systemAnnouncementEmail" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "UserNotificationSettings_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "UserNotificationSettings_userId_key" ON "UserNotificationSettings"("userId");

-- AddForeignKey
ALTER TABLE "UserNotificationSettings" ADD CONSTRAINT "UserNotificationSettings_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

/*
  Warnings:

  - Added the required column `roleId` to the `EventInviteLink` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "EventInviteLink" ADD COLUMN     "roleId" TEXT;

-- Set all existing invites to Reporter role
UPDATE "EventInviteLink" SET "roleId" = 'ba5f6c5c-cc26-4379-a18e-5412e25db6af' WHERE "roleId" IS NULL;

-- Make roleId NOT NULL
ALTER TABLE "EventInviteLink" ALTER COLUMN "roleId" SET NOT NULL;

-- AddForeignKey
ALTER TABLE "EventInviteLink" ADD CONSTRAINT "EventInviteLink_roleId_fkey" FOREIGN KEY ("roleId") REFERENCES "Role"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

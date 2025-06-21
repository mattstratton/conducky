-- DropForeignKey
ALTER TABLE "AuditLog" DROP CONSTRAINT "AuditLog_eventId_fkey";

-- AlterTable
ALTER TABLE "AuditLog" ALTER COLUMN "eventId" DROP NOT NULL;

-- AddForeignKey
ALTER TABLE "AuditLog" ADD CONSTRAINT "AuditLog_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "Event"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- DropForeignKey
ALTER TABLE "UserEventRole" DROP CONSTRAINT "UserEventRole_eventId_fkey";

-- AlterTable
ALTER TABLE "UserEventRole" ALTER COLUMN "eventId" DROP NOT NULL;

-- AddForeignKey
ALTER TABLE "UserEventRole" ADD CONSTRAINT "UserEventRole_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "Event"("id") ON DELETE SET NULL ON UPDATE CASCADE;

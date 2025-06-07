-- CreateEnum
CREATE TYPE "ReportSeverity" AS ENUM ('low', 'medium', 'high', 'critical');

-- AlterTable
ALTER TABLE "Report" ADD COLUMN     "assignedResponderId" TEXT,
ADD COLUMN     "resolution" TEXT,
ADD COLUMN     "severity" "ReportSeverity";

-- AddForeignKey
ALTER TABLE "Report" ADD CONSTRAINT "Report_assignedResponderId_fkey" FOREIGN KEY ("assignedResponderId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

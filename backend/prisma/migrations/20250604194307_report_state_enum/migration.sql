/*
  Warnings:

  - Changed the type of `state` on the `Report` table. No cast exists, the column would be dropped and recreated, which cannot be done if there is data, since the column is required.

*/
-- CreateEnum
CREATE TYPE "ReportState" AS ENUM ('submitted', 'acknowledged', 'investigating', 'resolved', 'closed');

-- AlterTable
ALTER TABLE "Report"
  ALTER COLUMN "state" TYPE "ReportState" USING "state"::"ReportState";

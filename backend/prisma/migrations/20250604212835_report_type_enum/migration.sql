/*
  Warnings:

  - Changed the type of `type` on the `Report` table. No cast exists, the column would be dropped and recreated, which cannot be done if there is data, since the column is required.
  - Changed the type of `state` on the `Report` table. No cast exists, the column would be dropped and recreated, which cannot be done if there is data, since the column is required.

*/
-- CreateEnum
CREATE TYPE "ReportState" AS ENUM ('submitted', 'acknowledged', 'investigating', 'resolved', 'closed');

-- CreateEnum
CREATE TYPE "ReportType" AS ENUM ('harassment', 'safety', 'other');

-- AlterTable
ALTER TABLE "Report" DROP COLUMN "type",
ADD COLUMN     "type" "ReportType" NOT NULL,
DROP COLUMN "state",
ADD COLUMN     "state" "ReportState" NOT NULL;

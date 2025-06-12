/*
  Warnings:

  - Added the required column `title` to the `Report` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "Report" ADD COLUMN "title" VARCHAR(70);
UPDATE "Report" SET "title" = 'Untitled Report' WHERE "title" IS NULL;
ALTER TABLE "Report" ALTER COLUMN "title" SET NOT NULL;

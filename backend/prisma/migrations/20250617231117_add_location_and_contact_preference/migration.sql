-- CreateEnum
CREATE TYPE "ContactPreference" AS ENUM ('email', 'phone', 'in_person', 'no_contact');

-- AlterTable
ALTER TABLE "Report" ADD COLUMN     "contactPreference" "ContactPreference" NOT NULL DEFAULT 'email',
ADD COLUMN     "location" TEXT;

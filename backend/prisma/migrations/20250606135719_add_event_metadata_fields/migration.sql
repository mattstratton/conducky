-- AlterTable
ALTER TABLE "Event" ADD COLUMN     "codeOfConduct" TEXT,
ADD COLUMN     "description" TEXT,
ADD COLUMN     "endDate" TIMESTAMP(3),
ADD COLUMN     "logo" TEXT,
ADD COLUMN     "startDate" TIMESTAMP(3),
ADD COLUMN     "website" TEXT;

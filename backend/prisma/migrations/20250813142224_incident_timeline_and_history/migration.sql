-- AlterTable
ALTER TABLE "Incident" ADD COLUMN     "escalatedAt" TIMESTAMP(3),
ADD COLUMN     "firstResponseAt" TIMESTAMP(3),
ADD COLUMN     "reopenedAt" TIMESTAMP(3),
ADD COLUMN     "resolvedAt" TIMESTAMP(3);

-- CreateTable
CREATE TABLE "IncidentStateHistory" (
    "id" TEXT NOT NULL,
    "incidentId" TEXT NOT NULL,
    "fromState" "IncidentState",
    "toState" "IncidentState" NOT NULL,
    "changedById" TEXT,
    "notes" TEXT,
    "changedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "IncidentStateHistory_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "IncidentStateHistory_incidentId_changedAt_idx" ON "IncidentStateHistory"("incidentId", "changedAt");

-- AddForeignKey
ALTER TABLE "IncidentStateHistory" ADD CONSTRAINT "IncidentStateHistory_incidentId_fkey" FOREIGN KEY ("incidentId") REFERENCES "Incident"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "IncidentStateHistory" ADD CONSTRAINT "IncidentStateHistory_changedById_fkey" FOREIGN KEY ("changedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

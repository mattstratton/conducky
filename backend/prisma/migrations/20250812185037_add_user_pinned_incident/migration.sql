-- CreateTable
CREATE TABLE "UserPinnedIncident" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "incidentId" TEXT NOT NULL,
    "eventId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "UserPinnedIncident_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "UserPinnedIncident_userId_eventId_idx" ON "UserPinnedIncident"("userId", "eventId");

-- CreateIndex
CREATE INDEX "UserPinnedIncident_eventId_idx" ON "UserPinnedIncident"("eventId");

-- CreateIndex
CREATE UNIQUE INDEX "UserPinnedIncident_userId_incidentId_key" ON "UserPinnedIncident"("userId", "incidentId");

-- AddForeignKey
ALTER TABLE "UserPinnedIncident" ADD CONSTRAINT "UserPinnedIncident_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserPinnedIncident" ADD CONSTRAINT "UserPinnedIncident_incidentId_fkey" FOREIGN KEY ("incidentId") REFERENCES "Incident"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserPinnedIncident" ADD CONSTRAINT "UserPinnedIncident_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "Event"("id") ON DELETE CASCADE ON UPDATE CASCADE;

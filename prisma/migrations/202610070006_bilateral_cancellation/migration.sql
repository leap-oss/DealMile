CREATE TABLE "CancellationRequest" (
  "id" TEXT NOT NULL,
  "projectId" TEXT NOT NULL,
  "requestedById" TEXT NOT NULL,
  "reason" TEXT NOT NULL,
  "status" TEXT NOT NULL DEFAULT 'PENDING',
  "settlement" JSONB NOT NULL,
  "decidedById" TEXT,
  "decisionNote" TEXT,
  "decidedAt" TIMESTAMP(3),
  "deliveryCaseId" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "CancellationRequest_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "CancellationRequest_deliveryCaseId_key" ON "CancellationRequest"("deliveryCaseId");
CREATE INDEX "CancellationRequest_projectId_status_idx" ON "CancellationRequest"("projectId", "status");
CREATE UNIQUE INDEX "CancellationRequest_one_pending_per_project" ON "CancellationRequest"("projectId") WHERE "status" IN ('PENDING', 'REFUND_PENDING');
ALTER TABLE "CancellationRequest" ADD CONSTRAINT "CancellationRequest_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "CancellationRequest" ADD CONSTRAINT "CancellationRequest_deliveryCaseId_fkey" FOREIGN KEY ("deliveryCaseId") REFERENCES "DeliveryCase"("id") ON DELETE SET NULL ON UPDATE CASCADE;

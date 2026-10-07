ALTER TABLE "Project" ADD COLUMN "paymentHold" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "Milestone" ADD COLUMN "dueAt" TIMESTAMP(3);
ALTER TABLE "Payment" ADD COLUMN "paypalRefundId" TEXT, ADD COLUMN "refundVerifiedAt" TIMESTAMP(3);
CREATE UNIQUE INDEX "Payment_paypalRefundId_key" ON "Payment"("paypalRefundId");
UPDATE "Milestone" m SET "dueAt" = p."verifiedAt" + m."estimatedDays" * INTERVAL '1 day'
FROM "Payment" p WHERE p."milestoneId" = m.id AND p.status = 'CAPTURED' AND p."verifiedAt" IS NOT NULL;
CREATE TABLE "DeadlineExtension" (
 "id" TEXT PRIMARY KEY, "milestoneId" TEXT NOT NULL REFERENCES "Milestone"("id") ON DELETE CASCADE,
 "previousDueAt" TIMESTAMP(3) NOT NULL, "requestedDueAt" TIMESTAMP(3) NOT NULL,
 "reason" TEXT NOT NULL, "status" TEXT NOT NULL DEFAULT 'PENDING', "decidedAt" TIMESTAMP(3), "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX "DeadlineExtension_milestoneId_status_idx" ON "DeadlineExtension"("milestoneId", "status");
CREATE TABLE "DeliveryCase" (
 "id" TEXT PRIMARY KEY, "milestoneId" TEXT NOT NULL REFERENCES "Milestone"("id") ON DELETE CASCADE,
 "reason" TEXT NOT NULL, "evidence" TEXT NOT NULL, "status" TEXT NOT NULL DEFAULT 'OPEN',
 "response" TEXT, "resolution" TEXT, "proposedDueAt" TIMESTAMP(3), "refundRequestKey" TEXT NOT NULL,
 "approvedAt" TIMESTAMP(3), "resolvedAt" TIMESTAMP(3), "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, "updatedAt" TIMESTAMP(3) NOT NULL
);
CREATE UNIQUE INDEX "DeliveryCase_refundRequestKey_key" ON "DeliveryCase"("refundRequestKey");
CREATE INDEX "DeliveryCase_milestoneId_status_idx" ON "DeliveryCase"("milestoneId", "status");
CREATE TABLE "DeliveryReminder" (
 "id" TEXT PRIMARY KEY, "milestoneId" TEXT NOT NULL REFERENCES "Milestone"("id") ON DELETE CASCADE,
 "dueAt" TIMESTAMP(3) NOT NULL, "kind" TEXT NOT NULL, "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE UNIQUE INDEX "DeliveryReminder_milestoneId_dueAt_kind_key" ON "DeliveryReminder"("milestoneId", "dueAt", "kind");

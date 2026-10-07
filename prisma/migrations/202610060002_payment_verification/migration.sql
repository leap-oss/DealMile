-- AlterTable
ALTER TABLE "Milestone" ADD COLUMN     "submissionNote" TEXT,
ADD COLUMN     "submittedAt" TIMESTAMP(3);

-- AlterTable
ALTER TABLE "Payment" ADD COLUMN     "paypalPayeeId" TEXT,
ADD COLUMN     "requestKey" TEXT NOT NULL,
ADD COLUMN     "verifiedAt" TIMESTAMP(3),
ADD COLUMN     "webhookVerifiedAt" TIMESTAMP(3),
ALTER COLUMN "paypalOrderId" DROP NOT NULL;

-- CreateIndex
CREATE UNIQUE INDEX "Payment_milestoneId_key" ON "Payment"("milestoneId");

-- CreateIndex
CREATE UNIQUE INDEX "Payment_requestKey_key" ON "Payment"("requestKey");


/*
  Warnings:

  - The `readinessStatus` column on the `Property` table would be dropped and recreated. This will lead to data loss if there is data in the column.

*/
-- CreateEnum
CREATE TYPE "PropertyReadinessStatus" AS ENUM ('ready', 'borderline', 'not_ready', 'unknown');

-- CreateEnum
CREATE TYPE "PropertyConditionType" AS ENUM ('supply', 'issue', 'damage');

-- CreateEnum
CREATE TYPE "PropertyConditionStatus" AS ENUM ('open', 'monitoring', 'resolved', 'dismissed');

-- CreateEnum
CREATE TYPE "PropertyConditionBlockingStatus" AS ENUM ('blocking', 'non_blocking', 'warning');

-- CreateEnum
CREATE TYPE "PropertyConditionSeverity" AS ENUM ('low', 'medium', 'high', 'critical');

-- CreateEnum
CREATE TYPE "PropertyConditionManagerDecision" AS ENUM ('allow_with_issue', 'block_until_resolved', 'monitor', 'resolved', 'dismissed');

-- AlterTable
ALTER TABLE "Property" ADD COLUMN     "openBlockingConditionCount" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "openConditionCount" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "openWarningConditionCount" INTEGER NOT NULL DEFAULT 0,
DROP COLUMN "readinessStatus",
ADD COLUMN     "readinessStatus" "PropertyReadinessStatus";

-- CreateTable
CREATE TABLE "PropertyCondition" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "propertyId" TEXT NOT NULL,
    "taskId" TEXT,
    "bookingId" TEXT,
    "propertySupplyId" TEXT,
    "mergeKey" TEXT,
    "sourceType" TEXT NOT NULL DEFAULT 'system',
    "sourceLabel" TEXT,
    "sourceItemId" TEXT,
    "sourceItemLabel" TEXT,
    "sourceRunId" TEXT,
    "sourceAnswerId" TEXT,
    "conditionType" "PropertyConditionType" NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "locationText" TEXT,
    "status" "PropertyConditionStatus" NOT NULL DEFAULT 'open',
    "blockingStatus" "PropertyConditionBlockingStatus" NOT NULL DEFAULT 'warning',
    "severity" "PropertyConditionSeverity" NOT NULL DEFAULT 'medium',
    "managerDecision" "PropertyConditionManagerDecision",
    "managerNotes" TEXT,
    "evidence" JSONB,
    "firstDetectedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lastDetectedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "resolvedAt" TIMESTAMP(3),
    "dismissedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PropertyCondition_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "PropertyCondition_organizationId_idx" ON "PropertyCondition"("organizationId");

-- CreateIndex
CREATE INDEX "PropertyCondition_propertyId_idx" ON "PropertyCondition"("propertyId");

-- CreateIndex
CREATE INDEX "PropertyCondition_taskId_idx" ON "PropertyCondition"("taskId");

-- CreateIndex
CREATE INDEX "PropertyCondition_bookingId_idx" ON "PropertyCondition"("bookingId");

-- CreateIndex
CREATE INDEX "PropertyCondition_propertySupplyId_idx" ON "PropertyCondition"("propertySupplyId");

-- CreateIndex
CREATE INDEX "PropertyCondition_mergeKey_idx" ON "PropertyCondition"("mergeKey");

-- CreateIndex
CREATE INDEX "PropertyCondition_conditionType_idx" ON "PropertyCondition"("conditionType");

-- CreateIndex
CREATE INDEX "PropertyCondition_status_idx" ON "PropertyCondition"("status");

-- CreateIndex
CREATE INDEX "PropertyCondition_blockingStatus_idx" ON "PropertyCondition"("blockingStatus");

-- CreateIndex
CREATE INDEX "PropertyCondition_severity_idx" ON "PropertyCondition"("severity");

-- CreateIndex
CREATE INDEX "PropertyCondition_managerDecision_idx" ON "PropertyCondition"("managerDecision");

-- CreateIndex
CREATE INDEX "PropertyCondition_propertyId_status_idx" ON "PropertyCondition"("propertyId", "status");

-- CreateIndex
CREATE INDEX "PropertyCondition_propertyId_blockingStatus_idx" ON "PropertyCondition"("propertyId", "blockingStatus");

-- CreateIndex
CREATE INDEX "PropertyCondition_propertyId_conditionType_idx" ON "PropertyCondition"("propertyId", "conditionType");

-- CreateIndex
CREATE INDEX "PropertyCondition_propertyId_createdAt_idx" ON "PropertyCondition"("propertyId", "createdAt");

-- CreateIndex
CREATE INDEX "PropertyCondition_propertyId_mergeKey_idx" ON "PropertyCondition"("propertyId", "mergeKey");

-- CreateIndex
CREATE INDEX "Property_readinessStatus_idx" ON "Property"("readinessStatus");

-- CreateIndex
CREATE INDEX "Property_organizationId_readinessStatus_idx" ON "Property"("organizationId", "readinessStatus");

-- AddForeignKey
ALTER TABLE "PropertyCondition" ADD CONSTRAINT "PropertyCondition_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PropertyCondition" ADD CONSTRAINT "PropertyCondition_propertyId_fkey" FOREIGN KEY ("propertyId") REFERENCES "Property"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PropertyCondition" ADD CONSTRAINT "PropertyCondition_taskId_fkey" FOREIGN KEY ("taskId") REFERENCES "Task"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PropertyCondition" ADD CONSTRAINT "PropertyCondition_bookingId_fkey" FOREIGN KEY ("bookingId") REFERENCES "Booking"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PropertyCondition" ADD CONSTRAINT "PropertyCondition_propertySupplyId_fkey" FOREIGN KEY ("propertySupplyId") REFERENCES "PropertySupply"("id") ON DELETE SET NULL ON UPDATE CASCADE;

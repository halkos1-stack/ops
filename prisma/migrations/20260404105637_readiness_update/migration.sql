/*
  Warnings:

  - A unique constraint covering the columns `[taskSupplyRunId,runItemId]` on the table `TaskSupplyAnswer` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `runItemId` to the `TaskChecklistAnswer` table without a default value. This is not possible if the table is not empty.
  - Added the required column `runItemId` to the `TaskIssueAnswer` table without a default value. This is not possible if the table is not empty.
  - Added the required column `runItemId` to the `TaskSupplyAnswer` table without a default value. This is not possible if the table is not empty.

*/
-- DropForeignKey
ALTER TABLE "TaskChecklistAnswer" DROP CONSTRAINT "TaskChecklistAnswer_templateItemId_fkey";

-- DropForeignKey
ALTER TABLE "TaskChecklistRun" DROP CONSTRAINT "TaskChecklistRun_templateId_fkey";

-- DropForeignKey
ALTER TABLE "TaskIssueAnswer" DROP CONSTRAINT "TaskIssueAnswer_templateItemId_fkey";

-- DropForeignKey
ALTER TABLE "TaskIssueRun" DROP CONSTRAINT "TaskIssueRun_templateId_fkey";

-- DropForeignKey
ALTER TABLE "TaskSupplyAnswer" DROP CONSTRAINT "TaskSupplyAnswer_propertySupplyId_fkey";

-- DropIndex
DROP INDEX "TaskSupplyAnswer_taskSupplyRunId_propertySupplyId_key";

-- AlterTable
ALTER TABLE "Task" ADD COLUMN     "usesCustomizedIssuesChecklist" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "usesCustomizedSuppliesChecklist" BOOLEAN NOT NULL DEFAULT false;

-- AlterTable
ALTER TABLE "TaskChecklistAnswer" ADD COLUMN     "runItemId" TEXT NOT NULL,
ALTER COLUMN "templateItemId" DROP NOT NULL;

-- AlterTable
ALTER TABLE "TaskChecklistRun" ADD COLUMN     "isCustomized" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "sourceTemplateDescription" TEXT,
ADD COLUMN     "sourceTemplateTitle" TEXT,
ADD COLUMN     "templateType" TEXT DEFAULT 'main',
ALTER COLUMN "templateId" DROP NOT NULL;

-- AlterTable
ALTER TABLE "TaskIssueAnswer" ADD COLUMN     "runItemId" TEXT NOT NULL,
ALTER COLUMN "templateItemId" DROP NOT NULL;

-- AlterTable
ALTER TABLE "TaskIssueRun" ADD COLUMN     "isCustomized" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "sourceTemplateDescription" TEXT,
ADD COLUMN     "sourceTemplateTitle" TEXT,
ALTER COLUMN "templateId" DROP NOT NULL;

-- AlterTable
ALTER TABLE "TaskSupplyAnswer" ADD COLUMN     "runItemId" TEXT NOT NULL,
ALTER COLUMN "propertySupplyId" DROP NOT NULL;

-- AlterTable
ALTER TABLE "TaskSupplyRun" ADD COLUMN     "isCustomized" BOOLEAN NOT NULL DEFAULT false;

-- CreateTable
CREATE TABLE "TaskChecklistRunItem" (
    "id" TEXT NOT NULL,
    "checklistRunId" TEXT NOT NULL,
    "propertyTemplateItemId" TEXT,
    "label" TEXT NOT NULL,
    "labelEn" TEXT,
    "description" TEXT,
    "itemType" TEXT NOT NULL,
    "isRequired" BOOLEAN NOT NULL DEFAULT true,
    "sortOrder" INTEGER NOT NULL,
    "category" TEXT DEFAULT 'inspection',
    "requiresPhoto" BOOLEAN NOT NULL DEFAULT false,
    "opensIssueOnFail" BOOLEAN NOT NULL DEFAULT false,
    "optionsText" TEXT,
    "issueTypeOnFail" TEXT DEFAULT 'repair',
    "issueSeverityOnFail" TEXT DEFAULT 'medium',
    "failureValuesText" TEXT,
    "linkedSupplyItemId" TEXT,
    "linkedSupplyItemName" TEXT,
    "linkedSupplyItemNameEl" TEXT,
    "linkedSupplyItemNameEn" TEXT,
    "supplyUpdateMode" TEXT NOT NULL DEFAULT 'none',
    "supplyQuantity" DOUBLE PRECISION,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TaskChecklistRunItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TaskIssueRunItem" (
    "id" TEXT NOT NULL,
    "issueRunId" TEXT NOT NULL,
    "propertyTemplateItemId" TEXT,
    "label" TEXT NOT NULL,
    "labelEn" TEXT,
    "description" TEXT,
    "sortOrder" INTEGER NOT NULL,
    "itemType" TEXT NOT NULL DEFAULT 'issue_check',
    "isRequired" BOOLEAN NOT NULL DEFAULT true,
    "allowsIssue" BOOLEAN NOT NULL DEFAULT true,
    "allowsDamage" BOOLEAN NOT NULL DEFAULT true,
    "defaultIssueType" TEXT DEFAULT 'repair',
    "defaultSeverity" TEXT DEFAULT 'medium',
    "requiresPhoto" BOOLEAN NOT NULL DEFAULT false,
    "affectsHostingByDefault" BOOLEAN NOT NULL DEFAULT false,
    "urgentByDefault" BOOLEAN NOT NULL DEFAULT false,
    "locationHint" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TaskIssueRunItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TaskSupplyRunItem" (
    "id" TEXT NOT NULL,
    "taskSupplyRunId" TEXT NOT NULL,
    "propertySupplyId" TEXT,
    "supplyItemId" TEXT,
    "propertySupplyCode" TEXT,
    "label" TEXT NOT NULL,
    "labelEn" TEXT,
    "category" TEXT,
    "unit" TEXT,
    "fillLevel" TEXT,
    "currentStock" DOUBLE PRECISION,
    "targetStock" DOUBLE PRECISION,
    "reorderThreshold" DOUBLE PRECISION,
    "targetLevel" DOUBLE PRECISION,
    "minimumThreshold" DOUBLE PRECISION,
    "trackingMode" TEXT NOT NULL DEFAULT 'fill_level',
    "isCritical" BOOLEAN NOT NULL DEFAULT false,
    "warningThreshold" DOUBLE PRECISION,
    "sortOrder" INTEGER NOT NULL,
    "isRequired" BOOLEAN NOT NULL DEFAULT true,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TaskSupplyRunItem_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "TaskChecklistRunItem_checklistRunId_idx" ON "TaskChecklistRunItem"("checklistRunId");

-- CreateIndex
CREATE INDEX "TaskChecklistRunItem_checklistRunId_sortOrder_idx" ON "TaskChecklistRunItem"("checklistRunId", "sortOrder");

-- CreateIndex
CREATE INDEX "TaskChecklistRunItem_propertyTemplateItemId_idx" ON "TaskChecklistRunItem"("propertyTemplateItemId");

-- CreateIndex
CREATE INDEX "TaskChecklistRunItem_linkedSupplyItemId_idx" ON "TaskChecklistRunItem"("linkedSupplyItemId");

-- CreateIndex
CREATE INDEX "TaskIssueRunItem_issueRunId_idx" ON "TaskIssueRunItem"("issueRunId");

-- CreateIndex
CREATE INDEX "TaskIssueRunItem_issueRunId_sortOrder_idx" ON "TaskIssueRunItem"("issueRunId", "sortOrder");

-- CreateIndex
CREATE INDEX "TaskIssueRunItem_propertyTemplateItemId_idx" ON "TaskIssueRunItem"("propertyTemplateItemId");

-- CreateIndex
CREATE INDEX "TaskSupplyRunItem_taskSupplyRunId_idx" ON "TaskSupplyRunItem"("taskSupplyRunId");

-- CreateIndex
CREATE INDEX "TaskSupplyRunItem_taskSupplyRunId_sortOrder_idx" ON "TaskSupplyRunItem"("taskSupplyRunId", "sortOrder");

-- CreateIndex
CREATE INDEX "TaskSupplyRunItem_propertySupplyId_idx" ON "TaskSupplyRunItem"("propertySupplyId");

-- CreateIndex
CREATE INDEX "TaskSupplyRunItem_supplyItemId_idx" ON "TaskSupplyRunItem"("supplyItemId");

-- CreateIndex
CREATE INDEX "TaskChecklistAnswer_runItemId_idx" ON "TaskChecklistAnswer"("runItemId");

-- CreateIndex
CREATE INDEX "TaskChecklistRun_isCustomized_idx" ON "TaskChecklistRun"("isCustomized");

-- CreateIndex
CREATE INDEX "TaskIssueAnswer_runItemId_idx" ON "TaskIssueAnswer"("runItemId");

-- CreateIndex
CREATE INDEX "TaskIssueRun_isCustomized_idx" ON "TaskIssueRun"("isCustomized");

-- CreateIndex
CREATE INDEX "TaskSupplyAnswer_runItemId_idx" ON "TaskSupplyAnswer"("runItemId");

-- CreateIndex
CREATE UNIQUE INDEX "TaskSupplyAnswer_taskSupplyRunId_runItemId_key" ON "TaskSupplyAnswer"("taskSupplyRunId", "runItemId");

-- CreateIndex
CREATE INDEX "TaskSupplyRun_isCustomized_idx" ON "TaskSupplyRun"("isCustomized");

-- AddForeignKey
ALTER TABLE "TaskChecklistRun" ADD CONSTRAINT "TaskChecklistRun_templateId_fkey" FOREIGN KEY ("templateId") REFERENCES "PropertyChecklistTemplate"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TaskChecklistRunItem" ADD CONSTRAINT "TaskChecklistRunItem_checklistRunId_fkey" FOREIGN KEY ("checklistRunId") REFERENCES "TaskChecklistRun"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TaskChecklistRunItem" ADD CONSTRAINT "TaskChecklistRunItem_propertyTemplateItemId_fkey" FOREIGN KEY ("propertyTemplateItemId") REFERENCES "PropertyChecklistTemplateItem"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TaskChecklistRunItem" ADD CONSTRAINT "TaskChecklistRunItem_linkedSupplyItemId_fkey" FOREIGN KEY ("linkedSupplyItemId") REFERENCES "SupplyItem"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TaskChecklistAnswer" ADD CONSTRAINT "TaskChecklistAnswer_runItemId_fkey" FOREIGN KEY ("runItemId") REFERENCES "TaskChecklistRunItem"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TaskChecklistAnswer" ADD CONSTRAINT "TaskChecklistAnswer_templateItemId_fkey" FOREIGN KEY ("templateItemId") REFERENCES "PropertyChecklistTemplateItem"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TaskIssueRun" ADD CONSTRAINT "TaskIssueRun_templateId_fkey" FOREIGN KEY ("templateId") REFERENCES "PropertyIssueTemplate"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TaskIssueRunItem" ADD CONSTRAINT "TaskIssueRunItem_issueRunId_fkey" FOREIGN KEY ("issueRunId") REFERENCES "TaskIssueRun"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TaskIssueRunItem" ADD CONSTRAINT "TaskIssueRunItem_propertyTemplateItemId_fkey" FOREIGN KEY ("propertyTemplateItemId") REFERENCES "PropertyIssueTemplateItem"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TaskIssueAnswer" ADD CONSTRAINT "TaskIssueAnswer_runItemId_fkey" FOREIGN KEY ("runItemId") REFERENCES "TaskIssueRunItem"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TaskIssueAnswer" ADD CONSTRAINT "TaskIssueAnswer_templateItemId_fkey" FOREIGN KEY ("templateItemId") REFERENCES "PropertyIssueTemplateItem"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TaskSupplyRunItem" ADD CONSTRAINT "TaskSupplyRunItem_taskSupplyRunId_fkey" FOREIGN KEY ("taskSupplyRunId") REFERENCES "TaskSupplyRun"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TaskSupplyRunItem" ADD CONSTRAINT "TaskSupplyRunItem_propertySupplyId_fkey" FOREIGN KEY ("propertySupplyId") REFERENCES "PropertySupply"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TaskSupplyRunItem" ADD CONSTRAINT "TaskSupplyRunItem_supplyItemId_fkey" FOREIGN KEY ("supplyItemId") REFERENCES "SupplyItem"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TaskSupplyAnswer" ADD CONSTRAINT "TaskSupplyAnswer_runItemId_fkey" FOREIGN KEY ("runItemId") REFERENCES "TaskSupplyRunItem"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TaskSupplyAnswer" ADD CONSTRAINT "TaskSupplyAnswer_propertySupplyId_fkey" FOREIGN KEY ("propertySupplyId") REFERENCES "PropertySupply"("id") ON DELETE SET NULL ON UPDATE CASCADE;

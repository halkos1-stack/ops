-- AlterTable
ALTER TABLE "Issue" ADD COLUMN     "affectsHosting" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "locationText" TEXT,
ADD COLUMN     "requiresImmediateAction" BOOLEAN NOT NULL DEFAULT false;

-- AlterTable
ALTER TABLE "Property" ADD COLUMN     "nextCheckInAt" TIMESTAMP(3),
ADD COLUMN     "readinessReasonsText" TEXT;

-- AlterTable
ALTER TABLE "PropertyChecklistTemplateItem" ADD COLUMN     "labelEn" TEXT;

-- AlterTable
ALTER TABLE "Task" ADD COLUMN     "sendIssuesChecklist" BOOLEAN NOT NULL DEFAULT false;

-- AlterTable
ALTER TABLE "TaskSupplyAnswer" ADD COLUMN     "quantityValue" DOUBLE PRECISION;

-- CreateTable
CREATE TABLE "PropertyIssueTemplate" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "propertyId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "isPrimary" BOOLEAN NOT NULL DEFAULT false,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PropertyIssueTemplate_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PropertyIssueTemplateItem" (
    "id" TEXT NOT NULL,
    "templateId" TEXT NOT NULL,
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

    CONSTRAINT "PropertyIssueTemplateItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TaskIssueRun" (
    "id" TEXT NOT NULL,
    "taskId" TEXT NOT NULL,
    "templateId" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "startedAt" TIMESTAMP(3),
    "completedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TaskIssueRun_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TaskIssueAnswer" (
    "id" TEXT NOT NULL,
    "issueRunId" TEXT NOT NULL,
    "templateItemId" TEXT NOT NULL,
    "reportType" TEXT,
    "title" TEXT,
    "description" TEXT,
    "severity" TEXT,
    "affectsHosting" BOOLEAN,
    "requiresImmediateAction" BOOLEAN,
    "locationText" TEXT,
    "photoUrls" JSONB,
    "createdIssueId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TaskIssueAnswer_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "PropertyIssueTemplate_organizationId_idx" ON "PropertyIssueTemplate"("organizationId");

-- CreateIndex
CREATE INDEX "PropertyIssueTemplate_propertyId_idx" ON "PropertyIssueTemplate"("propertyId");

-- CreateIndex
CREATE INDEX "PropertyIssueTemplate_propertyId_isPrimary_idx" ON "PropertyIssueTemplate"("propertyId", "isPrimary");

-- CreateIndex
CREATE INDEX "PropertyIssueTemplate_propertyId_isActive_idx" ON "PropertyIssueTemplate"("propertyId", "isActive");

-- CreateIndex
CREATE INDEX "PropertyIssueTemplateItem_templateId_idx" ON "PropertyIssueTemplateItem"("templateId");

-- CreateIndex
CREATE INDEX "PropertyIssueTemplateItem_templateId_sortOrder_idx" ON "PropertyIssueTemplateItem"("templateId", "sortOrder");

-- CreateIndex
CREATE UNIQUE INDEX "TaskIssueRun_taskId_key" ON "TaskIssueRun"("taskId");

-- CreateIndex
CREATE INDEX "TaskIssueRun_templateId_idx" ON "TaskIssueRun"("templateId");

-- CreateIndex
CREATE INDEX "TaskIssueRun_status_idx" ON "TaskIssueRun"("status");

-- CreateIndex
CREATE INDEX "TaskIssueAnswer_issueRunId_idx" ON "TaskIssueAnswer"("issueRunId");

-- CreateIndex
CREATE INDEX "TaskIssueAnswer_templateItemId_idx" ON "TaskIssueAnswer"("templateItemId");

-- CreateIndex
CREATE INDEX "TaskIssueAnswer_createdIssueId_idx" ON "TaskIssueAnswer"("createdIssueId");

-- CreateIndex
CREATE INDEX "Issue_affectsHosting_idx" ON "Issue"("affectsHosting");

-- CreateIndex
CREATE INDEX "Issue_requiresImmediateAction_idx" ON "Issue"("requiresImmediateAction");

-- CreateIndex
CREATE INDEX "Property_readinessStatus_idx" ON "Property"("readinessStatus");

-- CreateIndex
CREATE INDEX "Property_nextCheckInAt_idx" ON "Property"("nextCheckInAt");

-- CreateIndex
CREATE INDEX "SupplyItem_nameEn_idx" ON "SupplyItem"("nameEn");

-- AddForeignKey
ALTER TABLE "PropertyIssueTemplate" ADD CONSTRAINT "PropertyIssueTemplate_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PropertyIssueTemplate" ADD CONSTRAINT "PropertyIssueTemplate_propertyId_fkey" FOREIGN KEY ("propertyId") REFERENCES "Property"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PropertyIssueTemplateItem" ADD CONSTRAINT "PropertyIssueTemplateItem_templateId_fkey" FOREIGN KEY ("templateId") REFERENCES "PropertyIssueTemplate"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TaskIssueRun" ADD CONSTRAINT "TaskIssueRun_taskId_fkey" FOREIGN KEY ("taskId") REFERENCES "Task"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TaskIssueRun" ADD CONSTRAINT "TaskIssueRun_templateId_fkey" FOREIGN KEY ("templateId") REFERENCES "PropertyIssueTemplate"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TaskIssueAnswer" ADD CONSTRAINT "TaskIssueAnswer_issueRunId_fkey" FOREIGN KEY ("issueRunId") REFERENCES "TaskIssueRun"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TaskIssueAnswer" ADD CONSTRAINT "TaskIssueAnswer_templateItemId_fkey" FOREIGN KEY ("templateItemId") REFERENCES "PropertyIssueTemplateItem"("id") ON DELETE CASCADE ON UPDATE CASCADE;

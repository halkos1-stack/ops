-- AlterTable
ALTER TABLE "PropertySupply" ADD COLUMN     "fillLevel" TEXT NOT NULL DEFAULT 'full',
ADD COLUMN     "isActive" BOOLEAN NOT NULL DEFAULT true;

-- AlterTable
ALTER TABLE "Task" ADD COLUMN     "sendCleaningChecklist" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "sendSuppliesChecklist" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "usesCustomizedCleaningChecklist" BOOLEAN NOT NULL DEFAULT false;

-- CreateTable
CREATE TABLE "TaskSupplyRun" (
    "id" TEXT NOT NULL,
    "taskId" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "startedAt" TIMESTAMP(3),
    "completedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TaskSupplyRun_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TaskSupplyAnswer" (
    "id" TEXT NOT NULL,
    "taskSupplyRunId" TEXT NOT NULL,
    "propertySupplyId" TEXT NOT NULL,
    "fillLevel" TEXT NOT NULL,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TaskSupplyAnswer_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "TaskSupplyRun_taskId_key" ON "TaskSupplyRun"("taskId");

-- CreateIndex
CREATE INDEX "TaskSupplyRun_status_idx" ON "TaskSupplyRun"("status");

-- CreateIndex
CREATE INDEX "TaskSupplyAnswer_taskSupplyRunId_idx" ON "TaskSupplyAnswer"("taskSupplyRunId");

-- CreateIndex
CREATE INDEX "TaskSupplyAnswer_propertySupplyId_idx" ON "TaskSupplyAnswer"("propertySupplyId");

-- CreateIndex
CREATE INDEX "TaskSupplyAnswer_fillLevel_idx" ON "TaskSupplyAnswer"("fillLevel");

-- CreateIndex
CREATE UNIQUE INDEX "TaskSupplyAnswer_taskSupplyRunId_propertySupplyId_key" ON "TaskSupplyAnswer"("taskSupplyRunId", "propertySupplyId");

-- CreateIndex
CREATE INDEX "PropertySupply_isActive_idx" ON "PropertySupply"("isActive");

-- CreateIndex
CREATE INDEX "PropertySupply_fillLevel_idx" ON "PropertySupply"("fillLevel");

-- AddForeignKey
ALTER TABLE "TaskSupplyRun" ADD CONSTRAINT "TaskSupplyRun_taskId_fkey" FOREIGN KEY ("taskId") REFERENCES "Task"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TaskSupplyAnswer" ADD CONSTRAINT "TaskSupplyAnswer_taskSupplyRunId_fkey" FOREIGN KEY ("taskSupplyRunId") REFERENCES "TaskSupplyRun"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TaskSupplyAnswer" ADD CONSTRAINT "TaskSupplyAnswer_propertySupplyId_fkey" FOREIGN KEY ("propertySupplyId") REFERENCES "PropertySupply"("id") ON DELETE CASCADE ON UPDATE CASCADE;

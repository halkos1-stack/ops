-- AlterTable
ALTER TABLE "PropertyChecklistTemplateItem" ADD COLUMN     "failureValuesText" TEXT,
ADD COLUMN     "issueSeverityOnFail" TEXT DEFAULT 'medium',
ADD COLUMN     "issueTypeOnFail" TEXT DEFAULT 'repair',
ADD COLUMN     "linkedSupplyItemId" TEXT,
ADD COLUMN     "supplyQuantity" DOUBLE PRECISION,
ADD COLUMN     "supplyUpdateMode" TEXT NOT NULL DEFAULT 'none';

-- CreateIndex
CREATE INDEX "PropertyChecklistTemplateItem_linkedSupplyItemId_idx" ON "PropertyChecklistTemplateItem"("linkedSupplyItemId");

-- CreateIndex
CREATE INDEX "PropertyChecklistTemplateItem_supplyUpdateMode_idx" ON "PropertyChecklistTemplateItem"("supplyUpdateMode");

-- AddForeignKey
ALTER TABLE "PropertyChecklistTemplateItem" ADD CONSTRAINT "PropertyChecklistTemplateItem_linkedSupplyItemId_fkey" FOREIGN KEY ("linkedSupplyItemId") REFERENCES "SupplyItem"("id") ON DELETE SET NULL ON UPDATE CASCADE;

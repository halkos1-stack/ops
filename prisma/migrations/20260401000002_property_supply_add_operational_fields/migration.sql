-- AlterTable: add operational fields to PropertySupply (additive only, legacy targetStock/reorderThreshold kept)
ALTER TABLE "PropertySupply" ADD COLUMN "targetLevel"      DOUBLE PRECISION;
ALTER TABLE "PropertySupply" ADD COLUMN "minimumThreshold" DOUBLE PRECISION;
ALTER TABLE "PropertySupply" ADD COLUMN "trackingMode"     TEXT NOT NULL DEFAULT 'fill_level';
ALTER TABLE "PropertySupply" ADD COLUMN "isCritical"       BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "PropertySupply" ADD COLUMN "warningThreshold" DOUBLE PRECISION;

-- Backfill targetLevel from existing targetStock
UPDATE "PropertySupply"
SET "targetLevel" = "targetStock"
WHERE "targetStock" IS NOT NULL;

-- Backfill minimumThreshold: COALESCE(reorderThreshold, SupplyItem.minimumStock)
UPDATE "PropertySupply" ps
SET "minimumThreshold" = COALESCE(
  ps."reorderThreshold",
  (SELECT si."minimumStock" FROM "SupplyItem" si WHERE si.id = ps."supplyItemId")
)
WHERE ps."reorderThreshold" IS NOT NULL
   OR EXISTS (
     SELECT 1 FROM "SupplyItem" si
     WHERE si.id = ps."supplyItemId"
       AND si."minimumStock" IS NOT NULL
   );

-- CreateIndex
CREATE INDEX "PropertySupply_trackingMode_idx" ON "PropertySupply"("trackingMode");

-- CreateIndex
CREATE INDEX "PropertySupply_isCritical_idx" ON "PropertySupply"("isCritical");

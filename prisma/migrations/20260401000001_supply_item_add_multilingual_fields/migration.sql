-- AlterTable: add multilingual name fields to SupplyItem (additive only, legacy name kept)
ALTER TABLE "SupplyItem" ADD COLUMN "nameEl" TEXT;
ALTER TABLE "SupplyItem" ADD COLUMN "nameEn" TEXT;

-- Backfill nameEl from existing name
UPDATE "SupplyItem" SET "nameEl" = "name";

-- CreateIndex
CREATE INDEX "SupplyItem_nameEl_idx" ON "SupplyItem"("nameEl");

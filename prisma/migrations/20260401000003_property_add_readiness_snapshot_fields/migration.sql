-- AlterTable: add readiness snapshot fields to Property (additive only, initially null)
ALTER TABLE "Property" ADD COLUMN "readinessStatus"    TEXT;
ALTER TABLE "Property" ADD COLUMN "readinessUpdatedAt" TIMESTAMP(3);

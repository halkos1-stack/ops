/*
  Warnings:

  - Made the column `externalBookingId` on table `Booking` required. This step will fail if there are existing NULL values in that column.
  - Made the column `adults` on table `Booking` required. This step will fail if there are existing NULL values in that column.
  - Made the column `children` on table `Booking` required. This step will fail if there are existing NULL values in that column.
  - Made the column `infants` on table `Booking` required. This step will fail if there are existing NULL values in that column.
  - Made the column `importedAt` on table `Booking` required. This step will fail if there are existing NULL values in that column.

*/
-- CreateEnum
CREATE TYPE "BookingSyncStatus" AS ENUM ('PENDING_MATCH', 'READY_FOR_ACTION', 'CANCELLED', 'ERROR');

-- CreateEnum
CREATE TYPE "BookingMappingStatus" AS ENUM ('ACTIVE', 'INACTIVE');

-- DropForeignKey
ALTER TABLE "Booking" DROP CONSTRAINT "Booking_propertyId_fkey";

-- AlterTable
ALTER TABLE "Booking" ADD COLUMN     "externalListingId" TEXT,
ADD COLUMN     "externalListingName" TEXT,
ADD COLUMN     "isManual" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "lastError" TEXT,
ADD COLUMN     "lastProcessedAt" TIMESTAMP(3),
ADD COLUMN     "needsMapping" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "rawPayload" JSONB,
ADD COLUMN     "sourceUpdatedAt" TIMESTAMP(3),
ADD COLUMN     "syncStatus" "BookingSyncStatus" NOT NULL DEFAULT 'PENDING_MATCH',
ALTER COLUMN "propertyId" DROP NOT NULL,
ALTER COLUMN "externalBookingId" SET NOT NULL,
ALTER COLUMN "adults" SET NOT NULL,
ALTER COLUMN "children" SET NOT NULL,
ALTER COLUMN "infants" SET NOT NULL,
ALTER COLUMN "importedAt" SET NOT NULL,
ALTER COLUMN "importedAt" SET DEFAULT CURRENT_TIMESTAMP;

-- AlterTable
ALTER TABLE "Task" ADD COLUMN     "alertAt" TIMESTAMP(3),
ADD COLUMN     "alertEnabled" BOOLEAN NOT NULL DEFAULT false;

-- CreateTable
CREATE TABLE "BookingPropertyMapping" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "propertyId" TEXT NOT NULL,
    "sourcePlatform" TEXT NOT NULL,
    "externalListingId" TEXT NOT NULL,
    "externalListingName" TEXT,
    "status" "BookingMappingStatus" NOT NULL DEFAULT 'ACTIVE',
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "BookingPropertyMapping_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BookingSyncEvent" (
    "id" TEXT NOT NULL,
    "bookingId" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "eventType" TEXT NOT NULL,
    "sourcePlatform" TEXT NOT NULL,
    "resultStatus" "BookingSyncStatus",
    "message" TEXT,
    "payload" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "BookingSyncEvent_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "BookingPropertyMapping_organizationId_idx" ON "BookingPropertyMapping"("organizationId");

-- CreateIndex
CREATE INDEX "BookingPropertyMapping_propertyId_idx" ON "BookingPropertyMapping"("propertyId");

-- CreateIndex
CREATE INDEX "BookingPropertyMapping_sourcePlatform_idx" ON "BookingPropertyMapping"("sourcePlatform");

-- CreateIndex
CREATE INDEX "BookingPropertyMapping_status_idx" ON "BookingPropertyMapping"("status");

-- CreateIndex
CREATE INDEX "BookingPropertyMapping_externalListingId_idx" ON "BookingPropertyMapping"("externalListingId");

-- CreateIndex
CREATE UNIQUE INDEX "BookingPropertyMapping_organizationId_sourcePlatform_extern_key" ON "BookingPropertyMapping"("organizationId", "sourcePlatform", "externalListingId");

-- CreateIndex
CREATE INDEX "BookingSyncEvent_bookingId_idx" ON "BookingSyncEvent"("bookingId");

-- CreateIndex
CREATE INDEX "BookingSyncEvent_organizationId_idx" ON "BookingSyncEvent"("organizationId");

-- CreateIndex
CREATE INDEX "BookingSyncEvent_sourcePlatform_idx" ON "BookingSyncEvent"("sourcePlatform");

-- CreateIndex
CREATE INDEX "BookingSyncEvent_eventType_idx" ON "BookingSyncEvent"("eventType");

-- CreateIndex
CREATE INDEX "BookingSyncEvent_resultStatus_idx" ON "BookingSyncEvent"("resultStatus");

-- CreateIndex
CREATE INDEX "BookingSyncEvent_createdAt_idx" ON "BookingSyncEvent"("createdAt");

-- CreateIndex
CREATE INDEX "Booking_syncStatus_idx" ON "Booking"("syncStatus");

-- CreateIndex
CREATE INDEX "Booking_needsMapping_idx" ON "Booking"("needsMapping");

-- CreateIndex
CREATE INDEX "Booking_externalListingId_idx" ON "Booking"("externalListingId");

-- CreateIndex
CREATE INDEX "Booking_organizationId_propertyId_checkOutDate_idx" ON "Booking"("organizationId", "propertyId", "checkOutDate");

-- CreateIndex
CREATE INDEX "Task_alertEnabled_idx" ON "Task"("alertEnabled");

-- CreateIndex
CREATE INDEX "Task_alertAt_idx" ON "Task"("alertAt");

-- AddForeignKey
ALTER TABLE "Booking" ADD CONSTRAINT "Booking_propertyId_fkey" FOREIGN KEY ("propertyId") REFERENCES "Property"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BookingPropertyMapping" ADD CONSTRAINT "BookingPropertyMapping_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BookingPropertyMapping" ADD CONSTRAINT "BookingPropertyMapping_propertyId_fkey" FOREIGN KEY ("propertyId") REFERENCES "Property"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BookingSyncEvent" ADD CONSTRAINT "BookingSyncEvent_bookingId_fkey" FOREIGN KEY ("bookingId") REFERENCES "Booking"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BookingSyncEvent" ADD CONSTRAINT "BookingSyncEvent_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

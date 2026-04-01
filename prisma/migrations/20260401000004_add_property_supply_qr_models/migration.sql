-- CreateTable: PropertySupplyQRCode
CREATE TABLE "PropertySupplyQRCode" (
    "id"               TEXT NOT NULL,
    "organizationId"   TEXT NOT NULL,
    "propertyId"       TEXT NOT NULL,
    "propertySupplyId" TEXT NOT NULL,
    "code"             TEXT NOT NULL,
    "label"            TEXT,
    "isActive"         BOOLEAN NOT NULL DEFAULT true,
    "createdAt"        TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt"        TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PropertySupplyQRCode_pkey" PRIMARY KEY ("id")
);

-- CreateTable: PropertySupplyQRScan
CREATE TABLE "PropertySupplyQRScan" (
    "id"        TEXT NOT NULL,
    "qrCodeId"  TEXT NOT NULL,
    "taskId"    TEXT,
    "scannedBy" TEXT,
    "fillLevel" TEXT,
    "notes"     TEXT,
    "scannedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PropertySupplyQRScan_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "PropertySupplyQRCode_code_key" ON "PropertySupplyQRCode"("code");

-- CreateIndex
CREATE INDEX "PropertySupplyQRCode_organizationId_idx" ON "PropertySupplyQRCode"("organizationId");

-- CreateIndex
CREATE INDEX "PropertySupplyQRCode_propertyId_idx" ON "PropertySupplyQRCode"("propertyId");

-- CreateIndex
CREATE INDEX "PropertySupplyQRCode_propertySupplyId_idx" ON "PropertySupplyQRCode"("propertySupplyId");

-- CreateIndex
CREATE INDEX "PropertySupplyQRCode_code_idx" ON "PropertySupplyQRCode"("code");

-- CreateIndex
CREATE INDEX "PropertySupplyQRCode_isActive_idx" ON "PropertySupplyQRCode"("isActive");

-- CreateIndex
CREATE INDEX "PropertySupplyQRScan_qrCodeId_idx" ON "PropertySupplyQRScan"("qrCodeId");

-- CreateIndex
CREATE INDEX "PropertySupplyQRScan_taskId_idx" ON "PropertySupplyQRScan"("taskId");

-- CreateIndex
CREATE INDEX "PropertySupplyQRScan_scannedAt_idx" ON "PropertySupplyQRScan"("scannedAt");

-- AddForeignKey
ALTER TABLE "PropertySupplyQRCode" ADD CONSTRAINT "PropertySupplyQRCode_organizationId_fkey"
    FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PropertySupplyQRCode" ADD CONSTRAINT "PropertySupplyQRCode_propertyId_fkey"
    FOREIGN KEY ("propertyId") REFERENCES "Property"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PropertySupplyQRCode" ADD CONSTRAINT "PropertySupplyQRCode_propertySupplyId_fkey"
    FOREIGN KEY ("propertySupplyId") REFERENCES "PropertySupply"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PropertySupplyQRScan" ADD CONSTRAINT "PropertySupplyQRScan_qrCodeId_fkey"
    FOREIGN KEY ("qrCodeId") REFERENCES "PropertySupplyQRCode"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PropertySupplyQRScan" ADD CONSTRAINT "PropertySupplyQRScan_taskId_fkey"
    FOREIGN KEY ("taskId") REFERENCES "Task"("id") ON DELETE SET NULL ON UPDATE CASCADE;

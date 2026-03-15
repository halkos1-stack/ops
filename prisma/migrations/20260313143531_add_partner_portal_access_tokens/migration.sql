-- CreateTable
CREATE TABLE "PartnerPortalAccessToken" (
    "id" TEXT NOT NULL,
    "partnerId" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "expiresAt" TIMESTAMP(3),
    "lastUsedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PartnerPortalAccessToken_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "PartnerPortalAccessToken_token_key" ON "PartnerPortalAccessToken"("token");

-- CreateIndex
CREATE INDEX "PartnerPortalAccessToken_partnerId_idx" ON "PartnerPortalAccessToken"("partnerId");

-- CreateIndex
CREATE INDEX "PartnerPortalAccessToken_token_idx" ON "PartnerPortalAccessToken"("token");

-- CreateIndex
CREATE INDEX "PartnerPortalAccessToken_isActive_idx" ON "PartnerPortalAccessToken"("isActive");

-- CreateIndex
CREATE INDEX "PartnerPortalAccessToken_expiresAt_idx" ON "PartnerPortalAccessToken"("expiresAt");

-- AddForeignKey
ALTER TABLE "PartnerPortalAccessToken" ADD CONSTRAINT "PartnerPortalAccessToken_partnerId_fkey" FOREIGN KEY ("partnerId") REFERENCES "Partner"("id") ON DELETE CASCADE ON UPDATE CASCADE;

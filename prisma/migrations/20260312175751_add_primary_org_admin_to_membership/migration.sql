-- AlterTable
ALTER TABLE "Membership" ADD COLUMN     "isPrimaryOrgAdmin" BOOLEAN NOT NULL DEFAULT false;

-- CreateIndex
CREATE INDEX "Membership_organizationId_isPrimaryOrgAdmin_idx" ON "Membership"("organizationId", "isPrimaryOrgAdmin");

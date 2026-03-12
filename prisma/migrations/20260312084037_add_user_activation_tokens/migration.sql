-- CreateTable
CREATE TABLE "UserActivationToken" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "usedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "UserActivationToken_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "UserActivationToken_token_key" ON "UserActivationToken"("token");

-- CreateIndex
CREATE INDEX "UserActivationToken_userId_idx" ON "UserActivationToken"("userId");

-- CreateIndex
CREATE INDEX "UserActivationToken_token_idx" ON "UserActivationToken"("token");

-- CreateIndex
CREATE INDEX "UserActivationToken_expiresAt_idx" ON "UserActivationToken"("expiresAt");

-- CreateIndex
CREATE INDEX "UserActivationToken_usedAt_idx" ON "UserActivationToken"("usedAt");

-- AddForeignKey
ALTER TABLE "UserActivationToken" ADD CONSTRAINT "UserActivationToken_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

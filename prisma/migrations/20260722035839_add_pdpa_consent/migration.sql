-- CreateTable
CREATE TABLE "PdpaConsent" (
    "id" SERIAL NOT NULL,
    "userId" INTEGER NOT NULL,
    "policyVersion" TEXT NOT NULL,
    "acceptedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "ipAddress" TEXT,

    CONSTRAINT "PdpaConsent_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "PdpaConsent_userId_policyVersion_idx" ON "PdpaConsent"("userId", "policyVersion");

-- AddForeignKey
ALTER TABLE "PdpaConsent" ADD CONSTRAINT "PdpaConsent_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AlterTable
ALTER TABLE "Customer" ADD COLUMN     "mfaEmail" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "emailCodeHash" TEXT,
ADD COLUMN     "emailCodeExpiresAt" TIMESTAMP(3),
ADD COLUMN     "emailCodeSentAt" TIMESTAMP(3),
ADD COLUMN     "emailCodeAttempts" INTEGER NOT NULL DEFAULT 0;

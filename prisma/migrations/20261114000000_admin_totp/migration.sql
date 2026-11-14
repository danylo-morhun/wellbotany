-- Admin two-factor authentication (TOTP)
ALTER TABLE "Customer" ADD COLUMN "totpSecret" TEXT,
ADD COLUMN "totpEnabledAt" TIMESTAMP(3),
ADD COLUMN "totpLastStep" INTEGER;

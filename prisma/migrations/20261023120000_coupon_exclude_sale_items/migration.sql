-- AlterTable
-- Codes already issued keep the terms they were sent with (stack with sales);
-- new codes don't stack by default.
ALTER TABLE "Coupon" ADD COLUMN     "excludeSaleItems" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "Coupon" ALTER COLUMN "excludeSaleItems" SET DEFAULT true;

-- AlterTable
ALTER TABLE "Order" ADD COLUMN     "pickupLocation" TEXT,
ALTER COLUMN "shipStreet" DROP NOT NULL,
ALTER COLUMN "shipCity" DROP NOT NULL,
ALTER COLUMN "shipPostalCode" DROP NOT NULL;

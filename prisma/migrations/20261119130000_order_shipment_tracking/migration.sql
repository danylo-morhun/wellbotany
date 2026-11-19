-- AlterTable
ALTER TABLE "Order" ADD COLUMN     "labelCreatedAt" TIMESTAMP(3),
ADD COLUMN     "shipmentStatus" TEXT,
ADD COLUMN     "shipmentStatusAt" TIMESTAMP(3),
ADD COLUMN     "shipmentAlert" TEXT;

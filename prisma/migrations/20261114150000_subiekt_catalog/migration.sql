-- Subiekt catalog: reference copy of product cards from the shop agent
-- AlterTable
ALTER TABLE "StockLocation" ADD COLUMN     "catalogSyncedAt" TIMESTAMP(3),
ADD COLUMN     "priceLevelNames" TEXT[] DEFAULT ARRAY[]::TEXT[];

-- CreateTable
CREATE TABLE "SubiektProduct" (
    "locationId" TEXT NOT NULL,
    "symbol" TEXT NOT NULL,
    "ean" TEXT,
    "name" TEXT NOT NULL,
    "unit" TEXT,
    "vatRate" DECIMAL(5,2),
    "purchaseNetPln" INTEGER,
    "pricesGrossPln" INTEGER[],
    "weightGrams" INTEGER,
    "supplierSymbol" TEXT,
    "supplierName" TEXT,
    "supplierProductCode" TEXT,
    "minStock" INTEGER,
    "lastDeliveryAt" TIMESTAMP(3),
    "lastDeliveryNetPln" INTEGER,
    "blocked" BOOLEAN NOT NULL DEFAULT false,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SubiektProduct_pkey" PRIMARY KEY ("locationId","symbol")
);

-- CreateIndex
CREATE INDEX "SubiektProduct_ean_idx" ON "SubiektProduct"("ean");

-- AddForeignKey
ALTER TABLE "SubiektProduct" ADD CONSTRAINT "SubiektProduct_locationId_fkey" FOREIGN KEY ("locationId") REFERENCES "StockLocation"("id") ON DELETE CASCADE ON UPDATE CASCADE;


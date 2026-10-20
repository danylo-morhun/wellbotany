-- AlterTable
ALTER TABLE "Order" ADD COLUMN     "subiektEnteredAt" TIMESTAMP(3);

-- CreateTable
CREATE TABLE "StockLocation" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "sellsOnline" BOOLEAN NOT NULL DEFAULT true,
    "safetyStock" INTEGER NOT NULL DEFAULT 1,
    "lastSyncAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "StockLocation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "StockLevel" (
    "locationId" TEXT NOT NULL,
    "variantId" TEXT NOT NULL,
    "quantity" INTEGER NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "StockLevel_pkey" PRIMARY KEY ("locationId","variantId")
);

-- CreateTable
CREATE TABLE "SyncRun" (
    "id" TEXT NOT NULL,
    "locationId" TEXT NOT NULL,
    "mode" TEXT NOT NULL,
    "received" INTEGER NOT NULL,
    "matched" INTEGER NOT NULL,
    "changedLevels" INTEGER NOT NULL,
    "changedVariants" INTEGER NOT NULL,
    "unmatchedSample" JSONB,
    "unmatched" INTEGER NOT NULL,
    "error" TEXT,
    "agentVersion" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SyncRun_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "StockLocation_code_key" ON "StockLocation"("code");

-- CreateIndex
CREATE INDEX "StockLevel_variantId_idx" ON "StockLevel"("variantId");

-- CreateIndex
CREATE INDEX "SyncRun_locationId_createdAt_idx" ON "SyncRun"("locationId", "createdAt");

-- AddForeignKey
ALTER TABLE "StockLevel" ADD CONSTRAINT "StockLevel_locationId_fkey" FOREIGN KEY ("locationId") REFERENCES "StockLocation"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StockLevel" ADD CONSTRAINT "StockLevel_variantId_fkey" FOREIGN KEY ("variantId") REFERENCES "ProductVariant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SyncRun" ADD CONSTRAINT "SyncRun_locationId_fkey" FOREIGN KEY ("locationId") REFERENCES "StockLocation"("id") ON DELETE CASCADE ON UPDATE CASCADE;


-- Orders placed before the sync existed are already in Subiekt (entered by hand).
UPDATE "Order" SET "subiektEnteredAt" = "createdAt";

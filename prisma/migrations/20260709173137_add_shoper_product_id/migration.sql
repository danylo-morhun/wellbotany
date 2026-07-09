-- AlterTable
ALTER TABLE "ProductVariant" ADD COLUMN "shoperProductId" INTEGER;

-- CreateIndex
CREATE UNIQUE INDEX "ProductVariant_shoperProductId_key" ON "ProductVariant"("shoperProductId");

-- CreateEnum
CREATE TYPE "GiftBuilderPricingMode" AS ENUM ('FIXED_BOX', 'SUM_PLUS_FEE');

-- AlterTable
ALTER TABLE "Product" ADD COLUMN     "isGiftEligible" BOOLEAN NOT NULL DEFAULT false;

-- AlterTable
ALTER TABLE "CartItem" ADD COLUMN     "giftSetGroupId" TEXT NOT NULL DEFAULT '',
ADD COLUMN     "giftSetId" TEXT,
ADD COLUMN     "giftSetLabel" TEXT,
ADD COLUMN     "unitPriceOverridePln" INTEGER;

-- AlterTable
ALTER TABLE "OrderItem" ADD COLUMN     "giftSetGroupId" TEXT NOT NULL DEFAULT '',
ADD COLUMN     "giftSetId" TEXT,
ADD COLUMN     "giftSetLabel" TEXT;

-- DropIndex
DROP INDEX "CartItem_cartId_variantId_key";

-- CreateTable
CREATE TABLE "GiftSet" (
    "id" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "status" "ProductStatus" NOT NULL DEFAULT 'DRAFT',
    "namePl" TEXT NOT NULL,
    "nameEn" TEXT,
    "nameUk" TEXT,
    "descriptionPl" TEXT,
    "imageUrl" TEXT,
    "pricePln" INTEGER NOT NULL,
    "comparePricePln" INTEGER,
    "isFeatured" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "GiftSet_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "GiftSetItem" (
    "id" TEXT NOT NULL,
    "giftSetId" TEXT NOT NULL,
    "variantId" TEXT NOT NULL,
    "quantity" INTEGER NOT NULL DEFAULT 1,

    CONSTRAINT "GiftSetItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "GiftBuilderSettings" (
    "id" INTEGER NOT NULL DEFAULT 1,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "namePl" TEXT NOT NULL DEFAULT 'Zestaw prezentowy',
    "pricingMode" "GiftBuilderPricingMode" NOT NULL DEFAULT 'FIXED_BOX',
    "boxPricePln" INTEGER,
    "packagingFeePln" INTEGER NOT NULL DEFAULT 0,
    "minItems" INTEGER NOT NULL DEFAULT 3,
    "maxItems" INTEGER NOT NULL DEFAULT 8,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "GiftBuilderSettings_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "GiftSet_slug_idx" ON "GiftSet"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "GiftSet_slug_key" ON "GiftSet"("slug");

-- CreateIndex
CREATE INDEX "GiftSet_status_idx" ON "GiftSet"("status");

-- CreateIndex
CREATE INDEX "GiftSetItem_giftSetId_idx" ON "GiftSetItem"("giftSetId");

-- CreateIndex
CREATE UNIQUE INDEX "GiftSetItem_giftSetId_variantId_key" ON "GiftSetItem"("giftSetId", "variantId");

-- CreateIndex
CREATE INDEX "CartItem_giftSetGroupId_idx" ON "CartItem"("giftSetGroupId");

-- CreateIndex
CREATE UNIQUE INDEX "CartItem_cartId_variantId_giftSetGroupId_key" ON "CartItem"("cartId", "variantId", "giftSetGroupId");

-- CreateIndex
CREATE INDEX "OrderItem_giftSetGroupId_idx" ON "OrderItem"("giftSetGroupId");

-- AddForeignKey
ALTER TABLE "CartItem" ADD CONSTRAINT "CartItem_giftSetId_fkey" FOREIGN KEY ("giftSetId") REFERENCES "GiftSet"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OrderItem" ADD CONSTRAINT "OrderItem_giftSetId_fkey" FOREIGN KEY ("giftSetId") REFERENCES "GiftSet"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GiftSetItem" ADD CONSTRAINT "GiftSetItem_giftSetId_fkey" FOREIGN KEY ("giftSetId") REFERENCES "GiftSet"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GiftSetItem" ADD CONSTRAINT "GiftSetItem_variantId_fkey" FOREIGN KEY ("variantId") REFERENCES "ProductVariant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

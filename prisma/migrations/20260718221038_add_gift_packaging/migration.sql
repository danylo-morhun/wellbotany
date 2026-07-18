-- AlterTable
ALTER TABLE "GiftBuilderSettings" DROP COLUMN "packagingFeePln";

-- AlterTable
ALTER TABLE "CartItem" ADD COLUMN     "packagingId" TEXT,
ADD COLUMN     "packagingLabel" TEXT,
ADD COLUMN     "giftMessage" TEXT;

-- AlterTable
ALTER TABLE "OrderItem" ADD COLUMN     "packagingId" TEXT,
ADD COLUMN     "packagingLabel" TEXT,
ADD COLUMN     "giftMessage" TEXT;

-- CreateTable
CREATE TABLE "GiftPackaging" (
    "id" TEXT NOT NULL,
    "namePl" TEXT NOT NULL,
    "imageUrl" TEXT,
    "extraPricePln" INTEGER NOT NULL DEFAULT 0,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "GiftPackaging_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "GiftPackaging_isActive_idx" ON "GiftPackaging"("isActive");

-- AddForeignKey
ALTER TABLE "CartItem" ADD CONSTRAINT "CartItem_packagingId_fkey" FOREIGN KEY ("packagingId") REFERENCES "GiftPackaging"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OrderItem" ADD CONSTRAINT "OrderItem_packagingId_fkey" FOREIGN KEY ("packagingId") REFERENCES "GiftPackaging"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AlterTable
ALTER TABLE "ShopSettings" ADD COLUMN     "tierPromoEndsAt" TIMESTAMP(3),
ADD COLUMN     "tierPromoName" TEXT,
ADD COLUMN     "tierPromoStartsAt" TIMESTAMP(3),
ADD COLUMN     "tierPromoTiers" JSONB;

-- AlterTable
ALTER TABLE "Order" ADD COLUMN     "promotionName" TEXT;

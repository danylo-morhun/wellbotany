-- DropIndex
DROP INDEX "Product_baselinkerProductId_key";

-- DropIndex
DROP INDEX "ProductVariant_baselinkerVariantId_key";

-- DropIndex
DROP INDEX "ProductVariant_shoperProductId_key";

-- DropIndex
DROP INDEX "Order_baselinkerOrderId_key";

-- DropIndex
DROP INDEX "Order_baselinkerOrderId_idx";

-- AlterTable
ALTER TABLE "Product" DROP COLUMN "baselinkerProductId";

-- AlterTable
ALTER TABLE "ProductVariant" DROP COLUMN "baselinkerVariantId",
DROP COLUMN "shoperProductId";

-- AlterTable
ALTER TABLE "Order" DROP COLUMN "baselinkerOrderId",
DROP COLUMN "baselinkerStatus";

-- DropTable
DROP TABLE "ShoperSyncState";


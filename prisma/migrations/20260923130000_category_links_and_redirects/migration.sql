-- CreateEnum
CREATE TYPE "CategoryGroup" AS ENUM ('TYPE', 'NEED', 'AUDIENCE', 'OTHER');

-- AlterTable
ALTER TABLE "Category" ADD COLUMN     "group" "CategoryGroup" NOT NULL DEFAULT 'TYPE',
ADD COLUMN     "headingPl" TEXT;

-- CreateTable
CREATE TABLE "ProductCategory" (
    "productId" TEXT NOT NULL,
    "categoryId" TEXT NOT NULL,

    CONSTRAINT "ProductCategory_pkey" PRIMARY KEY ("productId","categoryId")
);

-- CreateTable
CREATE TABLE "Redirect" (
    "fromPath" TEXT NOT NULL,
    "toPath" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Redirect_pkey" PRIMARY KEY ("fromPath")
);

-- CreateIndex
CREATE INDEX "ProductCategory_categoryId_idx" ON "ProductCategory"("categoryId");

-- AddForeignKey
ALTER TABLE "ProductCategory" ADD CONSTRAINT "ProductCategory_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProductCategory" ADD CONSTRAINT "ProductCategory_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "Category"("id") ON DELETE CASCADE ON UPDATE CASCADE;


-- Backfill: every product is listed in its current (primary) category.
INSERT INTO "ProductCategory" ("productId", "categoryId")
SELECT "id", "categoryId" FROM "Product" WHERE "categoryId" IS NOT NULL
ON CONFLICT DO NOTHING;

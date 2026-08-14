-- AlterTable
ALTER TABLE "Brand" ADD COLUMN     "parentBrandId" TEXT;

-- CreateIndex
CREATE INDEX "Brand_parentBrandId_idx" ON "Brand"("parentBrandId");

-- AddForeignKey
ALTER TABLE "Brand" ADD CONSTRAINT "Brand_parentBrandId_fkey" FOREIGN KEY ("parentBrandId") REFERENCES "Brand"("id") ON DELETE SET NULL ON UPDATE CASCADE;

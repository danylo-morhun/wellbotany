-- AlterTable
ALTER TABLE "NewsletterSubscriber" ADD COLUMN "couponId" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "NewsletterSubscriber_couponId_key" ON "NewsletterSubscriber"("couponId");

-- AddForeignKey
ALTER TABLE "NewsletterSubscriber" ADD CONSTRAINT "NewsletterSubscriber_couponId_fkey" FOREIGN KEY ("couponId") REFERENCES "Coupon"("id") ON DELETE SET NULL ON UPDATE CASCADE;

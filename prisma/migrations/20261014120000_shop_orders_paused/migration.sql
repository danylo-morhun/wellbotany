-- AlterTable
ALTER TABLE "ShopSettings" ADD COLUMN     "ordersPaused" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "ordersPausedMessagePl" TEXT;

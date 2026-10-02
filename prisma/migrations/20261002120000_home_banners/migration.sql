-- CreateEnum
CREATE TYPE "BannerTextPosition" AS ENUM ('LEFT', 'RIGHT');

-- CreateEnum
CREATE TYPE "BannerTextTone" AS ENUM ('LIGHT', 'DARK');

-- CreateTable
CREATE TABLE "HomeBanner" (
    "id" TEXT NOT NULL,
    "titlePl" TEXT NOT NULL,
    "subtitlePl" TEXT,
    "ctaLabelPl" TEXT,
    "href" TEXT NOT NULL,
    "imageDesktopUrl" TEXT NOT NULL,
    "imageMobileUrl" TEXT,
    "altPl" TEXT,
    "textPosition" "BannerTextPosition" NOT NULL DEFAULT 'RIGHT',
    "textTone" "BannerTextTone" NOT NULL DEFAULT 'LIGHT',
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "startsAt" TIMESTAMP(3),
    "endsAt" TIMESTAMP(3),
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "HomeBanner_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "HomeBanner_isActive_sortOrder_idx" ON "HomeBanner"("isActive", "sortOrder");


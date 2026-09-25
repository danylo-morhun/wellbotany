-- CreateTable
CREATE TABLE "Ingredient" (
    "id" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "namePl" TEXT NOT NULL,
    "matchTerms" TEXT[],
    "excludeTerms" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "shortPl" TEXT NOT NULL,
    "metaTitlePl" TEXT,
    "metaDescPl" TEXT,
    "contentPl" TEXT NOT NULL,
    "faqPl" JSONB,
    "categorySlug" TEXT,
    "isPublished" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Ingredient_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Ingredient_slug_key" ON "Ingredient"("slug");

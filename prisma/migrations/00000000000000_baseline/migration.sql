-- CreateEnum
CREATE TYPE "TagType" AS ENUM ('DIETARY_CLAIM', 'ALLERGEN_FREE', 'CERTIFICATION', 'OTHER');

-- CreateEnum
CREATE TYPE "ProductStatus" AS ENUM ('DRAFT', 'ACTIVE', 'ARCHIVED');

-- CreateEnum
CREATE TYPE "CustomerType" AS ENUM ('B2C', 'B2B');

-- CreateEnum
CREATE TYPE "OrderStatus" AS ENUM ('PENDING', 'PAYMENT_PENDING', 'PAID', 'PROCESSING', 'SHIPPED', 'DELIVERED', 'CANCELLED', 'REFUNDED');

-- CreateEnum
CREATE TYPE "ReviewStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED');

-- CreateEnum
CREATE TYPE "ShippingMethod" AS ENUM ('INPOST_PACZKOMAT', 'INPOST_KURIER', 'ORLEN_PACZKA', 'DPD_PICKUP', 'DHL_POINT', 'FEDEX_POINT', 'EPAKA_POINT', 'DHL', 'DPD', 'GLS', 'FEDEX', 'POCZTEX', 'POCZTA_POLSKA', 'COURIER', 'PICKUP');

-- CreateEnum
CREATE TYPE "PaymentMethod" AS ENUM ('BLIK', 'PRZELEWY24', 'APPLE_PAY', 'GOOGLE_PAY', 'BANK_TRANSFER', 'CASH_ON_DELIVERY', 'ALLEGRO_PAY');

-- CreateEnum
CREATE TYPE "PaymentStatus" AS ENUM ('PENDING', 'AUTHORIZED', 'CAPTURED', 'FAILED', 'REFUNDED');

-- CreateEnum
CREATE TYPE "CouponType" AS ENUM ('PERCENTAGE', 'FIXED_AMOUNT');

-- CreateEnum
CREATE TYPE "GiftBuilderPricingMode" AS ENUM ('FIXED_BOX', 'SUM_PLUS_FEE');

-- CreateEnum
CREATE TYPE "CategoryGroup" AS ENUM ('TYPE', 'NEED', 'AUDIENCE', 'OTHER');

-- CreateEnum
CREATE TYPE "BannerTextPosition" AS ENUM ('LEFT', 'RIGHT');

-- CreateEnum
CREATE TYPE "BannerTextTone" AS ENUM ('LIGHT', 'DARK');

-- CreateEnum
CREATE TYPE "ExpenseCategory" AS ENUM ('ADS_GOOGLE', 'ADS_META', 'ADS_ALLEGRO', 'ADS_OTHER', 'SHIPPING', 'PACKAGING', 'SERVICES', 'OTHER');

-- CreateTable
CREATE TABLE "Category" (
    "id" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "namePl" TEXT NOT NULL,
    "nameEn" TEXT,
    "nameUk" TEXT,
    "headingPl" TEXT,
    "descriptionPl" TEXT,
    "metaTitlePl" TEXT,
    "metaDescPl" TEXT,
    "contentPl" TEXT,
    "faqPl" JSONB,
    "image" TEXT,
    "icon" TEXT,
    "group" "CategoryGroup" NOT NULL DEFAULT 'TYPE',
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "parentId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Category_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Brand" (
    "id" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "contentPl" TEXT,
    "logo" TEXT,
    "website" TEXT,
    "countryCode" TEXT,
    "manufacturerName" TEXT,
    "manufacturerAddress" TEXT,
    "manufacturerContact" TEXT,
    "euResponsiblePerson" TEXT,
    "parentBrandId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Brand_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Tag" (
    "id" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "namePl" TEXT NOT NULL,
    "nameEn" TEXT,
    "iconUrl" TEXT,
    "type" "TagType" NOT NULL,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "Tag_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Product" (
    "id" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "status" "ProductStatus" NOT NULL DEFAULT 'DRAFT',
    "namePl" TEXT NOT NULL,
    "nameEn" TEXT,
    "nameUk" TEXT,
    "shortDescPl" TEXT,
    "shortDescEn" TEXT,
    "shortDescUk" TEXT,
    "descriptionPl" TEXT,
    "descriptionEn" TEXT,
    "descriptionUk" TEXT,
    "benefitsPl" JSONB,
    "categoryId" TEXT,
    "brandId" TEXT,
    "isFeatured" BOOLEAN NOT NULL DEFAULT false,
    "isNewArrival" BOOLEAN NOT NULL DEFAULT false,
    "isGiftEligible" BOOLEAN NOT NULL DEFAULT true,
    "isInGoogleFeed" BOOLEAN NOT NULL DEFAULT true,
    "netWeight" TEXT,
    "servingSize" TEXT,
    "servingsPerContainer" INTEGER,
    "storageInfo" TEXT,
    "countryOfOrigin" TEXT,
    "usageInstructionsPl" TEXT,
    "ingredients" JSONB,
    "nutritionFacts" JSONB,
    "allergenInfo" JSONB,
    "healthWarnings" JSONB,
    "contraindicationsPl" TEXT,
    "ageRestriction" INTEGER,
    "certifications" JSONB,
    "responsibleEntity" TEXT,
    "metaTitlePl" TEXT,
    "metaTitleEn" TEXT,
    "metaDescPl" TEXT,
    "metaDescEn" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Product_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProductVariant" (
    "id" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "sku" TEXT NOT NULL,
    "ean" TEXT,
    "optionLabel" TEXT,
    "optionValue" TEXT,
    "pricePln" INTEGER NOT NULL,
    "comparePricePln" INTEGER,
    "lowestPrice30dPln" INTEGER,
    "costPricePln" INTEGER,
    "vatRate" DECIMAL(5,2) NOT NULL DEFAULT 5.00,
    "stock" INTEGER NOT NULL DEFAULT 0,
    "lowStockThreshold" INTEGER NOT NULL DEFAULT 5,
    "trackStock" BOOLEAN NOT NULL DEFAULT true,
    "weightGrams" DOUBLE PRECISION,
    "isDefault" BOOLEAN NOT NULL DEFAULT false,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ProductVariant_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PriceHistory" (
    "id" TEXT NOT NULL,
    "variantId" TEXT NOT NULL,
    "pricePln" INTEGER NOT NULL,
    "comparePricePln" INTEGER,
    "validFrom" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PriceHistory_pkey" PRIMARY KEY ("id")
);

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

-- CreateTable
CREATE TABLE "ProductImage" (
    "id" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "variantId" TEXT,
    "url" TEXT NOT NULL,
    "altPl" TEXT,
    "altEn" TEXT,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "isMain" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "ProductImage_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProductTag" (
    "productId" TEXT NOT NULL,
    "tagId" TEXT NOT NULL,

    CONSTRAINT "ProductTag_pkey" PRIMARY KEY ("productId","tagId")
);

-- CreateTable
CREATE TABLE "Customer" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "phone" TEXT,
    "firstName" TEXT,
    "lastName" TEXT,
    "type" "CustomerType" NOT NULL DEFAULT 'B2C',
    "companyName" TEXT,
    "nip" TEXT,
    "passwordHash" TEXT,
    "isAdmin" BOOLEAN NOT NULL DEFAULT false,
    "totpSecret" TEXT,
    "totpEnabledAt" TIMESTAMP(3),
    "totpLastStep" INTEGER,
    "authUserId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Customer_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Address" (
    "id" TEXT NOT NULL,
    "customerId" TEXT NOT NULL,
    "type" TEXT NOT NULL DEFAULT 'shipping',
    "isDefault" BOOLEAN NOT NULL DEFAULT false,
    "firstName" TEXT NOT NULL,
    "lastName" TEXT NOT NULL,
    "company" TEXT,
    "street" TEXT NOT NULL,
    "apartment" TEXT,
    "city" TEXT NOT NULL,
    "postalCode" TEXT NOT NULL,
    "countryCode" TEXT NOT NULL DEFAULT 'PL',
    "phone" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Address_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Cart" (
    "id" TEXT NOT NULL,
    "customerId" TEXT,
    "expiresAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Cart_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CartItem" (
    "id" TEXT NOT NULL,
    "cartId" TEXT NOT NULL,
    "variantId" TEXT NOT NULL,
    "quantity" INTEGER NOT NULL,
    "giftSetGroupId" TEXT NOT NULL DEFAULT '',
    "giftSetId" TEXT,
    "giftSetLabel" TEXT,
    "packagingId" TEXT,
    "packagingLabel" TEXT,
    "giftMessage" TEXT,
    "unitPriceOverridePln" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CartItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Wishlist" (
    "id" TEXT NOT NULL,
    "customerId" TEXT,
    "expiresAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Wishlist_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "WishlistItem" (
    "id" TEXT NOT NULL,
    "wishlistId" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "addedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "WishlistItem_pkey" PRIMARY KEY ("id")
);

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
    "lowestPrice30dPln" INTEGER,
    "isFeatured" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "GiftSet_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "GiftSetPriceHistory" (
    "id" TEXT NOT NULL,
    "giftSetId" TEXT NOT NULL,
    "pricePln" INTEGER NOT NULL,
    "comparePricePln" INTEGER,
    "validFrom" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "GiftSetPriceHistory_pkey" PRIMARY KEY ("id")
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
    "discountPercent" INTEGER NOT NULL DEFAULT 0,
    "minItems" INTEGER NOT NULL DEFAULT 3,
    "maxItems" INTEGER NOT NULL DEFAULT 8,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "GiftBuilderSettings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ShopSettings" (
    "id" INTEGER NOT NULL DEFAULT 1,
    "freeShippingThresholdPln" INTEGER DEFAULT 20000,
    "productMetaSuffixPl" TEXT DEFAULT 'Wysyłka w 24–48 h.',
    "ordersPaused" BOOLEAN NOT NULL DEFAULT false,
    "ordersPausedMessagePl" TEXT,
    "tierPromoName" TEXT,
    "tierPromoTiers" JSONB,
    "tierPromoStartsAt" TIMESTAMP(3),
    "tierPromoEndsAt" TIMESTAMP(3),
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ShopSettings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ShippingRate" (
    "method" "ShippingMethod" NOT NULL,
    "pricePln" INTEGER NOT NULL,
    "enabled" BOOLEAN NOT NULL DEFAULT false,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ShippingRate_pkey" PRIMARY KEY ("method")
);

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

-- CreateTable
CREATE TABLE "Coupon" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "type" "CouponType" NOT NULL,
    "value" INTEGER NOT NULL,
    "minOrderPln" INTEGER,
    "maxUsages" INTEGER,
    "excludeSaleItems" BOOLEAN NOT NULL DEFAULT true,
    "usageCount" INTEGER NOT NULL DEFAULT 0,
    "validFrom" TIMESTAMP(3),
    "validUntil" TIMESTAMP(3),
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Coupon_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Order" (
    "id" TEXT NOT NULL,
    "orderNumber" TEXT NOT NULL,
    "status" "OrderStatus" NOT NULL DEFAULT 'PENDING',
    "customerId" TEXT,
    "customerEmail" TEXT NOT NULL,
    "customerPhone" TEXT,
    "customerName" TEXT NOT NULL,
    "reviewToken" TEXT,
    "reviewRequestedAt" TIMESTAMP(3),
    "shippingMethod" "ShippingMethod" NOT NULL,
    "shippingCostPln" INTEGER NOT NULL,
    "inpostMachineId" TEXT,
    "inpostMachineName" TEXT,
    "pickupLocation" TEXT,
    "shipFirstName" TEXT NOT NULL,
    "shipLastName" TEXT NOT NULL,
    "shipCompany" TEXT,
    "shipStreet" TEXT,
    "shipApartment" TEXT,
    "shipCity" TEXT,
    "shipPostalCode" TEXT,
    "shipCountry" TEXT NOT NULL DEFAULT 'PL',
    "shipPhone" TEXT,
    "wantsFaktura" BOOLEAN NOT NULL DEFAULT false,
    "billCompany" TEXT,
    "billNip" TEXT,
    "billStreet" TEXT,
    "billCity" TEXT,
    "billPostalCode" TEXT,
    "billCountry" TEXT,
    "paymentMethod" "PaymentMethod" NOT NULL,
    "paymentStatus" "PaymentStatus" NOT NULL DEFAULT 'PENDING',
    "paymentRef" TEXT,
    "subtotalPln" INTEGER NOT NULL,
    "discountPln" INTEGER NOT NULL DEFAULT 0,
    "shippingPln" INTEGER NOT NULL,
    "taxPln" INTEGER NOT NULL,
    "totalPln" INTEGER NOT NULL,
    "couponId" TEXT,
    "couponCode" TEXT,
    "promotionName" TEXT,
    "marketingConsent" BOOLEAN NOT NULL DEFAULT false,
    "noteCustomer" TEXT,
    "noteAdmin" TEXT,
    "allegroOrderId" TEXT,
    "trackingNumber" TEXT,
    "trackingUrl" TEXT,
    "epakaOrderId" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "paidAt" TIMESTAMP(3),
    "shippedAt" TIMESTAMP(3),
    "deliveredAt" TIMESTAMP(3),
    "subiektEnteredAt" TIMESTAMP(3),

    CONSTRAINT "Order_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "OrderSequence" (
    "id" INTEGER NOT NULL DEFAULT 1,
    "value" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "OrderSequence_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "OrderItem" (
    "id" TEXT NOT NULL,
    "orderId" TEXT NOT NULL,
    "variantId" TEXT,
    "productName" TEXT NOT NULL,
    "variantOpt" TEXT,
    "sku" TEXT NOT NULL,
    "quantity" INTEGER NOT NULL,
    "unitPricePln" INTEGER NOT NULL,
    "vatRate" DECIMAL(5,2) NOT NULL,
    "totalPln" INTEGER NOT NULL,
    "unitCostPln" INTEGER,
    "giftSetGroupId" TEXT NOT NULL DEFAULT '',
    "giftSetId" TEXT,
    "giftSetLabel" TEXT,
    "packagingId" TEXT,
    "packagingLabel" TEXT,
    "giftMessage" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "OrderItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "NewsletterSubscriber" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "couponId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "NewsletterSubscriber_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ConsentLog" (
    "id" TEXT NOT NULL,
    "consentId" TEXT NOT NULL,
    "analytics" BOOLEAN NOT NULL,
    "marketing" BOOLEAN NOT NULL,
    "version" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ConsentLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ContactMessage" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "subject" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "isRead" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ContactMessage_pkey" PRIMARY KEY ("id")
);

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

-- CreateTable
CREATE TABLE "Review" (
    "id" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "orderId" TEXT NOT NULL,
    "authorName" TEXT NOT NULL,
    "rating" INTEGER NOT NULL,
    "content" TEXT NOT NULL,
    "status" "ReviewStatus" NOT NULL DEFAULT 'PENDING',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Review_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Post" (
    "id" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "titlePl" TEXT NOT NULL,
    "excerptPl" TEXT NOT NULL,
    "metaTitlePl" TEXT,
    "metaDescPl" TEXT,
    "contentPl" TEXT NOT NULL,
    "faqPl" JSONB,
    "coverImage" TEXT,
    "categorySlug" TEXT,
    "reviewedBy" TEXT,
    "isPublished" BOOLEAN NOT NULL DEFAULT false,
    "publishedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Post_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "StockLocation" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "sellsOnline" BOOLEAN NOT NULL DEFAULT true,
    "safetyStock" INTEGER NOT NULL DEFAULT 1,
    "lastSyncAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "StockLocation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "StockLevel" (
    "locationId" TEXT NOT NULL,
    "variantId" TEXT NOT NULL,
    "quantity" INTEGER NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "StockLevel_pkey" PRIMARY KEY ("locationId","variantId")
);

-- CreateTable
CREATE TABLE "SyncRun" (
    "id" TEXT NOT NULL,
    "locationId" TEXT NOT NULL,
    "mode" TEXT NOT NULL,
    "received" INTEGER NOT NULL,
    "matched" INTEGER NOT NULL,
    "changedLevels" INTEGER NOT NULL,
    "changedVariants" INTEGER NOT NULL,
    "unmatchedSample" JSONB,
    "unmatched" INTEGER NOT NULL,
    "error" TEXT,
    "agentVersion" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SyncRun_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Withdrawal" (
    "id" TEXT NOT NULL,
    "orderId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "items" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Withdrawal_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Expense" (
    "id" TEXT NOT NULL,
    "category" "ExpenseCategory" NOT NULL,
    "amountPln" INTEGER NOT NULL,
    "date" DATE NOT NULL,
    "note" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Expense_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Category_slug_key" ON "Category"("slug");

-- CreateIndex
CREATE INDEX "Category_parentId_idx" ON "Category"("parentId");

-- CreateIndex
CREATE INDEX "Category_slug_idx" ON "Category"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "Brand_slug_key" ON "Brand"("slug");

-- CreateIndex
CREATE INDEX "Brand_slug_idx" ON "Brand"("slug");

-- CreateIndex
CREATE INDEX "Brand_parentBrandId_idx" ON "Brand"("parentBrandId");

-- CreateIndex
CREATE UNIQUE INDEX "Tag_slug_key" ON "Tag"("slug");

-- CreateIndex
CREATE INDEX "Tag_type_idx" ON "Tag"("type");

-- CreateIndex
CREATE UNIQUE INDEX "Product_slug_key" ON "Product"("slug");

-- CreateIndex
CREATE INDEX "Product_slug_idx" ON "Product"("slug");

-- CreateIndex
CREATE INDEX "Product_status_idx" ON "Product"("status");

-- CreateIndex
CREATE INDEX "Product_categoryId_idx" ON "Product"("categoryId");

-- CreateIndex
CREATE INDEX "Product_brandId_idx" ON "Product"("brandId");

-- CreateIndex
CREATE INDEX "Product_isFeatured_idx" ON "Product"("isFeatured");

-- CreateIndex
CREATE UNIQUE INDEX "ProductVariant_sku_key" ON "ProductVariant"("sku");

-- CreateIndex
CREATE UNIQUE INDEX "ProductVariant_ean_key" ON "ProductVariant"("ean");

-- CreateIndex
CREATE INDEX "ProductVariant_productId_idx" ON "ProductVariant"("productId");

-- CreateIndex
CREATE INDEX "ProductVariant_sku_idx" ON "ProductVariant"("sku");

-- CreateIndex
CREATE INDEX "ProductVariant_isActive_idx" ON "ProductVariant"("isActive");

-- CreateIndex
CREATE INDEX "PriceHistory_variantId_validFrom_idx" ON "PriceHistory"("variantId", "validFrom");

-- CreateIndex
CREATE INDEX "ProductCategory_categoryId_idx" ON "ProductCategory"("categoryId");

-- CreateIndex
CREATE INDEX "ProductImage_productId_sortOrder_idx" ON "ProductImage"("productId", "sortOrder");

-- CreateIndex
CREATE INDEX "ProductTag_tagId_idx" ON "ProductTag"("tagId");

-- CreateIndex
CREATE UNIQUE INDEX "Customer_email_key" ON "Customer"("email");

-- CreateIndex
CREATE UNIQUE INDEX "Customer_authUserId_key" ON "Customer"("authUserId");

-- CreateIndex
CREATE INDEX "Customer_email_idx" ON "Customer"("email");

-- CreateIndex
CREATE INDEX "Customer_authUserId_idx" ON "Customer"("authUserId");

-- CreateIndex
CREATE INDEX "Address_customerId_idx" ON "Address"("customerId");

-- CreateIndex
CREATE UNIQUE INDEX "Cart_customerId_key" ON "Cart"("customerId");

-- CreateIndex
CREATE INDEX "CartItem_cartId_idx" ON "CartItem"("cartId");

-- CreateIndex
CREATE INDEX "CartItem_giftSetGroupId_idx" ON "CartItem"("giftSetGroupId");

-- CreateIndex
CREATE UNIQUE INDEX "CartItem_cartId_variantId_giftSetGroupId_key" ON "CartItem"("cartId", "variantId", "giftSetGroupId");

-- CreateIndex
CREATE UNIQUE INDEX "Wishlist_customerId_key" ON "Wishlist"("customerId");

-- CreateIndex
CREATE INDEX "WishlistItem_wishlistId_idx" ON "WishlistItem"("wishlistId");

-- CreateIndex
CREATE UNIQUE INDEX "WishlistItem_wishlistId_productId_key" ON "WishlistItem"("wishlistId", "productId");

-- CreateIndex
CREATE UNIQUE INDEX "GiftSet_slug_key" ON "GiftSet"("slug");

-- CreateIndex
CREATE INDEX "GiftSet_slug_idx" ON "GiftSet"("slug");

-- CreateIndex
CREATE INDEX "GiftSet_status_idx" ON "GiftSet"("status");

-- CreateIndex
CREATE INDEX "GiftSetPriceHistory_giftSetId_validFrom_idx" ON "GiftSetPriceHistory"("giftSetId", "validFrom");

-- CreateIndex
CREATE INDEX "GiftSetItem_giftSetId_idx" ON "GiftSetItem"("giftSetId");

-- CreateIndex
CREATE UNIQUE INDEX "GiftSetItem_giftSetId_variantId_key" ON "GiftSetItem"("giftSetId", "variantId");

-- CreateIndex
CREATE INDEX "HomeBanner_isActive_sortOrder_idx" ON "HomeBanner"("isActive", "sortOrder");

-- CreateIndex
CREATE INDEX "GiftPackaging_isActive_idx" ON "GiftPackaging"("isActive");

-- CreateIndex
CREATE UNIQUE INDEX "Coupon_code_key" ON "Coupon"("code");

-- CreateIndex
CREATE INDEX "Coupon_code_idx" ON "Coupon"("code");

-- CreateIndex
CREATE INDEX "Coupon_isActive_validUntil_idx" ON "Coupon"("isActive", "validUntil");

-- CreateIndex
CREATE UNIQUE INDEX "Order_orderNumber_key" ON "Order"("orderNumber");

-- CreateIndex
CREATE UNIQUE INDEX "Order_reviewToken_key" ON "Order"("reviewToken");

-- CreateIndex
CREATE UNIQUE INDEX "Order_allegroOrderId_key" ON "Order"("allegroOrderId");

-- CreateIndex
CREATE INDEX "Order_orderNumber_idx" ON "Order"("orderNumber");

-- CreateIndex
CREATE INDEX "Order_customerId_idx" ON "Order"("customerId");

-- CreateIndex
CREATE INDEX "Order_status_idx" ON "Order"("status");

-- CreateIndex
CREATE INDEX "Order_paymentStatus_idx" ON "Order"("paymentStatus");

-- CreateIndex
CREATE INDEX "Order_createdAt_idx" ON "Order"("createdAt");

-- CreateIndex
CREATE INDEX "Order_allegroOrderId_idx" ON "Order"("allegroOrderId");

-- CreateIndex
CREATE INDEX "OrderItem_orderId_idx" ON "OrderItem"("orderId");

-- CreateIndex
CREATE INDEX "OrderItem_variantId_idx" ON "OrderItem"("variantId");

-- CreateIndex
CREATE INDEX "OrderItem_giftSetGroupId_idx" ON "OrderItem"("giftSetGroupId");

-- CreateIndex
CREATE UNIQUE INDEX "NewsletterSubscriber_email_key" ON "NewsletterSubscriber"("email");

-- CreateIndex
CREATE UNIQUE INDEX "NewsletterSubscriber_couponId_key" ON "NewsletterSubscriber"("couponId");

-- CreateIndex
CREATE INDEX "ConsentLog_consentId_idx" ON "ConsentLog"("consentId");

-- CreateIndex
CREATE INDEX "ContactMessage_createdAt_idx" ON "ContactMessage"("createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "Ingredient_slug_key" ON "Ingredient"("slug");

-- CreateIndex
CREATE INDEX "Review_productId_status_idx" ON "Review"("productId", "status");

-- CreateIndex
CREATE INDEX "Review_status_createdAt_idx" ON "Review"("status", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "Review_orderId_productId_key" ON "Review"("orderId", "productId");

-- CreateIndex
CREATE UNIQUE INDEX "Post_slug_key" ON "Post"("slug");

-- CreateIndex
CREATE INDEX "Post_isPublished_publishedAt_idx" ON "Post"("isPublished", "publishedAt");

-- CreateIndex
CREATE UNIQUE INDEX "StockLocation_code_key" ON "StockLocation"("code");

-- CreateIndex
CREATE INDEX "StockLevel_variantId_idx" ON "StockLevel"("variantId");

-- CreateIndex
CREATE INDEX "SyncRun_locationId_createdAt_idx" ON "SyncRun"("locationId", "createdAt");

-- CreateIndex
CREATE INDEX "Withdrawal_orderId_idx" ON "Withdrawal"("orderId");

-- CreateIndex
CREATE INDEX "Withdrawal_createdAt_idx" ON "Withdrawal"("createdAt");

-- CreateIndex
CREATE INDEX "Expense_date_idx" ON "Expense"("date");

-- AddForeignKey
ALTER TABLE "Category" ADD CONSTRAINT "Category_parentId_fkey" FOREIGN KEY ("parentId") REFERENCES "Category"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Brand" ADD CONSTRAINT "Brand_parentBrandId_fkey" FOREIGN KEY ("parentBrandId") REFERENCES "Brand"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Product" ADD CONSTRAINT "Product_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "Category"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Product" ADD CONSTRAINT "Product_brandId_fkey" FOREIGN KEY ("brandId") REFERENCES "Brand"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProductVariant" ADD CONSTRAINT "ProductVariant_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PriceHistory" ADD CONSTRAINT "PriceHistory_variantId_fkey" FOREIGN KEY ("variantId") REFERENCES "ProductVariant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProductCategory" ADD CONSTRAINT "ProductCategory_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProductCategory" ADD CONSTRAINT "ProductCategory_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "Category"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProductImage" ADD CONSTRAINT "ProductImage_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProductImage" ADD CONSTRAINT "ProductImage_variantId_fkey" FOREIGN KEY ("variantId") REFERENCES "ProductVariant"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProductTag" ADD CONSTRAINT "ProductTag_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProductTag" ADD CONSTRAINT "ProductTag_tagId_fkey" FOREIGN KEY ("tagId") REFERENCES "Tag"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Address" ADD CONSTRAINT "Address_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "Customer"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Cart" ADD CONSTRAINT "Cart_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "Customer"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CartItem" ADD CONSTRAINT "CartItem_cartId_fkey" FOREIGN KEY ("cartId") REFERENCES "Cart"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CartItem" ADD CONSTRAINT "CartItem_variantId_fkey" FOREIGN KEY ("variantId") REFERENCES "ProductVariant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CartItem" ADD CONSTRAINT "CartItem_giftSetId_fkey" FOREIGN KEY ("giftSetId") REFERENCES "GiftSet"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CartItem" ADD CONSTRAINT "CartItem_packagingId_fkey" FOREIGN KEY ("packagingId") REFERENCES "GiftPackaging"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Wishlist" ADD CONSTRAINT "Wishlist_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "Customer"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WishlistItem" ADD CONSTRAINT "WishlistItem_wishlistId_fkey" FOREIGN KEY ("wishlistId") REFERENCES "Wishlist"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WishlistItem" ADD CONSTRAINT "WishlistItem_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GiftSetPriceHistory" ADD CONSTRAINT "GiftSetPriceHistory_giftSetId_fkey" FOREIGN KEY ("giftSetId") REFERENCES "GiftSet"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GiftSetItem" ADD CONSTRAINT "GiftSetItem_giftSetId_fkey" FOREIGN KEY ("giftSetId") REFERENCES "GiftSet"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GiftSetItem" ADD CONSTRAINT "GiftSetItem_variantId_fkey" FOREIGN KEY ("variantId") REFERENCES "ProductVariant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Order" ADD CONSTRAINT "Order_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "Customer"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Order" ADD CONSTRAINT "Order_couponId_fkey" FOREIGN KEY ("couponId") REFERENCES "Coupon"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OrderItem" ADD CONSTRAINT "OrderItem_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "Order"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OrderItem" ADD CONSTRAINT "OrderItem_variantId_fkey" FOREIGN KEY ("variantId") REFERENCES "ProductVariant"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OrderItem" ADD CONSTRAINT "OrderItem_giftSetId_fkey" FOREIGN KEY ("giftSetId") REFERENCES "GiftSet"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OrderItem" ADD CONSTRAINT "OrderItem_packagingId_fkey" FOREIGN KEY ("packagingId") REFERENCES "GiftPackaging"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "NewsletterSubscriber" ADD CONSTRAINT "NewsletterSubscriber_couponId_fkey" FOREIGN KEY ("couponId") REFERENCES "Coupon"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Review" ADD CONSTRAINT "Review_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Review" ADD CONSTRAINT "Review_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "Order"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StockLevel" ADD CONSTRAINT "StockLevel_locationId_fkey" FOREIGN KEY ("locationId") REFERENCES "StockLocation"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StockLevel" ADD CONSTRAINT "StockLevel_variantId_fkey" FOREIGN KEY ("variantId") REFERENCES "ProductVariant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SyncRun" ADD CONSTRAINT "SyncRun_locationId_fkey" FOREIGN KEY ("locationId") REFERENCES "StockLocation"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Withdrawal" ADD CONSTRAINT "Withdrawal_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "Order"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Price history (Omnibus lowest-30-day price): triggers record every price change

CREATE FUNCTION record_gift_set_price() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
DECLARE
  lowest INTEGER;
BEGIN
  IF TG_OP = 'UPDATE'
     AND NEW."pricePln" IS NOT DISTINCT FROM OLD."pricePln"
     AND NEW."comparePricePln" IS NOT DISTINCT FROM OLD."comparePricePln" THEN
    RETURN NEW;
  END IF;

  IF TG_OP = 'UPDATE' AND (
       NEW."pricePln" < OLD."pricePln"
       OR (NEW."comparePricePln" IS NOT NULL AND OLD."comparePricePln" IS NULL)
     ) THEN
    SELECT MIN(p) INTO lowest FROM (
      SELECT "pricePln" AS p FROM "GiftSetPriceHistory"
      WHERE "giftSetId" = NEW.id AND "validFrom" >= CURRENT_TIMESTAMP - INTERVAL '30 days'
      UNION ALL
      (SELECT "pricePln" FROM "GiftSetPriceHistory"
       WHERE "giftSetId" = NEW.id AND "validFrom" < CURRENT_TIMESTAMP - INTERVAL '30 days'
       ORDER BY "validFrom" DESC LIMIT 1)
    ) AS window_prices;
    NEW."lowestPrice30dPln" := COALESCE(lowest, OLD."pricePln");
  ELSIF NEW."comparePricePln" IS NULL THEN
    NEW."lowestPrice30dPln" := NULL;
  END IF;

  INSERT INTO "GiftSetPriceHistory" ("id", "giftSetId", "pricePln", "comparePricePln", "validFrom")
  VALUES (gen_random_uuid()::text, NEW.id, NEW."pricePln", NEW."comparePricePln", CURRENT_TIMESTAMP);
  RETURN NEW;
END;
$$;

CREATE FUNCTION record_new_gift_set_price() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
  INSERT INTO "GiftSetPriceHistory" ("id", "giftSetId", "pricePln", "comparePricePln", "validFrom")
  VALUES (gen_random_uuid()::text, NEW.id, NEW."pricePln", NEW."comparePricePln", CURRENT_TIMESTAMP);
  RETURN NULL;
END;
$$;

CREATE FUNCTION record_new_variant_price() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
  INSERT INTO "PriceHistory" ("id", "variantId", "pricePln", "comparePricePln", "validFrom")
  VALUES (gen_random_uuid()::text, NEW.id, NEW."pricePln", NEW."comparePricePln", CURRENT_TIMESTAMP);
  RETURN NULL;
END;
$$;

CREATE FUNCTION record_variant_price() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
DECLARE
  lowest INTEGER;
BEGIN
  IF TG_OP = 'UPDATE'
     AND NEW."pricePln" IS NOT DISTINCT FROM OLD."pricePln"
     AND NEW."comparePricePln" IS NOT DISTINCT FROM OLD."comparePricePln" THEN
    RETURN NEW;
  END IF;

  IF TG_OP = 'UPDATE' AND (
       NEW."pricePln" < OLD."pricePln"
       OR (NEW."comparePricePln" IS NOT NULL AND OLD."comparePricePln" IS NULL)
     ) THEN
    -- A reduction starts now: every price in effect during the last 30 days,
    -- including the one already in effect when the window opened
    SELECT MIN(p) INTO lowest FROM (
      SELECT "pricePln" AS p FROM "PriceHistory"
      WHERE "variantId" = NEW.id AND "validFrom" >= CURRENT_TIMESTAMP - INTERVAL '30 days'
      UNION ALL
      (SELECT "pricePln" FROM "PriceHistory"
       WHERE "variantId" = NEW.id AND "validFrom" < CURRENT_TIMESTAMP - INTERVAL '30 days'
       ORDER BY "validFrom" DESC LIMIT 1)
    ) AS window_prices;
    NEW."lowestPrice30dPln" := COALESCE(lowest, OLD."pricePln");
  ELSIF NEW."comparePricePln" IS NULL THEN
    -- Promotion over
    NEW."lowestPrice30dPln" := NULL;
  END IF;

  INSERT INTO "PriceHistory" ("id", "variantId", "pricePln", "comparePricePln", "validFrom")
  VALUES (gen_random_uuid()::text, NEW.id, NEW."pricePln", NEW."comparePricePln", CURRENT_TIMESTAMP);
  RETURN NEW;
END;
$$;

CREATE TRIGGER gift_set_price_insert AFTER INSERT ON "GiftSet" FOR EACH ROW EXECUTE FUNCTION record_new_gift_set_price();
CREATE TRIGGER gift_set_price_update BEFORE UPDATE OF "pricePln", "comparePricePln" ON "GiftSet" FOR EACH ROW EXECUTE FUNCTION record_gift_set_price();
CREATE TRIGGER variant_price_insert AFTER INSERT ON "ProductVariant" FOR EACH ROW EXECUTE FUNCTION record_new_variant_price();
CREATE TRIGGER variant_price_update BEFORE UPDATE OF "pricePln", "comparePricePln" ON "ProductVariant" FOR EACH ROW EXECUTE FUNCTION record_variant_price();

-- CI baseline: production schema + the _prisma_migrations history, no data.
-- The migration history can't build the DB from scratch (some early tables
-- were created with `prisma db push`), so CI restores this first and then runs
-- `prisma migrate deploy`, which applies only migrations newer than this
-- snapshot — the same thing prod does. Regenerate after squashing history:
--   ssh wb-vps 'sudo -u postgres pg_dump --schema-only --no-owner --no-acl \
--     --exclude-extension=pg_stat_statements --exclude-schema=neon_auth wellbotany;
--     sudo -u postgres pg_dump --data-only --no-owner --no-acl -t _prisma_migrations wellbotany'
--
-- PostgreSQL database dump
--


-- Dumped from database version 18.7 (Ubuntu 18.7-1.pgdg24.04+2)
-- Dumped by pg_dump version 18.7 (Ubuntu 18.7-1.pgdg24.04+2)

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET transaction_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;

--
-- Name: BannerTextPosition; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public."BannerTextPosition" AS ENUM (
    'LEFT',
    'RIGHT'
);


--
-- Name: BannerTextTone; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public."BannerTextTone" AS ENUM (
    'LIGHT',
    'DARK'
);


--
-- Name: CategoryGroup; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public."CategoryGroup" AS ENUM (
    'TYPE',
    'NEED',
    'AUDIENCE',
    'OTHER'
);


--
-- Name: CouponType; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public."CouponType" AS ENUM (
    'PERCENTAGE',
    'FIXED_AMOUNT'
);


--
-- Name: CustomerType; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public."CustomerType" AS ENUM (
    'B2C',
    'B2B'
);


--
-- Name: ExpenseCategory; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public."ExpenseCategory" AS ENUM (
    'ADS_GOOGLE',
    'ADS_META',
    'ADS_ALLEGRO',
    'ADS_OTHER',
    'SHIPPING',
    'PACKAGING',
    'SERVICES',
    'OTHER'
);


--
-- Name: GiftBuilderPricingMode; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public."GiftBuilderPricingMode" AS ENUM (
    'FIXED_BOX',
    'SUM_PLUS_FEE'
);


--
-- Name: OrderStatus; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public."OrderStatus" AS ENUM (
    'PENDING',
    'PAYMENT_PENDING',
    'PAID',
    'PROCESSING',
    'SHIPPED',
    'DELIVERED',
    'CANCELLED',
    'REFUNDED'
);


--
-- Name: PaymentMethod; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public."PaymentMethod" AS ENUM (
    'BLIK',
    'PRZELEWY24',
    'APPLE_PAY',
    'GOOGLE_PAY',
    'BANK_TRANSFER',
    'CASH_ON_DELIVERY',
    'ALLEGRO_PAY'
);


--
-- Name: PaymentStatus; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public."PaymentStatus" AS ENUM (
    'PENDING',
    'AUTHORIZED',
    'CAPTURED',
    'FAILED',
    'REFUNDED'
);


--
-- Name: ProductStatus; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public."ProductStatus" AS ENUM (
    'DRAFT',
    'ACTIVE',
    'ARCHIVED'
);


--
-- Name: ReviewStatus; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public."ReviewStatus" AS ENUM (
    'PENDING',
    'APPROVED',
    'REJECTED'
);


--
-- Name: ShippingMethod; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public."ShippingMethod" AS ENUM (
    'INPOST_PACZKOMAT',
    'DHL',
    'DPD',
    'COURIER',
    'PICKUP',
    'INPOST_KURIER',
    'ORLEN_PACZKA',
    'DPD_PICKUP',
    'DHL_POINT',
    'FEDEX_POINT',
    'EPAKA_POINT',
    'GLS',
    'FEDEX',
    'POCZTEX',
    'POCZTA_POLSKA'
);


--
-- Name: TagType; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public."TagType" AS ENUM (
    'DIETARY_CLAIM',
    'ALLERGEN_FREE',
    'CERTIFICATION',
    'OTHER'
);


--
-- Name: record_gift_set_price(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.record_gift_set_price() RETURNS trigger
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


--
-- Name: record_new_gift_set_price(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.record_new_gift_set_price() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
  INSERT INTO "GiftSetPriceHistory" ("id", "giftSetId", "pricePln", "comparePricePln", "validFrom")
  VALUES (gen_random_uuid()::text, NEW.id, NEW."pricePln", NEW."comparePricePln", CURRENT_TIMESTAMP);
  RETURN NULL;
END;
$$;


--
-- Name: record_new_variant_price(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.record_new_variant_price() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
  INSERT INTO "PriceHistory" ("id", "variantId", "pricePln", "comparePricePln", "validFrom")
  VALUES (gen_random_uuid()::text, NEW.id, NEW."pricePln", NEW."comparePricePln", CURRENT_TIMESTAMP);
  RETURN NULL;
END;
$$;


--
-- Name: record_variant_price(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.record_variant_price() RETURNS trigger
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


SET default_tablespace = '';

SET default_table_access_method = heap;

--
-- Name: Address; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."Address" (
    id text NOT NULL,
    "customerId" text NOT NULL,
    type text DEFAULT 'shipping'::text NOT NULL,
    "isDefault" boolean DEFAULT false NOT NULL,
    "firstName" text NOT NULL,
    "lastName" text NOT NULL,
    company text,
    street text NOT NULL,
    apartment text,
    city text NOT NULL,
    "postalCode" text NOT NULL,
    "countryCode" text DEFAULT 'PL'::text NOT NULL,
    phone text,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);


--
-- Name: Brand; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."Brand" (
    id text NOT NULL,
    slug text NOT NULL,
    name text NOT NULL,
    description text,
    logo text,
    website text,
    "countryCode" text,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL,
    "parentBrandId" text,
    "contentPl" text,
    "euResponsiblePerson" text,
    "manufacturerAddress" text,
    "manufacturerContact" text,
    "manufacturerName" text
);


--
-- Name: Cart; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."Cart" (
    id text NOT NULL,
    "customerId" text,
    "expiresAt" timestamp(3) without time zone,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);


--
-- Name: CartItem; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."CartItem" (
    id text NOT NULL,
    "cartId" text NOT NULL,
    "variantId" text NOT NULL,
    quantity integer NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL,
    "giftSetGroupId" text DEFAULT ''::text NOT NULL,
    "giftSetId" text,
    "giftSetLabel" text,
    "unitPriceOverridePln" integer,
    "giftMessage" text,
    "packagingId" text,
    "packagingLabel" text
);


--
-- Name: Category; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."Category" (
    id text NOT NULL,
    slug text NOT NULL,
    "namePl" text NOT NULL,
    "nameEn" text,
    "nameUk" text,
    "descriptionPl" text,
    image text,
    "sortOrder" integer DEFAULT 0 NOT NULL,
    "parentId" text,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL,
    icon text,
    "group" public."CategoryGroup" DEFAULT 'TYPE'::public."CategoryGroup" NOT NULL,
    "headingPl" text,
    "contentPl" text,
    "faqPl" jsonb,
    "metaDescPl" text,
    "metaTitlePl" text
);


--
-- Name: ConsentLog; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."ConsentLog" (
    id text NOT NULL,
    "consentId" text NOT NULL,
    analytics boolean NOT NULL,
    marketing boolean NOT NULL,
    version integer NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


--
-- Name: ContactMessage; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."ContactMessage" (
    id text NOT NULL,
    name text NOT NULL,
    email text NOT NULL,
    subject text NOT NULL,
    message text NOT NULL,
    "isRead" boolean DEFAULT false NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


--
-- Name: Coupon; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."Coupon" (
    id text NOT NULL,
    code text NOT NULL,
    type public."CouponType" NOT NULL,
    value integer NOT NULL,
    "minOrderPln" integer,
    "maxUsages" integer,
    "usageCount" integer DEFAULT 0 NOT NULL,
    "validFrom" timestamp(3) without time zone,
    "validUntil" timestamp(3) without time zone,
    "isActive" boolean DEFAULT true NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL,
    "excludeSaleItems" boolean DEFAULT true NOT NULL
);


--
-- Name: Customer; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."Customer" (
    id text NOT NULL,
    email text NOT NULL,
    phone text,
    "firstName" text,
    "lastName" text,
    type public."CustomerType" DEFAULT 'B2C'::public."CustomerType" NOT NULL,
    "companyName" text,
    nip text,
    "authUserId" text,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL,
    "passwordHash" text,
    "isAdmin" boolean DEFAULT false NOT NULL
);


--
-- Name: Expense; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."Expense" (
    id text NOT NULL,
    category public."ExpenseCategory" NOT NULL,
    "amountPln" integer NOT NULL,
    date date NOT NULL,
    note text,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


--
-- Name: GiftBuilderSettings; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."GiftBuilderSettings" (
    id integer DEFAULT 1 NOT NULL,
    "isActive" boolean DEFAULT true NOT NULL,
    "namePl" text DEFAULT 'Zestaw prezentowy'::text NOT NULL,
    "pricingMode" public."GiftBuilderPricingMode" DEFAULT 'FIXED_BOX'::public."GiftBuilderPricingMode" NOT NULL,
    "boxPricePln" integer,
    "minItems" integer DEFAULT 3 NOT NULL,
    "maxItems" integer DEFAULT 8 NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL,
    "discountPercent" integer DEFAULT 0 NOT NULL
);


--
-- Name: GiftPackaging; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."GiftPackaging" (
    id text NOT NULL,
    "namePl" text NOT NULL,
    "imageUrl" text,
    "extraPricePln" integer DEFAULT 0 NOT NULL,
    "isActive" boolean DEFAULT true NOT NULL,
    "sortOrder" integer DEFAULT 0 NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);


--
-- Name: GiftSet; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."GiftSet" (
    id text NOT NULL,
    slug text NOT NULL,
    status public."ProductStatus" DEFAULT 'DRAFT'::public."ProductStatus" NOT NULL,
    "namePl" text NOT NULL,
    "nameEn" text,
    "nameUk" text,
    "descriptionPl" text,
    "imageUrl" text,
    "pricePln" integer NOT NULL,
    "comparePricePln" integer,
    "isFeatured" boolean DEFAULT false NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL,
    "lowestPrice30dPln" integer
);


--
-- Name: GiftSetItem; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."GiftSetItem" (
    id text NOT NULL,
    "giftSetId" text NOT NULL,
    "variantId" text NOT NULL,
    quantity integer DEFAULT 1 NOT NULL
);


--
-- Name: GiftSetPriceHistory; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."GiftSetPriceHistory" (
    id text NOT NULL,
    "giftSetId" text NOT NULL,
    "pricePln" integer NOT NULL,
    "comparePricePln" integer,
    "validFrom" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


--
-- Name: HomeBanner; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."HomeBanner" (
    id text NOT NULL,
    "titlePl" text NOT NULL,
    "subtitlePl" text,
    "ctaLabelPl" text,
    href text NOT NULL,
    "imageDesktopUrl" text NOT NULL,
    "imageMobileUrl" text,
    "altPl" text,
    "textPosition" public."BannerTextPosition" DEFAULT 'RIGHT'::public."BannerTextPosition" NOT NULL,
    "textTone" public."BannerTextTone" DEFAULT 'LIGHT'::public."BannerTextTone" NOT NULL,
    "isActive" boolean DEFAULT true NOT NULL,
    "startsAt" timestamp(3) without time zone,
    "endsAt" timestamp(3) without time zone,
    "sortOrder" integer DEFAULT 0 NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);


--
-- Name: Ingredient; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."Ingredient" (
    id text NOT NULL,
    slug text NOT NULL,
    "namePl" text NOT NULL,
    "matchTerms" text[],
    "excludeTerms" text[] DEFAULT ARRAY[]::text[],
    "shortPl" text NOT NULL,
    "metaTitlePl" text,
    "metaDescPl" text,
    "contentPl" text NOT NULL,
    "faqPl" jsonb,
    "categorySlug" text,
    "isPublished" boolean DEFAULT true NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);


--
-- Name: NewsletterSubscriber; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."NewsletterSubscriber" (
    id text NOT NULL,
    email text NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "couponId" text
);


--
-- Name: Order; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."Order" (
    id text NOT NULL,
    "orderNumber" text NOT NULL,
    status public."OrderStatus" DEFAULT 'PENDING'::public."OrderStatus" NOT NULL,
    "customerId" text,
    "customerEmail" text NOT NULL,
    "customerPhone" text,
    "customerName" text NOT NULL,
    "shippingMethod" public."ShippingMethod" NOT NULL,
    "shippingCostPln" integer NOT NULL,
    "inpostMachineId" text,
    "inpostMachineName" text,
    "shipFirstName" text NOT NULL,
    "shipLastName" text NOT NULL,
    "shipCompany" text,
    "shipStreet" text,
    "shipApartment" text,
    "shipCity" text,
    "shipPostalCode" text,
    "shipCountry" text DEFAULT 'PL'::text NOT NULL,
    "shipPhone" text,
    "wantsFaktura" boolean DEFAULT false NOT NULL,
    "billCompany" text,
    "billNip" text,
    "billStreet" text,
    "billCity" text,
    "billPostalCode" text,
    "billCountry" text,
    "paymentMethod" public."PaymentMethod" NOT NULL,
    "paymentStatus" public."PaymentStatus" DEFAULT 'PENDING'::public."PaymentStatus" NOT NULL,
    "paymentRef" text,
    "subtotalPln" integer NOT NULL,
    "discountPln" integer DEFAULT 0 NOT NULL,
    "shippingPln" integer NOT NULL,
    "taxPln" integer NOT NULL,
    "totalPln" integer NOT NULL,
    "couponId" text,
    "couponCode" text,
    "noteCustomer" text,
    "noteAdmin" text,
    "allegroOrderId" text,
    "trackingNumber" text,
    "trackingUrl" text,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL,
    "paidAt" timestamp(3) without time zone,
    "shippedAt" timestamp(3) without time zone,
    "deliveredAt" timestamp(3) without time zone,
    "pickupLocation" text,
    "reviewRequestedAt" timestamp(3) without time zone,
    "reviewToken" text,
    "epakaOrderId" integer,
    "subiektEnteredAt" timestamp(3) without time zone,
    "marketingConsent" boolean DEFAULT false NOT NULL,
    "promotionName" text
);


--
-- Name: OrderItem; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."OrderItem" (
    id text NOT NULL,
    "orderId" text NOT NULL,
    "variantId" text,
    "productName" text NOT NULL,
    "variantOpt" text,
    sku text NOT NULL,
    quantity integer NOT NULL,
    "unitPricePln" integer NOT NULL,
    "vatRate" numeric(5,2) NOT NULL,
    "totalPln" integer NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "giftSetGroupId" text DEFAULT ''::text NOT NULL,
    "giftSetId" text,
    "giftSetLabel" text,
    "giftMessage" text,
    "packagingId" text,
    "packagingLabel" text,
    "unitCostPln" integer
);


--
-- Name: OrderSequence; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."OrderSequence" (
    id integer DEFAULT 1 NOT NULL,
    value integer DEFAULT 0 NOT NULL
);


--
-- Name: Post; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."Post" (
    id text NOT NULL,
    slug text NOT NULL,
    "titlePl" text NOT NULL,
    "excerptPl" text NOT NULL,
    "metaTitlePl" text,
    "metaDescPl" text,
    "contentPl" text NOT NULL,
    "faqPl" jsonb,
    "coverImage" text,
    "categorySlug" text,
    "reviewedBy" text,
    "isPublished" boolean DEFAULT false NOT NULL,
    "publishedAt" timestamp(3) without time zone,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);


--
-- Name: PriceHistory; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."PriceHistory" (
    id text NOT NULL,
    "variantId" text NOT NULL,
    "pricePln" integer NOT NULL,
    "comparePricePln" integer,
    "validFrom" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


--
-- Name: Product; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."Product" (
    id text NOT NULL,
    slug text NOT NULL,
    status public."ProductStatus" DEFAULT 'DRAFT'::public."ProductStatus" NOT NULL,
    "namePl" text NOT NULL,
    "nameEn" text,
    "nameUk" text,
    "shortDescPl" text,
    "shortDescEn" text,
    "descriptionPl" text,
    "descriptionEn" text,
    "categoryId" text,
    "brandId" text,
    "isFeatured" boolean DEFAULT false NOT NULL,
    "isNewArrival" boolean DEFAULT false NOT NULL,
    "netWeight" text,
    "servingSize" text,
    "servingsPerContainer" integer,
    "storageInfo" text,
    "countryOfOrigin" text,
    ingredients jsonb,
    "nutritionFacts" jsonb,
    "allergenInfo" jsonb,
    "healthWarnings" jsonb,
    "ageRestriction" integer,
    "metaTitlePl" text,
    "metaTitleEn" text,
    "metaDescPl" text,
    "metaDescEn" text,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL,
    "isGiftEligible" boolean DEFAULT true NOT NULL,
    "benefitsPl" jsonb,
    certifications jsonb,
    "contraindicationsPl" text,
    "descriptionUk" text,
    "responsibleEntity" text,
    "shortDescUk" text,
    "usageInstructionsPl" text,
    "isInGoogleFeed" boolean DEFAULT true NOT NULL
);


--
-- Name: ProductCategory; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."ProductCategory" (
    "productId" text NOT NULL,
    "categoryId" text NOT NULL
);


--
-- Name: ProductImage; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."ProductImage" (
    id text NOT NULL,
    "productId" text NOT NULL,
    "variantId" text,
    url text NOT NULL,
    "altPl" text,
    "altEn" text,
    "sortOrder" integer DEFAULT 0 NOT NULL,
    "isMain" boolean DEFAULT false NOT NULL
);


--
-- Name: ProductTag; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."ProductTag" (
    "productId" text NOT NULL,
    "tagId" text NOT NULL
);


--
-- Name: ProductVariant; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."ProductVariant" (
    id text NOT NULL,
    "productId" text NOT NULL,
    sku text NOT NULL,
    ean text,
    "optionLabel" text,
    "optionValue" text,
    "pricePln" integer NOT NULL,
    "comparePricePln" integer,
    "costPricePln" integer,
    "vatRate" numeric(5,2) DEFAULT 5.00 NOT NULL,
    stock integer DEFAULT 0 NOT NULL,
    "lowStockThreshold" integer DEFAULT 5 NOT NULL,
    "trackStock" boolean DEFAULT true NOT NULL,
    "weightGrams" double precision,
    "isDefault" boolean DEFAULT false NOT NULL,
    "isActive" boolean DEFAULT true NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL,
    "lowestPrice30dPln" integer
);


--
-- Name: Redirect; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."Redirect" (
    "fromPath" text NOT NULL,
    "toPath" text NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


--
-- Name: Review; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."Review" (
    id text NOT NULL,
    "productId" text NOT NULL,
    "orderId" text NOT NULL,
    "authorName" text NOT NULL,
    rating integer NOT NULL,
    content text NOT NULL,
    status public."ReviewStatus" DEFAULT 'PENDING'::public."ReviewStatus" NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);


--
-- Name: ShippingRate; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."ShippingRate" (
    method public."ShippingMethod" NOT NULL,
    "pricePln" integer NOT NULL,
    enabled boolean DEFAULT false NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);


--
-- Name: ShopSettings; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."ShopSettings" (
    id integer DEFAULT 1 NOT NULL,
    "freeShippingThresholdPln" integer DEFAULT 20000,
    "updatedAt" timestamp(3) without time zone NOT NULL,
    "productMetaSuffixPl" text DEFAULT 'Wysyłka w 24–48 h.'::text,
    "ordersPaused" boolean DEFAULT false NOT NULL,
    "ordersPausedMessagePl" text,
    "tierPromoEndsAt" timestamp(3) without time zone,
    "tierPromoName" text,
    "tierPromoStartsAt" timestamp(3) without time zone,
    "tierPromoTiers" jsonb
);


--
-- Name: StockLevel; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."StockLevel" (
    "locationId" text NOT NULL,
    "variantId" text NOT NULL,
    quantity integer NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);


--
-- Name: StockLocation; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."StockLocation" (
    id text NOT NULL,
    code text NOT NULL,
    name text NOT NULL,
    "sellsOnline" boolean DEFAULT true NOT NULL,
    "safetyStock" integer DEFAULT 1 NOT NULL,
    "lastSyncAt" timestamp(3) without time zone,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);


--
-- Name: SyncRun; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."SyncRun" (
    id text NOT NULL,
    "locationId" text NOT NULL,
    mode text NOT NULL,
    received integer NOT NULL,
    matched integer NOT NULL,
    "changedLevels" integer NOT NULL,
    "changedVariants" integer NOT NULL,
    "unmatchedSample" jsonb,
    unmatched integer NOT NULL,
    error text,
    "agentVersion" text,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


--
-- Name: Tag; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."Tag" (
    id text NOT NULL,
    slug text NOT NULL,
    "namePl" text NOT NULL,
    "nameEn" text,
    "iconUrl" text,
    type public."TagType" NOT NULL,
    "sortOrder" integer DEFAULT 0 NOT NULL
);


--
-- Name: Wishlist; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."Wishlist" (
    id text NOT NULL,
    "customerId" text,
    "expiresAt" timestamp(3) without time zone,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);


--
-- Name: WishlistItem; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."WishlistItem" (
    id text NOT NULL,
    "wishlistId" text NOT NULL,
    "productId" text NOT NULL,
    "addedAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


--
-- Name: Withdrawal; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."Withdrawal" (
    id text NOT NULL,
    "orderId" text NOT NULL,
    name text NOT NULL,
    email text NOT NULL,
    items text NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


--
-- Name: _prisma_migrations; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public._prisma_migrations (
    id character varying(36) NOT NULL,
    checksum character varying(64) NOT NULL,
    finished_at timestamp with time zone,
    migration_name character varying(255) NOT NULL,
    logs text,
    rolled_back_at timestamp with time zone,
    started_at timestamp with time zone DEFAULT now() NOT NULL,
    applied_steps_count integer DEFAULT 0 NOT NULL
);


--
-- Name: Address Address_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."Address"
    ADD CONSTRAINT "Address_pkey" PRIMARY KEY (id);


--
-- Name: Brand Brand_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."Brand"
    ADD CONSTRAINT "Brand_pkey" PRIMARY KEY (id);


--
-- Name: CartItem CartItem_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."CartItem"
    ADD CONSTRAINT "CartItem_pkey" PRIMARY KEY (id);


--
-- Name: Cart Cart_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."Cart"
    ADD CONSTRAINT "Cart_pkey" PRIMARY KEY (id);


--
-- Name: Category Category_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."Category"
    ADD CONSTRAINT "Category_pkey" PRIMARY KEY (id);


--
-- Name: ConsentLog ConsentLog_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."ConsentLog"
    ADD CONSTRAINT "ConsentLog_pkey" PRIMARY KEY (id);


--
-- Name: ContactMessage ContactMessage_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."ContactMessage"
    ADD CONSTRAINT "ContactMessage_pkey" PRIMARY KEY (id);


--
-- Name: Coupon Coupon_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."Coupon"
    ADD CONSTRAINT "Coupon_pkey" PRIMARY KEY (id);


--
-- Name: Customer Customer_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."Customer"
    ADD CONSTRAINT "Customer_pkey" PRIMARY KEY (id);


--
-- Name: Expense Expense_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."Expense"
    ADD CONSTRAINT "Expense_pkey" PRIMARY KEY (id);


--
-- Name: GiftBuilderSettings GiftBuilderSettings_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."GiftBuilderSettings"
    ADD CONSTRAINT "GiftBuilderSettings_pkey" PRIMARY KEY (id);


--
-- Name: GiftPackaging GiftPackaging_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."GiftPackaging"
    ADD CONSTRAINT "GiftPackaging_pkey" PRIMARY KEY (id);


--
-- Name: GiftSetItem GiftSetItem_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."GiftSetItem"
    ADD CONSTRAINT "GiftSetItem_pkey" PRIMARY KEY (id);


--
-- Name: GiftSetPriceHistory GiftSetPriceHistory_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."GiftSetPriceHistory"
    ADD CONSTRAINT "GiftSetPriceHistory_pkey" PRIMARY KEY (id);


--
-- Name: GiftSet GiftSet_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."GiftSet"
    ADD CONSTRAINT "GiftSet_pkey" PRIMARY KEY (id);


--
-- Name: HomeBanner HomeBanner_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."HomeBanner"
    ADD CONSTRAINT "HomeBanner_pkey" PRIMARY KEY (id);


--
-- Name: Ingredient Ingredient_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."Ingredient"
    ADD CONSTRAINT "Ingredient_pkey" PRIMARY KEY (id);


--
-- Name: NewsletterSubscriber NewsletterSubscriber_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."NewsletterSubscriber"
    ADD CONSTRAINT "NewsletterSubscriber_pkey" PRIMARY KEY (id);


--
-- Name: OrderItem OrderItem_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."OrderItem"
    ADD CONSTRAINT "OrderItem_pkey" PRIMARY KEY (id);


--
-- Name: OrderSequence OrderSequence_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."OrderSequence"
    ADD CONSTRAINT "OrderSequence_pkey" PRIMARY KEY (id);


--
-- Name: Order Order_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."Order"
    ADD CONSTRAINT "Order_pkey" PRIMARY KEY (id);


--
-- Name: Post Post_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."Post"
    ADD CONSTRAINT "Post_pkey" PRIMARY KEY (id);


--
-- Name: PriceHistory PriceHistory_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."PriceHistory"
    ADD CONSTRAINT "PriceHistory_pkey" PRIMARY KEY (id);


--
-- Name: ProductCategory ProductCategory_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."ProductCategory"
    ADD CONSTRAINT "ProductCategory_pkey" PRIMARY KEY ("productId", "categoryId");


--
-- Name: ProductImage ProductImage_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."ProductImage"
    ADD CONSTRAINT "ProductImage_pkey" PRIMARY KEY (id);


--
-- Name: ProductTag ProductTag_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."ProductTag"
    ADD CONSTRAINT "ProductTag_pkey" PRIMARY KEY ("productId", "tagId");


--
-- Name: ProductVariant ProductVariant_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."ProductVariant"
    ADD CONSTRAINT "ProductVariant_pkey" PRIMARY KEY (id);


--
-- Name: Product Product_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."Product"
    ADD CONSTRAINT "Product_pkey" PRIMARY KEY (id);


--
-- Name: Redirect Redirect_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."Redirect"
    ADD CONSTRAINT "Redirect_pkey" PRIMARY KEY ("fromPath");


--
-- Name: Review Review_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."Review"
    ADD CONSTRAINT "Review_pkey" PRIMARY KEY (id);


--
-- Name: ShippingRate ShippingRate_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."ShippingRate"
    ADD CONSTRAINT "ShippingRate_pkey" PRIMARY KEY (method);


--
-- Name: ShopSettings ShopSettings_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."ShopSettings"
    ADD CONSTRAINT "ShopSettings_pkey" PRIMARY KEY (id);


--
-- Name: StockLevel StockLevel_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."StockLevel"
    ADD CONSTRAINT "StockLevel_pkey" PRIMARY KEY ("locationId", "variantId");


--
-- Name: StockLocation StockLocation_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."StockLocation"
    ADD CONSTRAINT "StockLocation_pkey" PRIMARY KEY (id);


--
-- Name: SyncRun SyncRun_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."SyncRun"
    ADD CONSTRAINT "SyncRun_pkey" PRIMARY KEY (id);


--
-- Name: Tag Tag_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."Tag"
    ADD CONSTRAINT "Tag_pkey" PRIMARY KEY (id);


--
-- Name: WishlistItem WishlistItem_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."WishlistItem"
    ADD CONSTRAINT "WishlistItem_pkey" PRIMARY KEY (id);


--
-- Name: Wishlist Wishlist_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."Wishlist"
    ADD CONSTRAINT "Wishlist_pkey" PRIMARY KEY (id);


--
-- Name: Withdrawal Withdrawal_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."Withdrawal"
    ADD CONSTRAINT "Withdrawal_pkey" PRIMARY KEY (id);


--
-- Name: _prisma_migrations _prisma_migrations_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public._prisma_migrations
    ADD CONSTRAINT _prisma_migrations_pkey PRIMARY KEY (id);


--
-- Name: Address_customerId_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "Address_customerId_idx" ON public."Address" USING btree ("customerId");


--
-- Name: Brand_parentBrandId_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "Brand_parentBrandId_idx" ON public."Brand" USING btree ("parentBrandId");


--
-- Name: Brand_slug_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "Brand_slug_idx" ON public."Brand" USING btree (slug);


--
-- Name: Brand_slug_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX "Brand_slug_key" ON public."Brand" USING btree (slug);


--
-- Name: CartItem_cartId_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "CartItem_cartId_idx" ON public."CartItem" USING btree ("cartId");


--
-- Name: CartItem_cartId_variantId_giftSetGroupId_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX "CartItem_cartId_variantId_giftSetGroupId_key" ON public."CartItem" USING btree ("cartId", "variantId", "giftSetGroupId");


--
-- Name: CartItem_giftSetGroupId_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "CartItem_giftSetGroupId_idx" ON public."CartItem" USING btree ("giftSetGroupId");


--
-- Name: Cart_customerId_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX "Cart_customerId_key" ON public."Cart" USING btree ("customerId");


--
-- Name: Category_parentId_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "Category_parentId_idx" ON public."Category" USING btree ("parentId");


--
-- Name: Category_slug_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "Category_slug_idx" ON public."Category" USING btree (slug);


--
-- Name: Category_slug_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX "Category_slug_key" ON public."Category" USING btree (slug);


--
-- Name: ConsentLog_consentId_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "ConsentLog_consentId_idx" ON public."ConsentLog" USING btree ("consentId");


--
-- Name: ContactMessage_createdAt_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "ContactMessage_createdAt_idx" ON public."ContactMessage" USING btree ("createdAt");


--
-- Name: Coupon_code_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "Coupon_code_idx" ON public."Coupon" USING btree (code);


--
-- Name: Coupon_code_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX "Coupon_code_key" ON public."Coupon" USING btree (code);


--
-- Name: Coupon_isActive_validUntil_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "Coupon_isActive_validUntil_idx" ON public."Coupon" USING btree ("isActive", "validUntil");


--
-- Name: Customer_authUserId_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "Customer_authUserId_idx" ON public."Customer" USING btree ("authUserId");


--
-- Name: Customer_authUserId_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX "Customer_authUserId_key" ON public."Customer" USING btree ("authUserId");


--
-- Name: Customer_email_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "Customer_email_idx" ON public."Customer" USING btree (email);


--
-- Name: Customer_email_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX "Customer_email_key" ON public."Customer" USING btree (email);


--
-- Name: Expense_date_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "Expense_date_idx" ON public."Expense" USING btree (date);


--
-- Name: GiftPackaging_isActive_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "GiftPackaging_isActive_idx" ON public."GiftPackaging" USING btree ("isActive");


--
-- Name: GiftSetItem_giftSetId_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "GiftSetItem_giftSetId_idx" ON public."GiftSetItem" USING btree ("giftSetId");


--
-- Name: GiftSetItem_giftSetId_variantId_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX "GiftSetItem_giftSetId_variantId_key" ON public."GiftSetItem" USING btree ("giftSetId", "variantId");


--
-- Name: GiftSetPriceHistory_giftSetId_validFrom_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "GiftSetPriceHistory_giftSetId_validFrom_idx" ON public."GiftSetPriceHistory" USING btree ("giftSetId", "validFrom");


--
-- Name: GiftSet_slug_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "GiftSet_slug_idx" ON public."GiftSet" USING btree (slug);


--
-- Name: GiftSet_slug_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX "GiftSet_slug_key" ON public."GiftSet" USING btree (slug);


--
-- Name: GiftSet_status_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "GiftSet_status_idx" ON public."GiftSet" USING btree (status);


--
-- Name: HomeBanner_isActive_sortOrder_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "HomeBanner_isActive_sortOrder_idx" ON public."HomeBanner" USING btree ("isActive", "sortOrder");


--
-- Name: Ingredient_slug_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX "Ingredient_slug_key" ON public."Ingredient" USING btree (slug);


--
-- Name: NewsletterSubscriber_couponId_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX "NewsletterSubscriber_couponId_key" ON public."NewsletterSubscriber" USING btree ("couponId");


--
-- Name: NewsletterSubscriber_email_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX "NewsletterSubscriber_email_key" ON public."NewsletterSubscriber" USING btree (email);


--
-- Name: OrderItem_giftSetGroupId_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "OrderItem_giftSetGroupId_idx" ON public."OrderItem" USING btree ("giftSetGroupId");


--
-- Name: OrderItem_orderId_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "OrderItem_orderId_idx" ON public."OrderItem" USING btree ("orderId");


--
-- Name: OrderItem_variantId_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "OrderItem_variantId_idx" ON public."OrderItem" USING btree ("variantId");


--
-- Name: Order_allegroOrderId_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "Order_allegroOrderId_idx" ON public."Order" USING btree ("allegroOrderId");


--
-- Name: Order_allegroOrderId_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX "Order_allegroOrderId_key" ON public."Order" USING btree ("allegroOrderId");


--
-- Name: Order_createdAt_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "Order_createdAt_idx" ON public."Order" USING btree ("createdAt");


--
-- Name: Order_customerId_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "Order_customerId_idx" ON public."Order" USING btree ("customerId");


--
-- Name: Order_orderNumber_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "Order_orderNumber_idx" ON public."Order" USING btree ("orderNumber");


--
-- Name: Order_orderNumber_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX "Order_orderNumber_key" ON public."Order" USING btree ("orderNumber");


--
-- Name: Order_paymentStatus_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "Order_paymentStatus_idx" ON public."Order" USING btree ("paymentStatus");


--
-- Name: Order_reviewToken_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX "Order_reviewToken_key" ON public."Order" USING btree ("reviewToken");


--
-- Name: Order_status_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "Order_status_idx" ON public."Order" USING btree (status);


--
-- Name: Post_isPublished_publishedAt_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "Post_isPublished_publishedAt_idx" ON public."Post" USING btree ("isPublished", "publishedAt");


--
-- Name: Post_slug_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX "Post_slug_key" ON public."Post" USING btree (slug);


--
-- Name: PriceHistory_variantId_validFrom_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "PriceHistory_variantId_validFrom_idx" ON public."PriceHistory" USING btree ("variantId", "validFrom");


--
-- Name: ProductCategory_categoryId_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "ProductCategory_categoryId_idx" ON public."ProductCategory" USING btree ("categoryId");


--
-- Name: ProductImage_productId_sortOrder_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "ProductImage_productId_sortOrder_idx" ON public."ProductImage" USING btree ("productId", "sortOrder");


--
-- Name: ProductTag_tagId_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "ProductTag_tagId_idx" ON public."ProductTag" USING btree ("tagId");


--
-- Name: ProductVariant_ean_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX "ProductVariant_ean_key" ON public."ProductVariant" USING btree (ean);


--
-- Name: ProductVariant_isActive_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "ProductVariant_isActive_idx" ON public."ProductVariant" USING btree ("isActive");


--
-- Name: ProductVariant_productId_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "ProductVariant_productId_idx" ON public."ProductVariant" USING btree ("productId");


--
-- Name: ProductVariant_sku_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "ProductVariant_sku_idx" ON public."ProductVariant" USING btree (sku);


--
-- Name: ProductVariant_sku_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX "ProductVariant_sku_key" ON public."ProductVariant" USING btree (sku);


--
-- Name: Product_brandId_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "Product_brandId_idx" ON public."Product" USING btree ("brandId");


--
-- Name: Product_categoryId_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "Product_categoryId_idx" ON public."Product" USING btree ("categoryId");


--
-- Name: Product_isFeatured_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "Product_isFeatured_idx" ON public."Product" USING btree ("isFeatured");


--
-- Name: Product_slug_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "Product_slug_idx" ON public."Product" USING btree (slug);


--
-- Name: Product_slug_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX "Product_slug_key" ON public."Product" USING btree (slug);


--
-- Name: Product_status_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "Product_status_idx" ON public."Product" USING btree (status);


--
-- Name: Review_orderId_productId_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX "Review_orderId_productId_key" ON public."Review" USING btree ("orderId", "productId");


--
-- Name: Review_productId_status_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "Review_productId_status_idx" ON public."Review" USING btree ("productId", status);


--
-- Name: Review_status_createdAt_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "Review_status_createdAt_idx" ON public."Review" USING btree (status, "createdAt");


--
-- Name: StockLevel_variantId_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "StockLevel_variantId_idx" ON public."StockLevel" USING btree ("variantId");


--
-- Name: StockLocation_code_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX "StockLocation_code_key" ON public."StockLocation" USING btree (code);


--
-- Name: SyncRun_locationId_createdAt_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "SyncRun_locationId_createdAt_idx" ON public."SyncRun" USING btree ("locationId", "createdAt");


--
-- Name: Tag_slug_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX "Tag_slug_key" ON public."Tag" USING btree (slug);


--
-- Name: Tag_type_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "Tag_type_idx" ON public."Tag" USING btree (type);


--
-- Name: WishlistItem_wishlistId_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "WishlistItem_wishlistId_idx" ON public."WishlistItem" USING btree ("wishlistId");


--
-- Name: WishlistItem_wishlistId_productId_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX "WishlistItem_wishlistId_productId_key" ON public."WishlistItem" USING btree ("wishlistId", "productId");


--
-- Name: Wishlist_customerId_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX "Wishlist_customerId_key" ON public."Wishlist" USING btree ("customerId");


--
-- Name: Withdrawal_createdAt_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "Withdrawal_createdAt_idx" ON public."Withdrawal" USING btree ("createdAt");


--
-- Name: Withdrawal_orderId_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "Withdrawal_orderId_idx" ON public."Withdrawal" USING btree ("orderId");


--
-- Name: GiftSet gift_set_price_insert; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER gift_set_price_insert AFTER INSERT ON public."GiftSet" FOR EACH ROW EXECUTE FUNCTION public.record_new_gift_set_price();


--
-- Name: GiftSet gift_set_price_update; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER gift_set_price_update BEFORE UPDATE OF "pricePln", "comparePricePln" ON public."GiftSet" FOR EACH ROW EXECUTE FUNCTION public.record_gift_set_price();


--
-- Name: ProductVariant variant_price_insert; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER variant_price_insert AFTER INSERT ON public."ProductVariant" FOR EACH ROW EXECUTE FUNCTION public.record_new_variant_price();


--
-- Name: ProductVariant variant_price_update; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER variant_price_update BEFORE UPDATE OF "pricePln", "comparePricePln" ON public."ProductVariant" FOR EACH ROW EXECUTE FUNCTION public.record_variant_price();


--
-- Name: Address Address_customerId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."Address"
    ADD CONSTRAINT "Address_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES public."Customer"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: Brand Brand_parentBrandId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."Brand"
    ADD CONSTRAINT "Brand_parentBrandId_fkey" FOREIGN KEY ("parentBrandId") REFERENCES public."Brand"(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: CartItem CartItem_cartId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."CartItem"
    ADD CONSTRAINT "CartItem_cartId_fkey" FOREIGN KEY ("cartId") REFERENCES public."Cart"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: CartItem CartItem_giftSetId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."CartItem"
    ADD CONSTRAINT "CartItem_giftSetId_fkey" FOREIGN KEY ("giftSetId") REFERENCES public."GiftSet"(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: CartItem CartItem_packagingId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."CartItem"
    ADD CONSTRAINT "CartItem_packagingId_fkey" FOREIGN KEY ("packagingId") REFERENCES public."GiftPackaging"(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: CartItem CartItem_variantId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."CartItem"
    ADD CONSTRAINT "CartItem_variantId_fkey" FOREIGN KEY ("variantId") REFERENCES public."ProductVariant"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: Cart Cart_customerId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."Cart"
    ADD CONSTRAINT "Cart_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES public."Customer"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: Category Category_parentId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."Category"
    ADD CONSTRAINT "Category_parentId_fkey" FOREIGN KEY ("parentId") REFERENCES public."Category"(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: GiftSetItem GiftSetItem_giftSetId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."GiftSetItem"
    ADD CONSTRAINT "GiftSetItem_giftSetId_fkey" FOREIGN KEY ("giftSetId") REFERENCES public."GiftSet"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: GiftSetItem GiftSetItem_variantId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."GiftSetItem"
    ADD CONSTRAINT "GiftSetItem_variantId_fkey" FOREIGN KEY ("variantId") REFERENCES public."ProductVariant"(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: GiftSetPriceHistory GiftSetPriceHistory_giftSetId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."GiftSetPriceHistory"
    ADD CONSTRAINT "GiftSetPriceHistory_giftSetId_fkey" FOREIGN KEY ("giftSetId") REFERENCES public."GiftSet"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: NewsletterSubscriber NewsletterSubscriber_couponId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."NewsletterSubscriber"
    ADD CONSTRAINT "NewsletterSubscriber_couponId_fkey" FOREIGN KEY ("couponId") REFERENCES public."Coupon"(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: OrderItem OrderItem_giftSetId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."OrderItem"
    ADD CONSTRAINT "OrderItem_giftSetId_fkey" FOREIGN KEY ("giftSetId") REFERENCES public."GiftSet"(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: OrderItem OrderItem_orderId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."OrderItem"
    ADD CONSTRAINT "OrderItem_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES public."Order"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: OrderItem OrderItem_packagingId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."OrderItem"
    ADD CONSTRAINT "OrderItem_packagingId_fkey" FOREIGN KEY ("packagingId") REFERENCES public."GiftPackaging"(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: OrderItem OrderItem_variantId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."OrderItem"
    ADD CONSTRAINT "OrderItem_variantId_fkey" FOREIGN KEY ("variantId") REFERENCES public."ProductVariant"(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: Order Order_couponId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."Order"
    ADD CONSTRAINT "Order_couponId_fkey" FOREIGN KEY ("couponId") REFERENCES public."Coupon"(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: Order Order_customerId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."Order"
    ADD CONSTRAINT "Order_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES public."Customer"(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: PriceHistory PriceHistory_variantId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."PriceHistory"
    ADD CONSTRAINT "PriceHistory_variantId_fkey" FOREIGN KEY ("variantId") REFERENCES public."ProductVariant"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: ProductCategory ProductCategory_categoryId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."ProductCategory"
    ADD CONSTRAINT "ProductCategory_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES public."Category"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: ProductCategory ProductCategory_productId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."ProductCategory"
    ADD CONSTRAINT "ProductCategory_productId_fkey" FOREIGN KEY ("productId") REFERENCES public."Product"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: ProductImage ProductImage_productId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."ProductImage"
    ADD CONSTRAINT "ProductImage_productId_fkey" FOREIGN KEY ("productId") REFERENCES public."Product"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: ProductImage ProductImage_variantId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."ProductImage"
    ADD CONSTRAINT "ProductImage_variantId_fkey" FOREIGN KEY ("variantId") REFERENCES public."ProductVariant"(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: ProductTag ProductTag_productId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."ProductTag"
    ADD CONSTRAINT "ProductTag_productId_fkey" FOREIGN KEY ("productId") REFERENCES public."Product"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: ProductTag ProductTag_tagId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."ProductTag"
    ADD CONSTRAINT "ProductTag_tagId_fkey" FOREIGN KEY ("tagId") REFERENCES public."Tag"(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: ProductVariant ProductVariant_productId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."ProductVariant"
    ADD CONSTRAINT "ProductVariant_productId_fkey" FOREIGN KEY ("productId") REFERENCES public."Product"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: Product Product_brandId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."Product"
    ADD CONSTRAINT "Product_brandId_fkey" FOREIGN KEY ("brandId") REFERENCES public."Brand"(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: Product Product_categoryId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."Product"
    ADD CONSTRAINT "Product_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES public."Category"(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: Review Review_orderId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."Review"
    ADD CONSTRAINT "Review_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES public."Order"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: Review Review_productId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."Review"
    ADD CONSTRAINT "Review_productId_fkey" FOREIGN KEY ("productId") REFERENCES public."Product"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: StockLevel StockLevel_locationId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."StockLevel"
    ADD CONSTRAINT "StockLevel_locationId_fkey" FOREIGN KEY ("locationId") REFERENCES public."StockLocation"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: StockLevel StockLevel_variantId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."StockLevel"
    ADD CONSTRAINT "StockLevel_variantId_fkey" FOREIGN KEY ("variantId") REFERENCES public."ProductVariant"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: SyncRun SyncRun_locationId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."SyncRun"
    ADD CONSTRAINT "SyncRun_locationId_fkey" FOREIGN KEY ("locationId") REFERENCES public."StockLocation"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: WishlistItem WishlistItem_productId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."WishlistItem"
    ADD CONSTRAINT "WishlistItem_productId_fkey" FOREIGN KEY ("productId") REFERENCES public."Product"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: WishlistItem WishlistItem_wishlistId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."WishlistItem"
    ADD CONSTRAINT "WishlistItem_wishlistId_fkey" FOREIGN KEY ("wishlistId") REFERENCES public."Wishlist"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: Wishlist Wishlist_customerId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."Wishlist"
    ADD CONSTRAINT "Wishlist_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES public."Customer"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: Withdrawal Withdrawal_orderId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."Withdrawal"
    ADD CONSTRAINT "Withdrawal_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES public."Order"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- PostgreSQL database dump complete
--


--
-- PostgreSQL database dump
--


-- Dumped from database version 18.7 (Ubuntu 18.7-1.pgdg24.04+2)
-- Dumped by pg_dump version 18.7 (Ubuntu 18.7-1.pgdg24.04+2)

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET transaction_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;

--
-- Data for Name: _prisma_migrations; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public._prisma_migrations (id, checksum, finished_at, migration_name, logs, rolled_back_at, started_at, applied_steps_count) FROM stdin;
fe586fa3-de4d-409a-b6bd-2eb89ddbf7eb	f968f3fa37cc6fc070335fd3ff0b038bb192197a734c5770daaf7773785c6a31	2026-08-07 16:37:20.788273+02	20260807163700_add_category_icon	\N	\N	2026-08-07 16:37:20.034162+02	1
1c2d5b7e-62cb-4265-a4c7-4d84b513df2b	e2a0be98c9f1847ad2d0a288f6fc529c16a62d9c93b436736cd93d1714e2c130	2026-06-09 21:01:04.597779+02	20260609190104_init	\N	\N	2026-06-09 21:01:04.225635+02	1
a11cb113-e42b-4ee8-90c1-bfaeb30a857a	91afd2be06d07ee7ab8414a0e059d35b48e91ac391cc6167b53f125fa97a5d37	2026-06-10 14:15:46.985899+02	20260610121546_add_order_sequence	\N	\N	2026-06-10 14:15:46.766108+02	1
3c300ff4-a5ed-4d7e-9dee-e4da8f5d28a0	847bc529bea337b6f278d1400bc9ad956f20f7b511e37ac9f4728aea30b3adaa	2026-06-10 15:39:59.207949+02	20260610133958_add_customer_password_hash	\N	\N	2026-06-10 15:39:59.001049+02	1
167dec57-fc84-4168-9354-cf1ec1efae91	644776421ebfc4b607fcc02224b5ff513ed4aea5cba01de04ff2595b621d70dd	2026-08-12 19:15:38.460048+02	20260812171522_add_inpost_kurier_orlen_paczka_shipping	\N	\N	2026-08-12 19:15:38.180932+02	1
0c1873de-f078-4007-9aa8-bbd6d6fc25fd	c9d160f98cc088be7b345ca2d1a09fecc7b09aa10473c3a92f77f79fa7840bdd	\N	20260610_add_customer_is_admin	A migration failed to apply. New migrations cannot be applied before the error is recovered from. Read more about how to resolve migration issues in a production database: https://pris.ly/d/migrate-resolve\n\nMigration name: 20260610_add_customer_is_admin\n\nDatabase error code: 42701\n\nDatabase error:\nERROR: column "isAdmin" of relation "Customer" already exists\n\nDbError { severity: "ERROR", parsed_severity: Some(Error), code: SqlState(E42701), message: "column \\"isAdmin\\" of relation \\"Customer\\" already exists", detail: None, hint: None, position: None, where_: None, schema: None, table: None, column: None, datatype: None, constraint: None, file: Some("tablecmds.c"), line: Some(7686), routine: Some("check_for_column_name_collision") }\n\n   0: sql_schema_connector::apply_migration::apply_script\n           with migration_name="20260610_add_customer_is_admin"\n             at schema-engine/connectors/sql-schema-connector/src/apply_migration.rs:106\n   1: schema_core::commands::apply_migrations::Applying migration\n           with migration_name="20260610_add_customer_is_admin"\n             at schema-engine/core/src/commands/apply_migrations.rs:91\n   2: schema_core::state::ApplyMigrations\n             at schema-engine/core/src/state.rs:226	2026-06-10 18:15:53.393785+02	2026-06-10 18:15:46.809038+02	0
87f50f50-98cf-4646-85c8-a70f4cdc74c4	c9d160f98cc088be7b345ca2d1a09fecc7b09aa10473c3a92f77f79fa7840bdd	2026-06-10 18:15:53.470502+02	20260610_add_customer_is_admin		\N	2026-06-10 18:15:53.470502+02	0
869b979b-8e5b-4095-932c-50d200bc7b29	d37df4018d9b7e7a92ec316f59b36e6daba741247c52958145a8fba9e5b48f33	2026-06-10 18:15:59.150124+02	20260610_allegro_pay_orderitem_optional	\N	\N	2026-06-10 18:15:58.94924+02	1
748143a0-b1b3-46e4-92da-3652fb3bee06	e0186e6901d5e3c91cec8b5325e68569e17c9dbf0b1e2dd76fa7e157f47eb03b	2026-07-09 19:17:43.071795+02	20260709171726_add_shoper_sync_state		\N	2026-07-09 19:17:43.071795+02	0
5d617512-6495-430b-bef8-11a76091a2eb	24f27d7965fe007f2dea2dd4ea8f4a798e16c1a197db033fbda290e7411d5679	2026-07-09 19:32:05.904161+02	20260709173137_add_shoper_product_id		\N	2026-07-09 19:32:05.904161+02	0
d1ffa700-c774-4b20-a9c3-73e28b13afd5	f206b82102e9072bc12a4dbdde569df760df173847d1eb9c15279e2b427164b6	2026-07-18 21:35:44.238079+02	20260718213502_add_gift_sets		\N	2026-07-18 21:35:44.238079+02	0
9fb734da-b6e8-4988-a921-b870dd6277f6	416eed9ed4c991e60d2778ef049cc3f4ebc956b7d9b4eee808e10a41efd0d31f	2026-07-18 22:10:53.202197+02	20260718221038_add_gift_packaging		\N	2026-07-18 22:10:53.202197+02	0
e0dfbe58-e12e-4514-92dc-9042f75b6c3c	ef8a25398ff841a90dede48d40cb804e11b432ad88f5bd2396e5833e32af9cf6	2026-07-18 22:28:57.95078+02	20260718222849_add_gift_discount_percent		\N	2026-07-18 22:28:57.95078+02	0
15f6eaad-8e45-46e2-9f9e-1dd039c11ce1	b00269d017efde634ff92a50d4237da881979a709baea7f4ff7faeed7a141ed7	2026-08-05 22:31:26.521953+02	20260805203121_add_product_content_fields	\N	\N	2026-08-05 22:31:26.323427+02	1
3b070d05-e948-472b-a560-ad075981f48a	acaa7347f1a806be54c866cec08d7b16c8daede1f85f8b8bbeb3686429b0a684	2026-09-25 18:17:33.235309+02	20260925170000_shop_settings_meta_suffix	\N	\N	2026-09-25 18:17:33.025231+02	1
0f6ab985-e267-4807-9de8-ae69e1841391	6a751423f30dc6ec195e9b8cf0c6820ce1b0f12c660fd8ab8c789f0532fa70e6	2026-08-13 23:30:38.860909+02	20260813213029_add_brand_parent	\N	\N	2026-08-13 23:30:38.647008+02	1
57f6c6f4-1ec7-4848-8364-761f88c5fb48	13860f52fb8b90b3f0ca2ecf807c18dfd49b30872ee1f6eae4b3079a0ec2626b	2026-08-31 18:37:20.638227+02	20260831163713_variant_weight_decimal	\N	\N	2026-08-31 18:37:20.342225+02	1
9c655e5b-d7c4-42b2-b297-c61f5d0fd440	43bc0e1d4f71751b16b28914f63b91e56e31cd21b3f990ccd4d5a4dadb75a891	2026-09-25 22:01:57.527646+02	20260926100000_blog_posts	\N	\N	2026-09-25 22:01:57.044713+02	1
30fdac6d-c754-4375-8d59-43412493a120	741bd23636f313dc1b09d762ebb4c128d2ddc5f8b7f7bac6a7d7009a3013ab2e	2026-09-23 14:52:46.385968+02	20260917120000_order_pickup_location	\N	\N	2026-09-23 14:52:45.897279+02	1
a37cb25d-f8a2-488a-80c2-a797622016f9	46878097735eb1c91b5c408f300936f4d814dc013e96a09219208a54452960d6	2026-09-25 21:00:23.336867+02	20260925200000_category_seo_content	\N	\N	2026-09-25 21:00:22.863124+02	1
f1429db8-8723-4ea2-94f9-394765a8659b	bfcb54281d60cfc161b8ae4fb594012c1797cbc1e5d63e50bc4363fcc06361e9	2026-09-23 14:52:47.0761+02	20260917140000_shop_settings	\N	\N	2026-09-23 14:52:46.572025+02	1
715a3fcc-83c5-42bb-a757-9d59624817d3	cf141432b1e386ccff4393b926e3808d4fd7d37d9dab9c8f87563c4fd5e5a082	2026-09-23 15:22:23.863751+02	20260923130000_category_links_and_redirects	\N	\N	2026-09-23 15:22:23.375885+02	1
552ab5bc-1de3-4f3e-9d40-c4c5f9a50379	55d6d376a10bb949c5935d6992908b1fa84d48fdce68092dcab6fd8ddb7669b1	2026-09-25 21:22:17.980964+02	20260925220000_ingredient_glossary	\N	\N	2026-09-25 21:22:17.710519+02	1
b8abbfd0-7b57-47b1-bbc0-133444431fdf	54f25e8ab431c30d1ada9312b6dc429b4491a9d5692acb826244a5cbe941722b	2026-09-25 21:45:07.265991+02	20260926090000_product_reviews	\N	\N	2026-09-25 21:45:06.757045+02	1
e7fa6cd1-e50b-4eed-ab5c-999fd84e1473	7c82ab035cd99bf9d2a5f70021f24d41c8bb92f87b80bd16164969cc0905e93e	2026-09-26 11:24:08.949667+02	20260926120000_price_history	\N	\N	2026-09-26 11:24:08.369552+02	1
286a3fc1-1602-4fd7-bee3-2b25c7bfa6c5	5602a86de6e975c2853e05de893319168b8bf1730c4653fc865d713e58e917b2	2026-10-01 14:46:57.594389+02	20261001120000_drop_legacy_sync_fields	\N	\N	2026-10-01 14:46:56.982968+02	1
4d485507-4ce3-4d4f-9cd7-86daa3d23ff0	453a9125b90eb33cdef70a7ce89ddf217f45a1a68ce839fb7ee3ba245a103072	2026-09-26 11:44:45.707507+02	20260926130000_brand_content	\N	\N	2026-09-26 11:44:45.237142+02	1
b3af5109-666a-4839-a201-919baa08e025	10f5f7c43b8d2ee6c937e2782a6e5d398161633315f63c1752e31319493d690e	2026-10-02 19:22:09.047727+02	20261002130000_newsletter_coupon	\N	\N	2026-10-02 19:22:08.569753+02	1
a2630037-9804-49b0-9fd4-d53a9791835d	0dd6aa30f77d14a0dcd4394597c1b71e51efcdca07be7df75e040c90bb911543	2026-10-02 19:22:08.387693+02	20261002120000_home_banners	\N	\N	2026-10-02 19:22:07.873055+02	1
9a7cabdc-0da3-4907-821d-7e13a9538ded	54e7132dba29a1d83d6a914ce078ae3a6bada5bddd113d1139b155dc12d1687e	2026-10-03 11:47:45.784847+02	20261003100000_gift_eligible_default	\N	\N	2026-10-03 11:47:44.990454+02	1
d3fdd82b-3061-4cbe-974a-68fd8f470fae	d4ec6a57b77bc31a6d0b34f3e35099baec521e481f1c46b1a62563530307d415	2026-10-04 14:04:17.42527+02	20261004120000_epaka_shipping	\N	\N	2026-10-04 14:04:16.656158+02	1
891d51ff-fc5b-4753-bf14-4b3ffbb72966	a6e5b725c1e631bfff86843b3f578270b7b1b233c0bf9d97278f17cacaeabede	2026-10-05 10:36:36.178259+02	20261005120000_gift_set_price_history	\N	\N	2026-10-05 10:36:35.376804+02	1
0fe95782-2495-47c4-98a4-4ebed0483268	15ed8e95d7ba6580d4e8286824f800a6f934814e68df60b8ee1764954fd0fe5d	2026-10-05 10:36:37.13526+02	20261005130000_product_google_feed_flag	\N	\N	2026-10-05 10:36:36.44928+02	1
58cdf464-938c-4c84-b621-47e8a18bb295	429ca312b843fc1008fe657575defbf9b92dd799bb9db70402baeaa985dff245	2026-10-14 10:53:01.61964+02	20261014120000_shop_orders_paused	\N	\N	2026-10-14 10:53:00.820056+02	1
d47c7ade-9f79-40df-96dc-3a36217b0fdc	3f3a556cd35a160a0fb36a736d3d1b8c5f2df144488644fb27efceb28d777f3c	2026-10-20 21:44:21.628814+02	20261020120000_subiekt_stock_sync	\N	\N	2026-10-20 21:44:20.92745+02	1
f0188354-f70e-4aa4-8f21-fb55f2fd8201	9caa2b578a3661cb8ef181ca518e29caf1776aec619d9c49e7fb2928f71765f3	2026-10-23 18:02:17.773032+02	20261023120000_coupon_exclude_sale_items	\N	\N	2026-10-23 18:02:17.145158+02	1
616f753d-a9b8-408f-bc12-c23fdda0e1ce	058ce0809e181b9949f487ac70ed771d73194fe14cae186881fc93d8ee4844d0	2026-10-24 20:10:44.820045+02	20261024120000_order_marketing_consent	\N	\N	2026-10-24 20:10:44.341909+02	1
20b86602-7de5-4bbe-bc68-b307415d8e44	ad621e4b0e62d408fb586dd770e12d0efe972b7b88dcd38bb6b6b45cfdaf6fc4	2026-10-24 20:10:45.474195+02	20261024120100_consent_log	\N	\N	2026-10-24 20:10:44.999387+02	1
35941775-e53b-4c6e-8935-75b952b75083	b5dd60924111855c939cd9fcb7f250cee3182d91302a024ed79355d43456016a	2026-10-24 20:10:46.142538+02	20261024180000_withdrawal	\N	\N	2026-10-24 20:10:45.653617+02	1
92fb51bc-7f85-4972-ae27-f758e09fb721	8681784464dab9c27d87fa92eed23d3c912180939030189ffdabf40f57ac96c3	2026-10-24 20:10:46.773959+02	20261024190000_tier_promo	\N	\N	2026-10-24 20:10:46.32239+02	1
bb0972e5-660c-449f-9762-27d27bf005d2	0c8e658e09ef7921c6955d81089c0dc1c2cc88749c8b6445bd62c806639fb86a	2026-11-02 22:33:34.030386+01	20261029160000_brand_gpsr_contact	\N	\N	2026-11-02 22:33:33.27513+01	1
95bb3518-e9ec-4d20-9535-0d0852f191e4	394f50c441aa753024a14edfdb010f7e265c99ff493e2219a69583e5348326c8	2026-11-03 09:54:48.728944+01	20261029120000_profit_report	\N	\N	2026-11-03 09:54:48.074465+01	1
\.


--
-- PostgreSQL database dump complete
--



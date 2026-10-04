-- All domestic epaka carriers; offered only once enabled with a price in /admin/dostawa
ALTER TYPE "ShippingMethod" ADD VALUE 'DPD_PICKUP';
ALTER TYPE "ShippingMethod" ADD VALUE 'DHL_POINT';
ALTER TYPE "ShippingMethod" ADD VALUE 'FEDEX_POINT';
ALTER TYPE "ShippingMethod" ADD VALUE 'EPAKA_POINT';
ALTER TYPE "ShippingMethod" ADD VALUE 'GLS';
ALTER TYPE "ShippingMethod" ADD VALUE 'FEDEX';
ALTER TYPE "ShippingMethod" ADD VALUE 'POCZTEX';
ALTER TYPE "ShippingMethod" ADD VALUE 'POCZTA_POLSKA';

ALTER TABLE "Order" ADD COLUMN "epakaOrderId" INTEGER;

CREATE TABLE "ShippingRate" (
    "method" "ShippingMethod" NOT NULL,
    "pricePln" INTEGER NOT NULL,
    "enabled" BOOLEAN NOT NULL DEFAULT false,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ShippingRate_pkey" PRIMARY KEY ("method")
);

-- Prices approved 2026-09-26, previously hard-coded in shipping.ts
INSERT INTO "ShippingRate" ("method", "pricePln", "enabled", "updatedAt") VALUES
  ('ORLEN_PACZKA', 1199, true, CURRENT_TIMESTAMP),
  ('INPOST_PACZKOMAT', 1299, true, CURRENT_TIMESTAMP),
  ('INPOST_KURIER', 1699, true, CURRENT_TIMESTAMP),
  ('PICKUP', 0, true, CURRENT_TIMESTAMP);

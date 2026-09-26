-- AlterTable
ALTER TABLE "ProductVariant" ADD COLUMN     "lowestPrice30dPln" INTEGER;

-- CreateTable
CREATE TABLE "PriceHistory" (
    "id" TEXT NOT NULL,
    "variantId" TEXT NOT NULL,
    "pricePln" INTEGER NOT NULL,
    "comparePricePln" INTEGER,
    "validFrom" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PriceHistory_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "PriceHistory_variantId_validFrom_idx" ON "PriceHistory"("variantId", "validFrom");

-- AddForeignKey
ALTER TABLE "PriceHistory" ADD CONSTRAINT "PriceHistory_variantId_fkey" FOREIGN KEY ("variantId") REFERENCES "ProductVariant"("id") ON DELETE CASCADE ON UPDATE CASCADE;


-- Omnibus (art. 6a ustawy o informowaniu o cenach): keep every price of a
-- variant and, when a reduction starts, freeze the lowest price of the 30 days
-- before it. A trigger (not app code) so imports and scripts are covered too.
CREATE FUNCTION record_variant_price() RETURNS trigger AS $$
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
$$ LANGUAGE plpgsql;

-- BEFORE so the trigger can set lowestPrice30dPln on the row being written.
-- INSERT: the variant row doesn't exist yet at BEFORE time, so history for new
-- variants is written by the AFTER trigger below.
CREATE TRIGGER variant_price_update
  BEFORE UPDATE OF "pricePln", "comparePricePln" ON "ProductVariant"
  FOR EACH ROW EXECUTE FUNCTION record_variant_price();

CREATE FUNCTION record_new_variant_price() RETURNS trigger AS $$
BEGIN
  INSERT INTO "PriceHistory" ("id", "variantId", "pricePln", "comparePricePln", "validFrom")
  VALUES (gen_random_uuid()::text, NEW.id, NEW."pricePln", NEW."comparePricePln", CURRENT_TIMESTAMP);
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER variant_price_insert
  AFTER INSERT ON "ProductVariant"
  FOR EACH ROW EXECUTE FUNCTION record_new_variant_price();

-- Start the history with today's prices
INSERT INTO "PriceHistory" ("id", "variantId", "pricePln", "comparePricePln", "validFrom")
SELECT gen_random_uuid()::text, "id", "pricePln", "comparePricePln", CURRENT_TIMESTAMP
FROM "ProductVariant";

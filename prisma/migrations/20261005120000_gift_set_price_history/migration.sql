-- AlterTable
ALTER TABLE "GiftSet" ADD COLUMN     "lowestPrice30dPln" INTEGER;

-- CreateTable
CREATE TABLE "GiftSetPriceHistory" (
    "id" TEXT NOT NULL,
    "giftSetId" TEXT NOT NULL,
    "pricePln" INTEGER NOT NULL,
    "comparePricePln" INTEGER,
    "validFrom" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "GiftSetPriceHistory_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "GiftSetPriceHistory_giftSetId_validFrom_idx" ON "GiftSetPriceHistory"("giftSetId", "validFrom");

-- AddForeignKey
ALTER TABLE "GiftSetPriceHistory" ADD CONSTRAINT "GiftSetPriceHistory_giftSetId_fkey" FOREIGN KEY ("giftSetId") REFERENCES "GiftSet"("id") ON DELETE CASCADE ON UPDATE CASCADE;


-- Omnibus for gift sets — same rules as record_variant_price
-- (20260926120000_price_history), applied to the whole set's price.
CREATE FUNCTION record_gift_set_price() RETURNS trigger AS $$
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
$$ LANGUAGE plpgsql;

CREATE TRIGGER gift_set_price_update
  BEFORE UPDATE OF "pricePln", "comparePricePln" ON "GiftSet"
  FOR EACH ROW EXECUTE FUNCTION record_gift_set_price();

CREATE FUNCTION record_new_gift_set_price() RETURNS trigger AS $$
BEGIN
  INSERT INTO "GiftSetPriceHistory" ("id", "giftSetId", "pricePln", "comparePricePln", "validFrom")
  VALUES (gen_random_uuid()::text, NEW.id, NEW."pricePln", NEW."comparePricePln", CURRENT_TIMESTAMP);
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER gift_set_price_insert
  AFTER INSERT ON "GiftSet"
  FOR EACH ROW EXECUTE FUNCTION record_new_gift_set_price();

-- Start the history with today's prices. Sets already showing a strikethrough
-- price had no history before, so their lowest price is today's price.
INSERT INTO "GiftSetPriceHistory" ("id", "giftSetId", "pricePln", "comparePricePln", "validFrom")
SELECT gen_random_uuid()::text, "id", "pricePln", "comparePricePln", CURRENT_TIMESTAMP
FROM "GiftSet";

UPDATE "GiftSet" SET "lowestPrice30dPln" = "pricePln" WHERE "comparePricePln" IS NOT NULL;

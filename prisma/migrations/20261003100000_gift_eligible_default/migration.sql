-- Every product can go into a custom gift set unless an admin opts it out
ALTER TABLE "Product" ALTER COLUMN "isGiftEligible" SET DEFAULT true;

UPDATE "Product" SET "isGiftEligible" = true WHERE "isGiftEligible" = false;

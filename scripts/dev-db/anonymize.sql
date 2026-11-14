-- Strip personal data from a prod dump restored into a local dev DB.
-- Catalog, prices, stock and order totals stay real; people don't.
-- Admin accounts keep their e-mail (team, not customers) but lose the
-- prod password hash and TOTP secret — scripts/dev-db/refresh.sh sets a dev password.
BEGIN;

UPDATE "Customer" SET
  email = CASE WHEN "isAdmin" THEN email ELSE 'klient-' || left(md5(id), 10) || '@example.test' END,
  phone = NULL,
  "firstName" = CASE WHEN "firstName" IS NULL THEN NULL ELSE 'Jan' END,
  "lastName" = CASE WHEN "lastName" IS NULL THEN NULL ELSE 'Klient-' || left(md5(id), 6) END,
  "companyName" = CASE WHEN "companyName" IS NULL THEN NULL ELSE 'Firma ' || left(md5(id), 6) END,
  nip = CASE WHEN nip IS NULL THEN NULL ELSE '0000000000' END,
  "passwordHash" = NULL,
  "totpSecret" = NULL,
  "totpEnabledAt" = NULL,
  "totpLastStep" = NULL,
  "authUserId" = NULL;

UPDATE "Address" SET
  "firstName" = 'Jan',
  "lastName" = 'Klient-' || left(md5(id), 6),
  company = CASE WHEN company IS NULL THEN NULL ELSE 'Firma ' || left(md5(id), 6) END,
  street = 'ul. Testowa ' || (1 + abs(hashtext(id)) % 99),
  apartment = NULL,
  phone = CASE WHEN phone IS NULL THEN NULL ELSE '500000000' END;

UPDATE "Order" SET
  "customerEmail" = 'klient-' || left(md5(coalesce("customerId", id)), 10) || '@example.test',
  "customerPhone" = CASE WHEN "customerPhone" IS NULL THEN NULL ELSE '500000000' END,
  "customerName" = 'Jan Klient-' || left(md5(id), 6),
  "reviewToken" = NULL,
  "shipFirstName" = 'Jan',
  "shipLastName" = 'Klient-' || left(md5(id), 6),
  "shipCompany" = CASE WHEN "shipCompany" IS NULL THEN NULL ELSE 'Firma ' || left(md5(id), 6) END,
  "shipStreet" = CASE WHEN "shipStreet" IS NULL THEN NULL ELSE 'ul. Testowa ' || (1 + abs(hashtext(id)) % 99) END,
  "shipApartment" = NULL,
  "shipPhone" = CASE WHEN "shipPhone" IS NULL THEN NULL ELSE '500000000' END,
  "billCompany" = CASE WHEN "billCompany" IS NULL THEN NULL ELSE 'Firma ' || left(md5(id), 6) END,
  "billNip" = CASE WHEN "billNip" IS NULL THEN NULL ELSE '0000000000' END,
  "billStreet" = CASE WHEN "billStreet" IS NULL THEN NULL ELSE 'ul. Testowa ' || (1 + abs(hashtext(id)) % 99) END,
  "paymentRef" = NULL,
  "noteCustomer" = NULL,
  "noteAdmin" = NULL,
  "trackingNumber" = NULL,
  "trackingUrl" = NULL;

UPDATE "NewsletterSubscriber" SET email = 'news-' || left(md5(id), 10) || '@example.test';
UPDATE "ContactMessage" SET
  name = 'Jan Klient', email = 'kontakt-' || left(md5(id), 10) || '@example.test',
  subject = 'Wiadomość testowa', message = 'Treść usunięta przy anonimizacji.';
UPDATE "Withdrawal" SET name = 'Jan Klient', email = 'zwrot-' || left(md5(id), 10) || '@example.test';
UPDATE "Review" SET "authorName" = 'Klient ' || left(md5(id), 4);

COMMIT;

# wellbotany

online shop for herbs, supplements and organic food in Poland. it has a storefront, checkout,
customer accounts and an admin panel. the shop is in Polish only.

live at [wellbotany.pl](https://wellbotany.pl). the admin panel runs on its own host.

## features

| area      | what it does                                                                                              |
| :-------- | :-------------------------------------------------------------------------------------------------------- |
| catalog   | categories, brands, ingredients, tags, search, favorites, a glossary and guides                           |
| checkout  | pickup points, courier or in-store pickup; Przelewy24 (BLIK, cards, Apple/Google Pay), bank transfer, cash on pickup; coupons |
| gift sets | ready-made sets and a builder for custom ones                                                             |
| accounts  | order history, saved addresses, reviews from verified buyers, online withdrawal from a purchase           |
| marketing | newsletter with a welcome code, Google Ads and Meta conversions, Google Merchant Center feed              |
| admin     | products, stock, orders, shipments, bank transfer matching, coupons, reviews, margins, Subiekt report     |

## how it works

checkout runs in one database transaction. the order number, stock and coupon limits are
updated with conditional writes, so the shop cannot sell more than it has. a cart value
discount and a coupon never stack, the bigger one wins.

Postgres triggers record every price change and keep the lowest price of the last 30 days,
as the EU Omnibus directive requires. every crossed-out price and discount percentage
is counted from that price.

the order confirmation email contains the full pre-contract information and the
withdrawal form. a purchase can also be withdrawn online at `/odstapienie`.

online payments go through Przelewy24. the webhook checks the signature and the amount,
then verifies the payment with Przelewy24. a failed or abandoned payment can be retried
from the order page; each attempt gets its own session id.

an order paid in advance ships only after payment. if it is still unpaid after 3 working
days, a daily job emails a reminder with 7 more days and a signed link to pay. the shop
gets a summary and a note when that time runs out.

the cookie banner asks for consent per category and stores it on the server. Google tags
load only after consent, with Consent Mode v2. Meta gets events only from the server,
through the Conversions API, without product data.

checkout, account and admin pages use a strict content security policy with a nonce per request.
other pages stay static. order pages are protected by a signed cookie, and forms are
rate limited in Redis. admin accounts need a TOTP code.

shipments, labels and pickup points go through epaka.pl. the pickup point map is drawn with
Leaflet behind a server proxy.

stock and the product catalog (purchase price, price levels, VAT, weight, supplier) come
from the shop's Subiekt GT. a separate Windows service,
[xylem](https://github.com/danylo-morhun/xylem) (private), reads it and sends it to
`/api/sync/subiekt/*`. purchase prices flow into products with guards against big jumps;
sale prices are never changed automatically.

price and stock go to Google Merchant Center after every edit in the admin panel
and once a day.

## hosting

one VPS (Ubuntu 24.04) runs nginx, the Next.js app under systemd, PostgreSQL 18 and Redis 7.
`deploy/vps` holds the scripts and units:

| what         | how                                                                                      |
| :----------- | :--------------------------------------------------------------------------------------- |
| releases     | `wb-deploy` builds each commit in its own directory and switches a symlink; rollback in a second |
| after deploy | every sitemap URL is rendered once, so the page cache is warm                            |
| backups      | nightly `pg_dump`, copied encrypted to Backblaze B2 (EU) and to a second machine        |
| timers       | Merchant resync, payment reminders, certificate renewal, security updates                |
| health       | `/api/health` checks the database, Redis and backup age                                   |

## stack

Next.js 16, React 19, Prisma 5, PostgreSQL 18, Redis 7, Auth.js, Tailwind 4, Przelewy24,
Resend, Cloudinary, Sentry, epaka.pl.

## CI

| when         | what runs                                                                                 |
| :----------- | :---------------------------------------------------------------------------------------- |
| pull request | Biome, type check, Vitest, build against Postgres built from the migrations, schema drift check |
| every night  | deploy of new commits on main: migrations, build on the VPS, smoke test, rollback          |
| every 30 min | uptime check: pages, `/api/health`, shop agent heartbeat                                   |

migrations run only when they changed and need manual approval.
an urgent fix can be deployed by hand from the Actions tab.

## run locally

requires Node 24, pnpm 10 and PostgreSQL 18. Redis is optional.

```bash
pnpm install
cp .env.example .env.local    # local database only, never production
pnpm db:generate
pnpm exec prisma migrate deploy
pnpm dev
```

the app runs on port 3000. `pnpm test` runs Vitest. `pnpm test:e2e` runs Playwright and
needs a local database, because the tests create and delete rows. maintainers can load an
anonymized copy of production with `scripts/dev-db/refresh.sh`.

## license

all rights reserved, see [LICENSE](LICENSE). the source is public to read, not to reuse.
brand assets, product photos and texts belong to their owners.

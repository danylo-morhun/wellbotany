# wellbotany

online shop for herbs, supplements and organic food in Poland. it has a storefront, checkout,
customer accounts and an admin panel. the shop is in Polish only.

live at [wellbotany.pl](https://wellbotany.pl).

## features

| area      | what it does                                                                                    |
| :-------- | :---------------------------------------------------------------------------------------------- |
| catalog   | categories, brands, ingredients, tags, search, favorites, a glossary and guides                 |
| checkout  | delivery to pickup points or by courier, bank transfer or cash on pickup, coupons               |
| gift sets | ready-made sets and a builder for custom ones                                                   |
| accounts  | order history, saved addresses, reviews from verified buyers, online withdrawal from a purchase |
| marketing | newsletter with a welcome code, Google Ads and Meta conversions, Google Merchant Center feed    |
| admin     | products, stock, orders, bank transfer matching, coupons, reviews, margins report, content      |

## how it works

checkout runs in one database transaction. the order number, stock and coupon limits are
updated with conditional writes, so the shop cannot sell more than it has. a cart value
discount and a coupon never stack, the bigger one wins.

Postgres triggers record every price change and keep the lowest price of the last 30 days,
as the EU Omnibus directive requires. every crossed-out price and discount percentage
is counted from that price.

the order confirmation email contains the full pre-contract information and the
withdrawal form. a purchase can also be withdrawn online at `/odstapienie`.

Przelewy24 payments are built but turned off. they turn on with `P24_ENABLED=true`.
the webhook checks the signature, the amount, and then verifies the payment with Przelewy24.

the cookie banner asks for consent per category and stores it on the server. Google tags
load only after consent, with Consent Mode v2. Meta gets events only from the server,
through the Conversions API, without product data.

checkout, account and admin pages use a strict content security policy with a nonce per request.
other pages stay static. order pages are protected by a signed cookie, and forms are
rate limited with Upstash.

shipments, labels and pickup points go through epaka.pl. the pickup point map is drawn with
Leaflet behind a server proxy.

stock comes from the shop's Subiekt GT. a separate Windows service,
[xylem](https://github.com/danylo-morhun/xylem) (private), sends it to `/api/sync/subiekt/stock`.

price and stock go to Google Merchant Center after every edit in the admin panel
and once a day by cron.

## stack

Next.js 16, React 19, Prisma, PostgreSQL 18, Auth.js, Tailwind 4, Resend, Cloudinary,
Sentry, Upstash. self-hosted on a VPS (nginx, systemd).

## CI

| when         | what runs                                                                     |
| :----------- | :---------------------------------------------------------------------------- |
| pull request | Biome, type check, Vitest, build against a throwaway Postgres                 |
| every night  | deploy of new commits on main over SSH: migrations, build, smoke test, rollback |
| every 30 min | uptime check                                                                  |

migrations run only when they changed and need manual approval.
an urgent fix can be deployed by hand from the Actions tab.

## run locally

requires Node 24 and pnpm 10.

```bash
pnpm install
cp .env.example .env    # point DATABASE_URL at a dev branch, never at production
pnpm db:generate
pnpm exec prisma migrate deploy
pnpm dev
```

the app runs on port 3000. `pnpm test` runs Vitest. `pnpm test:e2e` runs Playwright and
needs a non-production `DATABASE_URL`, because the tests create and delete rows.

## license

MIT

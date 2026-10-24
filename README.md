# Well Botany

[![CI](https://github.com/danylo-morhun/wellbotany/actions/workflows/ci.yml/badge.svg)](https://github.com/danylo-morhun/wellbotany/actions/workflows/ci.yml)

Online shop for supplements, herbs and organic food in Poland: storefront, checkout, customer accounts and an admin panel. Polish only.

[wellbotany.pl](https://wellbotany.pl)

Also inside: gift-set builder, verified-buyer reviews, newsletter with a welcome code, guides, epaka shipments and labels, bank-transfer matching, margins report.

## How it works

- **Checkout** — one DB transaction: atomic order number, stock and coupon limits as conditional updates, so nothing oversells. A cart-value discount („-5% od 150 zł”) and coupons never stack — the bigger one wins
- **Prices (EU Omnibus)** — Postgres triggers log every price change and keep the 30-day low; every strikethrough and % goes through one helper that counts from that low
- **Consumer law** — order confirmation e-mail carries the full pre-contract info, withdrawal notice and form; online withdrawal at `/odstapienie` with an acknowledgement e-mail
- **Payments** — bank transfer and pay-at-pickup are live; Przelewy24 is built behind a flag (webhook checks the SHA-384 signature in constant time, the amount, then verifies with P24)
- **Consent and ads** — cookie banner with equal buttons and per-category consent, logged server-side; Google tags load only after consent (Consent Mode v2, no remarketing); Meta only via server-side Conversions API without product data
- **Security** — strict CSP with per-request nonces on checkout, account and admin; other pages stay static; signed cookie for order pages; rate limits via Upstash
- **Shipping** — epaka.pl for pickup points, shipments and labels; own Leaflet point map behind a server proxy
- **Stock** — the shop's Subiekt GT stock is pushed by a separate Windows agent ([xylem](https://github.com/danylo-morhun/xylem), private) to `/api/sync/subiekt/stock`
- **Merchant Center** — price and stock pushed on every admin edit, plus a daily cron; JWT signed with `node:crypto`, no SDK
- **CI/CD** — each CI run gets its own Neon branch; deploy runs migrations only when they changed (with approval), smoke-tests, and rolls back on failure

## Stack

Next.js 16, React 19, Prisma, Neon Postgres, Auth.js, Tailwind 4, Resend, Cloudinary, Sentry, Upstash, Vercel.

## Run locally

Needs Node 24 and pnpm 10.

```bash
pnpm install
cp .env.example .env   # point DATABASE_URL at a dev branch, never production
pnpm db:generate
pnpm exec prisma migrate deploy
pnpm dev               # http://localhost:3000
```

Tests: `pnpm test` (Vitest), `pnpm test:e2e` (Playwright — builds and starts the app on :3000, or reuses whatever already runs there; needs `DATABASE_URL` of a non-production DB).

## License

MIT

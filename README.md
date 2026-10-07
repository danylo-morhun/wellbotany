# Well Botany

[![CI](https://github.com/danylo-morhun/wellbotany/actions/workflows/ci.yml/badge.svg)](https://github.com/danylo-morhun/wellbotany/actions/workflows/ci.yml)

Online shop for herbs and supplements in Poland: storefront, checkout, customer accounts, and an admin panel.

Also inside: gift-set builder, verified-buyer reviews, newsletter coupons, guides, shipping labels, bank-transfer matching.

## How it works

- **Checkout** — one DB transaction: atomic order number, stock and coupon limits as conditional updates, so nothing oversells
- **Payments** — Przelewy24 webhook checks the SHA-384 signature in constant time and the amount, then verifies with P24 (behind a flag; bank transfer is live)
- **Price history** — Postgres triggers log every price change and keep the 30-day low (EU Omnibus), even for imports
- **Security** — strict CSP with per-request nonces on checkout, account, and admin; other pages stay static; signed cookie for order pages; rate limits via Upstash
- **Shipping** — epaka.pl for pickup points, shipments, and labels; own Leaflet map behind a server proxy
- **Merchant Center** — price and stock pushed on every admin edit, plus a daily cron; JWT signed with `node:crypto`, no SDK
- **CI/CD** — each CI run gets its own Neon branch; deploy runs migrations only when they changed (with approval), smoke-tests, and rolls back on failure

## Stack

Next.js 16, React 19, Prisma, Neon Postgres, Auth.js, Tailwind 4, Resend, Cloudinary, Sentry, Vercel.

## Run locally

Needs Node 24 and pnpm 10.

```bash
pnpm install
cp .env.example .env   # point DATABASE_URL at a dev branch, never production
pnpm db:generate
pnpm exec prisma migrate deploy
pnpm dev               # http://localhost:3000
```

Tests: `pnpm test` (Vitest), `pnpm test:e2e` (Playwright).

## License

MIT

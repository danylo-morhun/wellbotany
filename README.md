# Well Botany — E-Commerce Platform

[![CI Pipeline](https://github.com/danylo-morhun/zielarnia/actions/workflows/ci.yml/badge.svg)](https://github.com/danylo-morhun/zielarnia/actions/workflows/ci.yml)
[![Next.js 16](https://img.shields.io/badge/Next.js-16_App_Router-black?logo=next.js)](https://nextjs.org/)
[![React 19](https://img.shields.io/badge/React-19-blue?logo=react)](https://react.dev/)
[![Prisma ORM](https://img.shields.io/badge/Prisma-PostgreSQL-2D3748?logo=prisma)](https://www.prisma.io/)
[![Przelewy24](https://img.shields.io/badge/Payments-Przelewy24_BLIK_ApplePay-0070BA)](https://www.przelewy24.pl/)
[![BaseLinker](https://img.shields.io/badge/Integration-BaseLinker_Hub-FF6600)](https://baselinker.com/)
[![Biome](https://img.shields.io/badge/Biome-Code_Quality-60A5FA?logo=biome)](https://biomejs.dev/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5-3178C6?logo=typescript)](https://www.typescriptlang.org/)

A production e-commerce platform specializing in bio-products, dietary supplements, and health items. Built with **Next.js 16 (React 19)**, **Prisma ORM**, **Neon Serverless PostgreSQL**, **Przelewy24 Gateway**, and a **BaseLinker Integration Hub**.

---

## System Architecture

```mermaid
graph TD
    subgraph Client ["Client Layer (Shop Frontend)"]
        UI["shadcn/ui + Tailwind CSS 4"]
        Geo["InPost Paczkomaty Geowidget"]
    end

    subgraph Storefront ["Next.js 16 App Router"]
        ServerActions["Next-Safe Server Actions"]
        Cart["Cart & Checkout Engine"]
        Webhook["Przelewy24 Webhook Handler (HMAC-SHA384)"]
    end

    subgraph Infra ["Backend & Storage"]
        DB[(Neon PostgreSQL + Prisma ORM)]
        Redis[(Upstash Redis Rate Limiter)]
        Sentry[Sentry Error Tracking]
    end

    subgraph External ["Integrations & Logistics"]
        P24[Przelewy24 Payment Gateway]
        BL[BaseLinker API Stock & Order Hub]
        Couriers[InPost / DHL / DPD Labels]
        Allegro[Allegro Marketplace Sync]
    end

    Client --> UI & Geo
    UI --> ServerActions
    ServerActions --> Cart & DB & Redis
    P24 --> Webhook
    Webhook --> DB
    Webhook --> BL
    BL --> Couriers & Allegro
    ServerActions --> Sentry
```

---

## Key Engineering & Security Specs

### 1. Financial Webhook Integrity & Timing-Safe Security
- **HMAC-SHA384 Verification**: Przelewy24 payment webhooks are verified using cryptographic SHA-384 signature hashes.
- **Timing-Safe Comparison**: Webhook signature verification uses constant-time byte comparisons to eliminate side-channel timing attacks.
- **Idempotent Order Transitions**: State transitions from `PENDING` to `PAID` are wrapped in atomic database transactions, preventing double-processing on network retries.

### 2. Multi-Channel Logistics & Stock Sync (BaseLinker Hub)
- **Real-Time Stock Sync**: Inventory levels are synced bi-directionally between PostgreSQL, BaseLinker, and marketplace channels (Allegro).
- **Automated Parcel Labels**: Direct integration with InPost Paczkomaty Geowidget generates shipping labels automatically upon order payment completion.

### 3. Health & Regulatory Compliance (GIS / Sanepid)
- Dedicated database modeling for dietary supplement labeling, active ingredients, dosage warnings, and Sanepid/GIS regulatory health claim compliance.
- Strict XSS protection using `sanitize-html` for product descriptions and rich-text specifications.

---

## Technical Decisions & Trade-Offs

| Engineering Choice | Alternative Considered | Rationale & Architectural Trade-off |
| :--- | :--- | :--- |
| **Prisma ORM + Neon** | Drizzle / TypeORM | Selected Prisma for strong type generation across complex e-commerce relational schemas (Orders, Variants, Coupons, Customers, Audit Logs). |
| **Next-Safe-Action** | Native `useActionState` | Provides type-safe server action inputs/outputs with built-in Zod schema validation and global error handling. |
| **Upstash Redis** | Self-hosted Redis | Serverless rate limiting (`@upstash/ratelimit`) on checkout endpoints and API routes without managing infrastructure. |
| **Ephemeral Neon Branches in CI** | Shared Staging DB | GitHub Actions dynamically provisions an isolated Neon Postgres branch per CI run to test migrations and E2E checkout flows safely without race conditions. |

---

## Testing & Quality Assurance

- **Unit Tests (Vitest)**: Tests financial calculations, Przelewy24 HMAC signatures, timing-safe string comparison, and supplier product import parsers.
- **Integration & E2E (Playwright)**: End-to-end tests for product filtering, cart management, coupon redemption, and checkout flows.
- **Ephemeral Database Testing**: CI spins up isolated Neon Postgres branches automatically for every PR run.

### Running Tests Locally

```bash
# Run Unit Tests
pnpm exec vitest run tests/unit

# Run Typecheck & Biome Linter
pnpm tsc --noEmit
pnpm lint
```

---

## Local Setup

### 1. Clone & Install
```bash
git clone git@github.com:danylo-morhun/zielarnia.git
cd zielarnia
pnpm install
```

### 2. Database Migration & Development Server
```bash
# Generate Prisma Client & Run Migrations
pnpm db:generate
pnpm db:migrate

# Start Next.js dev server
pnpm dev
```
Open [http://localhost:3000](http://localhost:3000) in your browser.

---

## License

MIT © Danylo Morhun

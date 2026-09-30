## What

<!-- one or two lines -->

## Why

<!-- problem / ticket / Sentry issue -->

## Verification

- [ ] `pnpm tsc --noEmit` and `pnpm biome check .`
- [ ] `pnpm exec vitest run tests/unit`
- [ ] UI / checkout touched → e2e on the dev DB (`docs` backlog §1 recipe)
- [ ] DB migration → tested on a Neon branch, rollback noted

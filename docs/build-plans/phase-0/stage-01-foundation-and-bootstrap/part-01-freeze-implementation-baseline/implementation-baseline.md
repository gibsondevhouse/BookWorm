# Implementation Baseline

## Frozen Choices For Phase 0

- deployment shape: single deployable monorepo application
- frontend layer: Next.js
- backend layer: Express.js with TypeScript
- persistence: PostgreSQL with Prisma
- auth baseline: server-managed sessions with secure cookies
- first representative vertical slice: Character

## Initial Repository Map

```text
apps/
  api/
    src/
  web/
    src/
config/
docs/
prisma/
scripts/
storage/
  adapters/
tests/
```

## Mandatory Phase 0 Environment Variables

- `NODE_ENV`
- `PORT`
- `CORS_ORIGIN`
- `DATABASE_URL`
- `SESSION_SECRET`

## Service Names And Port Map

- app: frontend on `3000`, API on `4000`
- postgres: `5432`

## Health Expectations

- app: `GET /health` returns service metadata
- postgres: `pg_isready` succeeds

# Slot Machine API

A TypeScript slot machine API designed to run on **Vercel Serverless Functions**.

## API Endpoints

- `GET /api/health` - Health check
- `POST /api/spin` - Spin the slot machine with `{"bet": 5}`
- `OPTIONS /api/spin` - CORS preflight

## Quick Start

```bash
# 1. Install dependencies
corepack pnpm install

# 2. Run tests + build
corepack pnpm test --runInBand
corepack pnpm build

# 3. Run local Vercel runtime
corepack pnpm dev:vercel
```

## Vercel Configuration

Create a `.env` (or configure these in Vercel Project Settings):

```bash
MAX_BET_AMOUNT=100
JACKPOT_MULTIPLIER=1000
CORS_ORIGINS=*
RATE_LIMIT=100
DEBUG_MODE=true
```

Optional:

```bash
ENVIRONMENT=dev
API_KEYS_JSON={"service":"token"}
```

## Deployment

```bash
# Login once
npx vercel login

# Deploy to production
corepack pnpm deploy:vercel
```

## Local Development (non-Vercel)

```bash
# Express adapter (legacy local mode)
corepack pnpm dev

# Lambda simulator (legacy local mode)
corepack pnpm dev:lambda
```

## Testing and Quality

```bash
corepack pnpm test --runInBand
corepack pnpm build
corepack pnpm lint
```

## Notes

- The core game logic is framework-agnostic under `src/core/`.
- Vercel handlers live in `api/`.
- Legacy AWS deployment scripts remain in `scripts/` for compatibility, but Vercel is the primary hosting target.

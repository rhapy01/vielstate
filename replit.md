# Vielstate (ShieldCap)

A fractional real-estate investing platform: buy ownership shares, earn income, trade on a secondary market, and manage from one dashboard. **Confidential investing** — powered by Zama fhEVM — is the differentiator: balances, transfers, and dividend payouts stay encrypted on-chain.

The live demo uses **Kampala Heights Apartments** ($5M, 50,000 shares) as a sample listing on Sepolia testnet.

## Run & Operate

- `pnpm --filter @workspace/api-server run dev` — run the API server (port 5000)
- `pnpm run typecheck` — full typecheck across all packages
- `pnpm run build` — typecheck + build all packages
- `pnpm --filter @workspace/api-spec run codegen` — regenerate API hooks and Zod schemas from the OpenAPI spec
- `pnpm --filter @workspace/db run push` — push DB schema changes (dev only)
- Required env: `DATABASE_URL` — Postgres connection string

## Stack

- pnpm workspaces, Node.js 24, TypeScript 5.9
- Frontend: React + Vite, Tailwind CSS, Wouter routing, TanStack Query
- API: Express 5
- DB: PostgreSQL + Drizzle ORM
- Validation: Zod (`zod/v4`), `drizzle-zod`
- API codegen: Orval (from OpenAPI spec)
- Build: esbuild (CJS bundle)
- Contracts: Solidity 0.8.24 + Zama fhEVM

## Where things live

- `artifacts/shieldcap/` — React/Vite frontend at `/`
- `artifacts/api-server/` — Express API at `/api`
- `lib/db/` — Drizzle schema + migrations
- `lib/api-spec/` — OpenAPI spec (source of truth for API contract)
- `lib/api-client-react/` — Generated React Query hooks
- `lib/api-zod/` — Generated Zod schemas
- `lib/contracts/` — Solidity smart contracts (ShieldCapProperty.sol)

## Architecture decisions

- **Contract-first API**: OpenAPI spec in `lib/api-spec/openapi.yaml` drives codegen for both frontend hooks and server Zod validators. Never write types by hand.
- **On-chain Sepolia FHEVM**: Frontend uses MetaMask + `@zama-fhe/relayer-sdk` for real encrypt/decrypt and contract calls. Backend stores public event metadata only.
- **Encrypted balance blur**: Investor balances shown as blurred ciphertext until the user clicks "Decrypt" — simulating fhevmjs re-encryption UX.
- **20% cap via FHE**: `TFHE.le(newBalance, maxAllowed)` enforces the cap without revealing investor balances. CapRejected events are public; amounts are not.
- **Dividend computation**: `TFHE.div(TFHE.mul(encBalance, encRevenue), TOTAL_SHARES)` — fully encrypted proportional payout.

## Product

- **Explore / Listings** — browse fractional real estate; invest in shares
- **Portfolio** — manage holdings, dividends, and performance (confidential balances decrypt on demand)
- **Secondary Market** — list and buy shares P2P
- **Dashboard / Property** — public property metrics, transaction feed, dividend history
- **Purchase** — buy shares on Sepolia (amounts encrypted on-chain via Zama)

## Deploying the Contract

See `lib/contracts/README.md` for Sepolia deployment. After deploying, seed `contract_config` via `pnpm --filter @workspace/scripts run seed`.

## User preferences

_Populate as you build — explicit user instructions worth remembering across sessions._

## Gotchas

- Run `pnpm run typecheck:libs` before leaf artifact typechecks — the DB and API libs must emit declarations first.
- Google Fonts `@import url(...)` MUST be the first line of `index.css`, before `@import "tailwindcss"`.
- API routes import table names like `propertyTable`, `transactionEventTable` etc. directly from `@workspace/db`.
- The `useTriggerDividendDistribution` and `useRegisterInvestor` hooks are exported as `const` (not `function`) from the generated client — both are valid to import.

## Pointers

- See the `pnpm-workspace` skill for workspace structure, TypeScript setup, and package details

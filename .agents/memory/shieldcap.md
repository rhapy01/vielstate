---
name: ShieldCap project
description: Vielstate — fractional real-estate investing platform (invest, earn, trade, manage). Confidential positions via Zama fhEVM are the differentiator, not the product itself. Key conventions, gotchas, and decisions.
---

## Key decisions

- **CSS import order**: Google Fonts `@import url(...)` must be the FIRST line of index.css, before `@import "tailwindcss"`. PostCSS silently breaks otherwise.
- **DB lib build**: Always run `pnpm run typecheck:libs` before leaf artifact typechecks. The `@workspace/db` lib must emit declarations before `@workspace/api-server` can resolve its table types.
- **Mutation hooks**: `useTriggerDividendDistribution` and `useRegisterInvestor` are exported as `const` (not `function`) from the generated client — both are valid imports from `@workspace/api-client-react`.
- **Zod schemas for mutation bodies**: `TriggerDividendDistributionBody` and `RegisterInvestorBody` live in `@workspace/api-zod` and are used to validate POST bodies in API routes.
- **On-chain Sepolia FHEVM**: Frontend uses `@zama-fhe/relayer-sdk` + MetaMask for real encrypt/decrypt and contract calls. Contract must be deployed and seeded in `contract_config`.
- **DB table exports**: All table names (`propertyTable`, `transactionEventTable`, `dividendRoundTable`, `investorTable`, `investorDividendRecordTable`, `contractConfigTable`) are exported from `@workspace/db`.

**Why:** These were non-obvious integration points that caused typecheck failures and silent breakage during development.

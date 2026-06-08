# ShieldCap Smart Contracts

Solidity contracts for the ShieldCap confidential real-estate platform on **Zama FHEVM (Sepolia testnet)**.

## Deploy to Sepolia

```bash
# Install dependencies
pnpm --filter @workspace/contracts install

# Compile
pnpm --filter @workspace/contracts run compile

# Deploy (requires DEPLOYER_PRIVATE_KEY and Sepolia ETH)
DEPLOYER_PRIVATE_KEY=0x... pnpm --filter @workspace/contracts run deploy:sepolia
```

## After Deployment

`deploy:sepolia` automatically:

1. Writes addresses to `lib/addresses/src/address.ts` and frontend ABIs.
2. **Clears and reseeds the database** when `DATABASE_URL` is set in repo-root `.ENV` (wipes old txs, dividends, investors; inserts fresh `property` + `contract_config`).

Manual DB reset anytime: `pnpm run db:reset` from repo root.

### Verify on Etherscan

Add `ETHERSCAN_API_KEY` to repo-root `.ENV`, then:

```bash
pnpm --filter @workspace/contracts run verify:sepolia
```

Contract addresses are **not** stored in `.ENV`. The frontend and API read from `lib/addresses/src/address.ts`.

## Network

- **Chain**: Sepolia (11155111)
- **FHE SDK**: `@zama-fhe/relayer-sdk` with `SepoliaConfig`
- **RPC**: https://ethereum-sepolia-rpc.publicnode.com

## Contracts

### `ConfidentialTestUSDC.sol` (ctUSDC)
Zama-style confidential payment token. Balances and transfer amounts are encrypted (`euint64`).

### `ShieldCapProperty.sol`

| Function | Description |
|---|---|
| `purchaseShares` | Primary buy — encrypted share amount; confidential ctUSDC pull to contract |
| `createSecondaryListing` | FCFS resale — list encrypted share lot at public price/share |
| `buySecondaryListing` | Partial fill at listing price; ctUSDC paid seller-to-buyer |
| `distributeDividend` | Owner pulls confidential ctUSDC from their wallet into escrow; encrypted payouts accrue per investor |
| `claimDividend` | Investor claims accrued payout from contract escrow (ctUSDC transfer, not mint) |
| `balanceOfProperty` | Encrypted share balance per property |
| `dividendOf` | Encrypted accrued dividend per investor |

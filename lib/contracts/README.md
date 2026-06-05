# ShieldCap Smart Contracts

Solidity contracts for the ShieldCap confidential real-estate ownership platform, built on [Zama fhEVM](https://docs.zama.ai/fhevm).

## Contracts

### `ShieldCapProperty.sol`

The core property contract. Key properties:

| Concern | Implementation |
|---|---|
| Share balances | `mapping(address => euint64)` — fully encrypted |
| Ownership cap (20%) | `TFHE.le(newBalance, maxAllowed)` — FHE comparison |
| Transfers | `TFHE.select(canTransfer, ...)` — no plaintext branching |
| Dividend payouts | `TFHE.div(TFHE.mul(bal, rev), total)` — encrypted arithmetic |
| Decrypt access | `TFHE.allow(handle, investor)` — per-wallet ACL |

## Getting Started

```bash
# Install dependencies
pnpm --filter @workspace/contracts install

# Compile
pnpm --filter @workspace/contracts run compile

# Test (with Zama fhevm mock plugin)
pnpm --filter @workspace/contracts run test

# Deploy to Zama Devnet
DEPLOYER_PRIVATE_KEY=0x... pnpm --filter @workspace/contracts run deploy:zama
```

## Zama Network

- **Chain ID**: 9000
- **RPC**: https://devnet.zama.ai
- **Explorer**: https://explorer.devnet.zama.ai
- **Faucet**: https://faucet.zama.ai

## After Deployment

Update the `contract_config` table to point the API to your deployed contract:

```sql
INSERT INTO contract_config (contract_address, network_id, network_name, abi)
VALUES ('0xYOUR_DEPLOYED_ADDRESS', 9000, 'Zama Devnet', '...');
```

The frontend will automatically load the contract address and ABI from the API.

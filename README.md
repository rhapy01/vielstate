# Vielstate

Vielstate is a platform for investing in fractional real estate.

Instead of purchasing an entire property, investors can buy ownership shares in professionally managed real estate, earn a portion of generated income, and trade their shares through an integrated marketplace.

The platform combines real estate investing, portfolio management, income distribution, and secondary-market liquidity into a single experience.

**Try the demo:** https://vielstate.vercel.app

### How It Works

**Invest** — Purchase fractional ownership shares in listed properties.

**Earn** — Receive your share of property-generated income.

**Trade** — Buy and sell ownership shares through the marketplace.

**Manage** — Track your investments and performance from one dashboard.

### Built for Confidential Investing

Traditional blockchains expose balances, transactions, and investment activity to anyone.

Vielstate uses confidential blockchain technology powered by **Zama** to keep ownership positions, transactions, and returns private while preserving the benefits of on-chain infrastructure.

### Real Estate Ownership, Reimagined

Access property investments. Earn income. Trade when you choose.

Without exposing your financial position to the world.

---

## Demo listing

**Kampala Heights Apartments**, Nakasero, Kampala, Uganda

- **50,000** total shares  
- **1 tUSDC** per share (testnet)  
- **20%** maximum ownership per wallet  

---

## Try the demo

The live demo runs on **Sepolia testnet**: real wallet, real transactions, test ETH only.

1. Install [MetaMask](https://metamask.io).
2. Open the [demo app](https://vielstate.vercel.app).
3. Connect your wallet (the app switches you to Sepolia).
4. Get test ETH from a [Sepolia faucet](https://sepoliafaucet.com) if needed.
5. Tap **See Demo** or go to **Purchase** to buy a few shares.
6. Open **Portfolio** → **Decrypt** to view your private balance.

> The demo is the full product on testnet. No real money is involved.

---

## Confidential investing (differentiator)

Vielstate is a fractional real estate platform first. What sets it apart is **confidential blockchain technology** powered by **Zama** — your positions, transactions, and returns stay private on-chain.

- **Public:** property details, event types (purchase, transfer, dividend), transaction hashes.  
- **Private:** share balances, transfer amounts, dividend payouts (encrypted on-chain; only your wallet can decrypt your numbers).  
- **We never see your keys.** Decryption happens in your browser with your wallet signature.

---

## FAQ

**Why can’t I see other investors’ balances?**  
By design. Holdings are stored as encrypted values. Only each owner can decrypt their own.

**What network do I need?**  
Sepolia (chain ID `11155111`). The app prompts MetaMask to switch automatically.

**Is this real estate?**  
The listed asset is a fractional ownership model on testnet. Shares represent a structured stake in the property offering, not a traditional land title.

**Why does the homepage show a property value with zero investors?**  
The dollar figure is the **listed valuation** of Kampala Heights (seeded property metadata), not money raised from investors. Investor count tracks wallets with on-chain activity.

**How do I pay for shares?**  
Share purchases use **test USDC (tUSDC)** at 1 token per share. Tap **Claim tUSDC** on the dashboard or purchase page (500 per wallet every 24 hours).

**Something failed?**  
Check you’re on Sepolia, have test ETH, and approved the transaction in MetaMask. Refresh and try again.

---

## For developers

Technical setup, contracts, and local run instructions live in [`replit.md`](replit.md) and [`lib/contracts/README.md`](lib/contracts/README.md).

Verified contracts (Sepolia):
- ShieldCapProperty: [0x3D74942B44E5Ea09995b8fdFe88E2d1157e4A6d4](https://sepolia.etherscan.io/address/0x3D74942B44E5Ea09995b8fdFe88E2d1157e4A6d4#code)
- ConfidentialTestUSDC (ctUSDC): [0xcac97D7cB93fa8251caA9D47E85b89c0BdDd215e](https://sepolia.etherscan.io/address/0xcac97D7cB93fa8251caA9D47E85b89c0BdDd215e#code)

---

## Contact & feedback

Building in the open. Issues and ideas welcome via your project repository.

*Vielstate: fractional real estate investing — with confidential positions powered by Zama.*

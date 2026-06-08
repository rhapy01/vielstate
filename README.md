# Vielstate

**Own property. Keep your position private.**

Vielstate is fractional real-estate investing where your share balance, transfers, and dividend payouts stay encrypted on the blockchain. Other people can see that activity happened, not how much you own or moved.

**Try the demo:** https://vielstate.vercel.app

---

## What you can do

| Action | What it means for you |
|--------|------------------------|
| **Buy shares** | Purchase a slice of a listed property. Your share count is encrypted before it reaches the chain. |
| **View portfolio** | Connect your wallet and decrypt **only your** balance and ownership percentage. |
| **Transfer shares** | Send shares to another wallet privately. The amount stays hidden from public view. |
| **Track the property** | See public activity (purchases, transfers, dividends) without amounts or wallet holdings exposed. |
| **Receive dividends** | When distributions run, your payout is computed on encrypted data; you decrypt your share yourself. |

---

## Current property

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

## Your privacy

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
- ShieldCapProperty: [0xF1f98668523555aFfCBba9E6025760281c5d596A](https://sepolia.etherscan.io/address/0xF1f98668523555aFfCBba9E6025760281c5d596A#code)
- ConfidentialTestUSDC (ctUSDC): [0x8dffeB22EBc2D8d5b2b35cD3abc2B2818eFF3758](https://sepolia.etherscan.io/address/0x8dffeB22EBc2D8d5b2b35cD3abc2B2818eFF3758#code)

---

## Contact & feedback

Building in the open. Issues and ideas welcome via your project repository.

*Vielstate: private fractional property ownership.*

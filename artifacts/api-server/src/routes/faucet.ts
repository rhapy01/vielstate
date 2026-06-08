import { Router } from "express";
import { Contract, JsonRpcProvider, Wallet, parseUnits } from "ethers";
import { z } from "zod";
import { TEST_USDC_ADDRESS } from "@workspace/addresses";

const router = Router();

const SEPOLIA_CHAIN_ID = 11155111;
const FAUCET_USDC_AMOUNT = "500";
const COOLDOWN_MS = 24 * 60 * 60 * 1000;

const TEST_USDC_ABI = [
  "function drip(address to, uint64 amount) external",
] as const;

const lastUsdcDripByAddress = new Map<string, number>();

const FaucetBody = z.object({
  walletAddress: z.string().regex(/^0x[0-9a-fA-F]{40}$/),
});

function cooldownError(hoursLeft: number) {
  return `You can request again in about ${hoursLeft} hour(s)`;
}

router.post("/usdc", async (req, res) => {
  const parsed = FaucetBody.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: "Invalid wallet address" });
  }

  const privateKey = process.env.DEPLOYER_PRIVATE_KEY ?? process.env.PRIVATE_KEY;
  if (!privateKey) {
    return res.status(503).json({
      error:
        "Test USDC faucet is not configured. Set DEPLOYER_PRIVATE_KEY in the server environment (local .ENV or Vercel/Render env vars).",
    });
  }

  const { walletAddress } = parsed.data;
  const normalized = walletAddress.toLowerCase();

  const lastDrip = lastUsdcDripByAddress.get(normalized);
  if (lastDrip && Date.now() - lastDrip < COOLDOWN_MS) {
    const hoursLeft = Math.ceil((COOLDOWN_MS - (Date.now() - lastDrip)) / (60 * 60 * 1000));
    return res.status(429).json({ error: cooldownError(hoursLeft) });
  }

  try {
    const rpcUrl = process.env.SEPOLIA_RPC_URL ?? "https://ethereum-sepolia-rpc.publicnode.com";
    const provider = new JsonRpcProvider(rpcUrl, SEPOLIA_CHAIN_ID);
    const wallet = new Wallet(privateKey, provider);
    const usdc = new Contract(TEST_USDC_ADDRESS, TEST_USDC_ABI, wallet);
    const amount = parseUnits(FAUCET_USDC_AMOUNT, 6);

    const tx = await usdc.drip(walletAddress, amount);
    const receipt = await tx.wait();

    lastUsdcDripByAddress.set(normalized, Date.now());

    return res.status(201).json({
      txHash: receipt?.hash ?? tx.hash,
      amountUsdc: FAUCET_USDC_AMOUNT,
      message: `Claimed ${FAUCET_USDC_AMOUNT} ctUSDC. Ready for share purchases.`,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "USDC faucet transfer failed";
    return res.status(500).json({ error: message });
  }
});

export default router;

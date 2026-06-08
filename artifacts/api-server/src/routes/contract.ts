import { readFileSync, existsSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { Router } from "express";
import {
  NETWORK_NAME,
  PAYMENT_TOKEN_DECIMALS,
  PAYMENT_TOKEN_SYMBOL,
  SEPOLIA_CHAIN_ID,
  SHIELDCAP_CONTRACT_ADDRESS,
  TEST_USDC_ADDRESS,
} from "@workspace/addresses";

const router = Router();

function loadAbiFromArtifact(): unknown[] {
  const artifactPath = path.resolve(
    path.dirname(fileURLToPath(import.meta.url)),
    "../../../lib/contracts/artifacts/src/ShieldCapProperty.sol/ShieldCapProperty.json",
  );
  if (!existsSync(artifactPath)) {
    throw new Error(`Contract artifact not found at ${artifactPath}`);
  }
  const artifact = JSON.parse(readFileSync(artifactPath, "utf8")) as { abi: unknown[] };
  return artifact.abi;
}

function contractConfig() {
  return {
    contractAddress: SHIELDCAP_CONTRACT_ADDRESS,
    paymentTokenAddress: TEST_USDC_ADDRESS,
    paymentTokenSymbol: PAYMENT_TOKEN_SYMBOL,
    paymentTokenDecimals: PAYMENT_TOKEN_DECIMALS,
    networkId: SEPOLIA_CHAIN_ID,
    networkName: NETWORK_NAME,
    abi: loadAbiFromArtifact(),
  };
}

router.get("/config", async (_req, res) => {
  try {
    return res.json(contractConfig());
  } catch (err) {
    return res.status(503).json({
      error: err instanceof Error ? err.message : "Contract config unavailable",
    });
  }
});

export default router;

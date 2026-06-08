import { readFileSync, existsSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { sql } from "drizzle-orm";
import { db, pool } from "@workspace/db";
import { propertyTable, contractConfigTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import {
  NETWORK_NAME,
  PAYMENT_TOKEN_DECIMALS,
  PAYMENT_TOKEN_SYMBOL,
  SEPOLIA_CHAIN_ID,
  SHIELDCAP_CONTRACT_ADDRESS,
  TEST_USDC_ADDRESS,
} from "@workspace/addresses";

const PROPERTY = {
  name: "Kampala Heights Apartments",
  location: "Nakasero, Kampala, Uganda",
  description:
    "A premium mixed-use residential complex. Fractional ownership secured with Zama FHEVM on Sepolia testnet.",
  valueUsd: 5_000_000,
  totalShares: 50_000,
  pricePerShare: 1,
  imageUrl:
    "https://images.unsplash.com/photo-1545324418-cc1a3fa10c00?w=1200&h=800&fit=crop",
  status: "active",
} as const;

const freshMode =
  process.argv.includes("--fresh") ||
  process.env.DB_FRESH === "1" ||
  process.env.DB_RESET === "1";

function loadContractAbi(): string | undefined {
  if (process.env.SHIELDCAP_CONTRACT_ABI) {
    return process.env.SHIELDCAP_CONTRACT_ABI;
  }

  const artifactPath = path.resolve(
    path.dirname(fileURLToPath(import.meta.url)),
    "../lib/contracts/artifacts/src/ShieldCapProperty.sol/ShieldCapProperty.json",
  );

  if (!existsSync(artifactPath)) {
    return undefined;
  }

  const artifact = JSON.parse(readFileSync(artifactPath, "utf8")) as {
    abi: unknown;
  };
  return JSON.stringify(artifact.abi);
}

/** Wipe activity + config tables so a new deploy starts with a clean slate. */
async function resetDatabase() {
  await db.execute(sql`
    TRUNCATE TABLE
      investor_dividend_record,
      dividend_round,
      transaction_event,
      share_listing,
      on_chain_listing,
      investor,
      contract_config,
      property
    RESTART IDENTITY CASCADE
  `);
  console.log("Cleared database tables (property, contract_config, investors, txs, dividends, listings)");
}

async function insertProperty() {
  await db.insert(propertyTable).values(PROPERTY);
  console.log("Inserted property");
}

async function insertContractConfig() {
  const contractAddress = SHIELDCAP_CONTRACT_ADDRESS;
  const paymentTokenAddress = TEST_USDC_ADDRESS;
  const contractAbi = loadContractAbi();

  if (!contractAbi) {
    throw new Error(
      "No contract ABI found — compile contracts first (pnpm --filter @workspace/contracts run compile)",
    );
  }

  await db.insert(contractConfigTable).values({
    contractAddress,
    paymentTokenAddress: paymentTokenAddress ?? null,
    paymentTokenSymbol: PAYMENT_TOKEN_SYMBOL,
    paymentTokenDecimals: PAYMENT_TOKEN_DECIMALS,
    networkId: SEPOLIA_CHAIN_ID,
    networkName: NETWORK_NAME,
    abi: contractAbi,
  });
  console.log("Inserted contract_config:", contractAddress);
}

async function upsertProperty() {
  const existing = await db.select().from(propertyTable).limit(1);

  if (!existing.length) {
    await insertProperty();
    return;
  }

  await db
    .update(propertyTable)
    .set({ ...PROPERTY, updatedAt: new Date() })
    .where(eq(propertyTable.id, existing[0].id));
  console.log("Updated property (id:", existing[0].id, ")");
}

async function upsertContractConfig() {
  const contractAddress = SHIELDCAP_CONTRACT_ADDRESS;
  const paymentTokenAddress = TEST_USDC_ADDRESS;
  const contractAbi = loadContractAbi();

  if (!contractAbi) {
    console.log(
      "No contract ABI found — set SHIELDCAP_CONTRACT_ABI or compile contracts first",
    );
    return;
  }

  const existing = await db.select().from(contractConfigTable).limit(1);

  if (!existing.length) {
    await db.insert(contractConfigTable).values({
      contractAddress,
      paymentTokenAddress: paymentTokenAddress ?? null,
      paymentTokenSymbol: PAYMENT_TOKEN_SYMBOL,
      paymentTokenDecimals: PAYMENT_TOKEN_DECIMALS,
      networkId: SEPOLIA_CHAIN_ID,
      networkName: NETWORK_NAME,
      abi: contractAbi,
    });
    console.log("Inserted contract_config:", contractAddress);
    return;
  }

  await db
    .update(contractConfigTable)
    .set({
      contractAddress,
      paymentTokenAddress: paymentTokenAddress ?? null,
      paymentTokenSymbol: PAYMENT_TOKEN_SYMBOL,
      paymentTokenDecimals: PAYMENT_TOKEN_DECIMALS,
      networkId: SEPOLIA_CHAIN_ID,
      networkName: NETWORK_NAME,
      abi: contractAbi,
      updatedAt: new Date(),
    })
    .where(eq(contractConfigTable.id, existing[0].id));
  console.log("Updated contract_config:", contractAddress);
}

async function main() {
  if (freshMode) {
    await resetDatabase();
    await insertProperty();
    await insertContractConfig();
  } else {
    await upsertProperty();
    await upsertContractConfig();
  }
  await pool.end();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});

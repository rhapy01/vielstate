import hre from "hardhat";
import { execSync } from "node:child_process";
import * as fs from "fs";
import * as path from "path";

const DEFAULT_PROPERTY = {
  name: "Kampala Heights Apartments",
  location: "Nakasero, Kampala, Uganda",
  imageUri:
    "https://images.unsplash.com/photo-1545324418-cc1a3fa10c00?w=1200&h=800&fit=crop",
  description:
    "A premium mixed-use residential complex. Fractional ownership secured with Zama FHEVM on Sepolia testnet.",
  valueUsd: 5_000_000n,
  totalShares: 50_000n,
  pricePerShare: 1_000_000n, // 1 tUSDC (6 decimals)
};

async function main() {
  const [deployer] = await hre.ethers.getSigners();
  console.log("Deploying with account:", deployer.address);
  console.log("Balance:", hre.ethers.formatEther(await hre.ethers.provider.getBalance(deployer.address)), "ETH");

  const ConfidentialTestUSDC = await hre.ethers.getContractFactory("ConfidentialTestUSDC");
  const usdc = await ConfidentialTestUSDC.deploy();
  await usdc.waitForDeployment();
  const usdcAddress = await usdc.getAddress();
  console.log("ConfidentialTestUSDC deployed to:", usdcAddress);

  const ShieldCapProperty = await hre.ethers.getContractFactory("ShieldCapProperty");
  const contract = await ShieldCapProperty.deploy(usdcAddress);
  await contract.waitForDeployment();
  const contractAddress = await contract.getAddress();
  console.log("ShieldCapProperty deployed to:", contractAddress);

  const linkTx = await usdc.setShieldCap(contractAddress);
  await linkTx.wait();
  console.log("Linked ctUSDC to ShieldCapProperty");

  const tx = await contract.createProperty(
    DEFAULT_PROPERTY.name,
    DEFAULT_PROPERTY.location,
    DEFAULT_PROPERTY.imageUri,
    DEFAULT_PROPERTY.description,
    DEFAULT_PROPERTY.valueUsd,
    DEFAULT_PROPERTY.totalShares,
    DEFAULT_PROPERTY.pricePerShare,
  );
  await tx.wait();
  console.log("Primary property listed on-chain as propertyId #1");

  const network = await hre.ethers.provider.getNetwork();
  const propertyArtifactPath = path.join(
    __dirname,
    "..",
    "artifacts",
    "src",
    "ShieldCapProperty.sol",
    "ShieldCapProperty.json",
  );
  const propertyArtifact = JSON.parse(fs.readFileSync(propertyArtifactPath, "utf8"));

  const addressFilePath = path.join(__dirname, "..", "..", "addresses", "src", "address.ts");
  const addressFile = `/** Sepolia contract addresses — auto-updated by deploy-all.ts */

export const SEPOLIA_CHAIN_ID = 11155111;

export const NETWORK_NAME = "Sepolia FHEVM";

/** ConfidentialTestUSDC (ctUSDC) */
export const TEST_USDC_ADDRESS = "${usdcAddress}" as const;

/** ShieldCapProperty */
export const SHIELDCAP_CONTRACT_ADDRESS = "${contractAddress}" as const;

export const PAYMENT_TOKEN_SYMBOL = "ctUSDC" as const;
export const PAYMENT_TOKEN_DECIMALS = 6;
`;
  fs.writeFileSync(addressFilePath, addressFile, "utf8");
  console.log("Updated lib/addresses/src/address.ts");

  const abiOutPath = path.join(
    __dirname,
    "..",
    "..",
    "..",
    "artifacts",
    "shieldcap",
    "src",
    "lib",
    "shieldcap-abi.ts",
  );
  const abiOut = `/** Auto-generated from ShieldCapProperty.sol — do not edit by hand */\nexport const SHIELDCAP_ABI = ${JSON.stringify(propertyArtifact.abi, null, 2)} as const;\n`;
  fs.writeFileSync(abiOutPath, abiOut, "utf8");
  console.log("Updated artifacts/shieldcap/src/lib/shieldcap-abi.ts");

  const ctUsdcArtifactPath = path.join(
    __dirname,
    "..",
    "artifacts",
    "src",
    "ConfidentialTestUSDC.sol",
    "ConfidentialTestUSDC.json",
  );
  const ctUsdcArtifact = JSON.parse(fs.readFileSync(ctUsdcArtifactPath, "utf8"));
  const ctUsdcAbiOutPath = path.join(
    __dirname,
    "..",
    "..",
    "..",
    "artifacts",
    "shieldcap",
    "src",
    "lib",
    "test-usdc-abi.ts",
  );
  const ctUsdcAbiOut = `/** Auto-generated from ConfidentialTestUSDC.sol */\nexport const TEST_USDC_ABI = ${JSON.stringify(ctUsdcArtifact.abi, null, 2)} as const;\n`;
  fs.writeFileSync(ctUsdcAbiOutPath, ctUsdcAbiOut, "utf8");
  console.log("Updated artifacts/shieldcap/src/lib/test-usdc-abi.ts");

  const repoRoot = path.join(__dirname, "..", "..", "..");
  if (process.env.DATABASE_URL) {
    console.log("\nResetting database for new deployment...");
    try {
      execSync("npx tsx scripts/seed.ts --fresh", {
        cwd: repoRoot,
        stdio: "inherit",
        env: { ...process.env, DB_FRESH: "1" },
      });
      console.log("Database reset and seeded with new contract addresses.");
    } catch (err) {
      console.error("Database reset failed:", err instanceof Error ? err.message : err);
      process.exitCode = 1;
    }
  } else {
    console.log(
      "\nDATABASE_URL not set — skipped DB reset. Add it to .ENV at repo root to auto-clear stale data on deploy.",
    );
    console.log("Or run manually: pnpm run db:reset");
  }

  console.log("Network:", network.name, "chainId:", network.chainId.toString());
  console.log("contract_config ABI length:", JSON.stringify(propertyArtifact.abi).length);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});

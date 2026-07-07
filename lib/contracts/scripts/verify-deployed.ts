import { run } from "hardhat";
import * as fs from "fs";
import * as path from "path";

function readDeployedAddresses() {
  const addressFile = path.join(__dirname, "..", "..", "addresses", "src", "address.ts");
  const src = fs.readFileSync(addressFile, "utf8");
  const usdc = src.match(/TEST_USDC_ADDRESS = "(0x[0-9a-fA-F]{40})"/)?.[1];
  const shield = src.match(/SHIELDCAP_CONTRACT_ADDRESS = "(0x[0-9a-fA-F]{40})"/)?.[1];
  if (!usdc || !shield) {
    throw new Error("Could not parse addresses from lib/addresses/src/address.ts");
  }
  return { usdc, shield };
}

async function main() {
  if (!process.env.ETHERSCAN_API_KEY) {
    throw new Error("ETHERSCAN_API_KEY is required in .ENV at repo root");
  }

  const { usdc: TEST_USDC_ADDRESS, shield: SHIELDCAP_CONTRACT_ADDRESS } = readDeployedAddresses();
  if (!process.env.ETHERSCAN_API_KEY) {
    throw new Error("ETHERSCAN_API_KEY is required in .ENV at repo root");
  }

  console.log("Verifying ConfidentialTestUSDC at", TEST_USDC_ADDRESS);
  await run("verify:verify", {
    address: TEST_USDC_ADDRESS,
    constructorArguments: [],
  });

  console.log("Verifying ShieldCapProperty at", SHIELDCAP_CONTRACT_ADDRESS);
  await run("verify:verify", {
    address: SHIELDCAP_CONTRACT_ADDRESS,
    constructorArguments: [TEST_USDC_ADDRESS],
  });
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});

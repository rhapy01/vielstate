import { run } from "hardhat";

/** Keep in sync with lib/addresses/src/address.ts */
const TEST_USDC_ADDRESS = "0x8dffeB22EBc2D8d5b2b35cD3abc2B2818eFF3758";
const SHIELDCAP_CONTRACT_ADDRESS = "0xF1f98668523555aFfCBba9E6025760281c5d596A";

async function main() {
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

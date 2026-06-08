import { config as loadDotenv } from "dotenv";
import { existsSync } from "node:fs";
import path from "node:path";
import { HardhatUserConfig } from "hardhat/config";
import "@nomicfoundation/hardhat-toolbox";
import "@fhevm/hardhat-plugin";

function bootstrapEnv(): void {
  const root = path.resolve(__dirname, "../..");
  for (const name of [".ENV", ".env"]) {
    const file = path.join(root, name);
    if (existsSync(file)) {
      loadDotenv({ path: file, override: true });
    }
  }

  const raw = process.env.DEPLOYER_PRIVATE_KEY ?? process.env.PRIVATE_KEY;
  if (raw) {
    const trimmed = raw.trim();
    process.env.DEPLOYER_PRIVATE_KEY = trimmed.startsWith("0x")
      ? trimmed
      : `0x${trimmed}`;
  }
}

bootstrapEnv();

const config: HardhatUserConfig = {
  solidity: {
    version: "0.8.28",
    settings: {
      evmVersion: "cancun",
      optimizer: {
        enabled: true,
        runs: 200,
      },
      viaIR: true,
    },
  },
  networks: {
    sepolia: {
      url: process.env.SEPOLIA_RPC_URL ?? "https://ethereum-sepolia-rpc.publicnode.com",
      chainId: 11155111,
      accounts: process.env.DEPLOYER_PRIVATE_KEY
        ? [process.env.DEPLOYER_PRIVATE_KEY]
        : [],
    },
    hardhat: {
      chainId: 31337,
    },
  },
  paths: {
    sources: "./src",
    scripts: "./scripts",
    tests: "./test",
    cache: "./cache",
    artifacts: "./artifacts",
  },
  etherscan: {
    apiKey: process.env.ETHERSCAN_API_KEY ?? "",
  },
};

export default config;

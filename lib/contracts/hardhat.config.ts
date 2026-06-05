import { HardhatUserConfig } from "hardhat/config";
import "@nomicfoundation/hardhat-toolbox";

const config: HardhatUserConfig = {
  solidity: {
    version: "0.8.24",
    settings: {
      optimizer: {
        enabled: true,
        runs: 200,
      },
    },
  },
  networks: {
    zamaDevnet: {
      url: process.env.ZAMA_DEVNET_URL ?? "https://devnet.zama.ai",
      chainId: 9000,
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
};

export default config;

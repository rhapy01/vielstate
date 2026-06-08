import hre from "hardhat";
import * as fs from "fs";
import * as path from "path";
import { TEST_USDC_ADDRESS } from "../../addresses/src/address";

async function main() {
  const [deployer] = await hre.ethers.getSigners();
  console.log("Deploying ShieldCapProperty with account:", deployer.address);
  console.log("Balance:", (await hre.ethers.provider.getBalance(deployer.address)).toString());

  const usdcAddress = TEST_USDC_ADDRESS;

  const ShieldCapProperty = await hre.ethers.getContractFactory("ShieldCapProperty");
  const contract = await ShieldCapProperty.deploy(usdcAddress);
  await contract.waitForDeployment();

  const address = await contract.getAddress();
  const network = await hre.ethers.provider.getNetwork();

  const artifactPath = path.join(__dirname, "..", "artifacts", "src", "ShieldCapProperty.sol", "ShieldCapProperty.json");
  const artifact = JSON.parse(fs.readFileSync(artifactPath, "utf8"));

  console.log("\nShieldCapProperty deployed to:", address);
  console.log("Network:", network.name, "chainId:", network.chainId.toString());
  console.log("\nInsert into contract_config:");
  console.log(`INSERT INTO contract_config (contract_address, network_id, network_name, abi)`);
  console.log(`VALUES ('${address}', ${network.chainId}, 'Sepolia FHEVM', '${JSON.stringify(artifact.abi).replace(/'/g, "''")}');`);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});

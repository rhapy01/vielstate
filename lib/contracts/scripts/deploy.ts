import { ethers } from "hardhat";

async function main() {
  const [deployer] = await ethers.getSigners();
  console.log("Deploying ShieldCapProperty with account:", deployer.address);
  console.log("Account balance:", (await ethers.provider.getBalance(deployer.address)).toString());

  const ShieldCapProperty = await ethers.getContractFactory("ShieldCapProperty");
  const contract = await ShieldCapProperty.deploy();
  await contract.waitForDeployment();

  const address = await contract.getAddress();
  console.log("ShieldCapProperty deployed to:", address);
  console.log("Network:", (await ethers.provider.getNetwork()).name);
  console.log("\nUpdate the contract_config table in the DB:");
  console.log(`INSERT INTO contract_config (contract_address, network_id, network_name, abi)`);
  console.log(`VALUES ('${address}', 9000, 'Zama Devnet', '<ABI_JSON>');`);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});

import hre from "hardhat";

async function main() {
  const signers = await hre.ethers.getSigners();
  if (!signers.length) {
    throw new Error(
      "No deployer account. Set DEPLOYER_PRIVATE_KEY (or PRIVATE_KEY) in .ENV at the repo root.",
    );
  }

  const deployer = signers[0];
  const balance = await hre.ethers.provider.getBalance(deployer.address);

  console.log("Deployer:", deployer.address);
  console.log("Balance (wei):", balance.toString());
  console.log("Balance (ETH):", hre.ethers.formatEther(balance));
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});

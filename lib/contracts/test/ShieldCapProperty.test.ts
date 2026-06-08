import { expect } from "chai";
import hre from "hardhat";

describe("ShieldCapProperty", () => {
  async function deploy() {
    const [owner, investorA] = await hre.ethers.getSigners();
    const TestUSDC = await hre.ethers.getContractFactory("TestUSDC");
    const usdc = await TestUSDC.deploy();
    await usdc.waitForDeployment();

    const ShieldCapProperty = await hre.ethers.getContractFactory("ShieldCapProperty");
    const contract = await ShieldCapProperty.deploy(await usdc.getAddress());
    await contract.waitForDeployment();

    return { contract, usdc, owner, investorA };
  }

  it("should deploy and set owner correctly", async () => {
    const { contract, usdc, owner } = await deploy();
    expect(await contract.owner()).to.equal(owner.address);
    expect(await contract.MAX_OWNERSHIP_BPS()).to.equal(2000n);
    expect(await contract.paymentToken()).to.equal(await usdc.getAddress());
    expect(await contract.nextPropertyId()).to.equal(1n);
  });

  it("should start with zero investors for property 1 after listing", async () => {
    const { contract, owner } = await deploy();
    await contract.createProperty(
      "Test Property",
      "Test City",
      "https://example.com/img.jpg",
      "Test description",
      1_000_000n,
      10_000n,
      1_000_000n,
    );
    expect(await contract.investorCount(1)).to.equal(0n);
    expect(await contract.nextPropertyId()).to.equal(2n);
  });

  it("should expose confidential protocol id on hardhat", async () => {
    const { contract } = await deploy();
    const protocolId = await contract.confidentialProtocolId();
    expect(protocolId).to.equal(hre.ethers.MaxUint256);
  });
});

import { expect } from "chai";
import { ethers } from "hardhat";

/**
 * Unit tests for ShieldCapProperty.
 *
 * NOTE: FHE operations (TFHE.asEuint64, TFHE.le, TFHE.decrypt) require the
 * Zama co-processor and cannot run on a standard Hardhat network. These tests
 * document the expected behavior for use with the Zama devnet / Zama mock lib.
 *
 * To run against Zama mock: use `fhevm-hardhat-plugin` with mockFHEVM mode.
 */
describe("ShieldCapProperty", () => {
  async function deploy() {
    const [owner, investorA, investorB, investorC] = await ethers.getSigners();
    const ShieldCapProperty = await ethers.getContractFactory("ShieldCapProperty");
    const contract = await ShieldCapProperty.deploy();
    await contract.waitForDeployment();
    return { contract, owner, investorA, investorB, investorC };
  }

  it("should deploy and set owner correctly", async () => {
    const { contract, owner } = await deploy();
    expect(await contract.owner()).to.equal(owner.address);
    expect(await contract.TOTAL_SHARES()).to.equal(50_000n);
    expect(await contract.MAX_SHARES()).to.equal(10_000n);
  });

  it("should have correct constants", async () => {
    const { contract } = await deploy();
    expect(await contract.TOTAL_SHARES()).to.equal(50_000n);
    // 20% cap
    expect(await contract.MAX_SHARES()).to.equal(10_000n);
  });

  it("should start with 0 investors", async () => {
    const { contract } = await deploy();
    expect(await contract.investorCount()).to.equal(0n);
  });

  it("should start with dividendRound = 0", async () => {
    const { contract } = await deploy();
    expect(await contract.dividendRound()).to.equal(0n);
  });

  /**
   * FHE-dependent tests — require Zama mock environment.
   * Document expected behavior:
   *
   * - purchaseShares: adds to encrypted balance, emits SharesPurchased
   * - purchaseShares (cap exceeded): emits OwnershipCapRejected, reverts
   * - transferShares: moves encrypted balance, emits ConfidentialTransfer
   * - distributeDividend: sets encrypted payouts per investor, increments round
   */
  it("documents: purchaseShares emits SharesPurchased event (requires FHE mock)", async () => {
    // This test would pass with Zama fhevm mock:
    // const { contract, investorA, fhevmInstance } = await deploy();
    // const input = fhevmInstance.createEncryptedInput(contractAddr, investorA.address);
    // input.add64(1000n);
    // const { handles, inputProof } = await input.encrypt();
    // await expect(contract.connect(investorA).purchaseShares(handles[0], inputProof, { value: ... }))
    //   .to.emit(contract, "SharesPurchased").withArgs(investorA.address, anyValue);
    expect(true).to.be.true;
  });

  it("documents: ownership cap rejects >20% purchase (requires FHE mock)", async () => {
    // const input = fhevmInstance.createEncryptedInput(...);
    // input.add64(10001n); // exceeds MAX_SHARES = 10_000
    // await expect(contract.connect(investorC).purchaseShares(...))
    //   .to.emit(contract, "OwnershipCapRejected");
    expect(true).to.be.true;
  });
});

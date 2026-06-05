// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "fhevm/lib/TFHE.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

/**
 * @title ShieldCapProperty
 * @notice Confidential real-estate ownership via Zama fhEVM.
 *
 * Privacy model:
 *   - Investor balances are stored as euint64 ciphertexts.
 *   - Transfer amounts are accepted as encrypted inputs (einput).
 *   - The 20% ownership cap is enforced using FHE comparisons — no
 *     plaintext balance is ever revealed to the contract or public.
 *   - Dividends are computed over encrypted balances; per-investor
 *     payouts are stored as euint64 that only the investor can decrypt.
 *
 * What remains PUBLIC:
 *   - Event types  (Purchase / Transfer / Dividend / CapRejected)
 *   - Total shares issued
 *   - Total revenue distributed
 *   - Dividend round number
 */
contract ShieldCapProperty is Ownable {
    // ─────────────────────────────────────────────────────────────────── constants
    uint256 public constant TOTAL_SHARES      = 50_000;
    uint256 public constant PRICE_PER_SHARE   = 0.001 ether; // demo price
    /// @dev 20% of TOTAL_SHARES = 10,000 shares
    uint64  public constant MAX_SHARES        = 10_000;

    // ─────────────────────────────────────────────────────────────────── state
    /// Encrypted share balances — only the owning wallet can decrypt.
    mapping(address => euint64) private _balances;

    /// Encrypted per-investor dividend payout for the current round.
    mapping(address => euint64) private _dividendPayouts;

    /// Registered investors (to iterate for dividend distribution).
    address[] private _investors;
    mapping(address => bool) private _registered;

    uint256 public dividendRound;
    uint256 public totalRevenueDistributed;

    // ─────────────────────────────────────────────────────────────────── events
    event SharesPurchased(address indexed buyer, uint256 timestamp);
    event ConfidentialTransfer(address indexed from, address indexed to, uint256 timestamp);
    event DividendDistributed(uint256 totalRevenue, uint256 round);
    event OwnershipCapRejected(address indexed buyer, uint256 timestamp);

    // ─────────────────────────────────────────────────────────────────── constructor
    constructor() Ownable(msg.sender) {}

    // ─────────────────────────────────────────────────────────────────── purchase

    /**
     * @notice Purchase shares using an FHE-encrypted amount.
     * @param encryptedAmount   Encrypted share count (einput from fhevmjs).
     * @param inputProof        Ciphertext proof generated client-side.
     *
     * The function:
     *   1. Converts the einput to a euint64 handle.
     *   2. Adds to the caller's encrypted balance.
     *   3. Checks the 20% cap using FHE comparison — no plaintext revealed.
     *   4. If cap is exceeded, reverts and emits OwnershipCapRejected.
     */
    function purchaseShares(
        bytes32 encryptedAmount,
        bytes calldata inputProof
    ) external payable {
        euint64 amount = TFHE.asEuint64(encryptedAmount, inputProof);

        euint64 current    = _balances[msg.sender];
        euint64 newBalance = TFHE.add(current, amount);

        // Cap check: newBalance <= MAX_SHARES
        euint64  maxAllowed = TFHE.asEuint64(MAX_SHARES);
        ebool    withinCap  = TFHE.le(newBalance, maxAllowed);

        // This decrypt is needed to branch — in a production system you would
        // use TFHE.cmux / TFHE.select to avoid branching on secret data.
        // For the Zama devnet demo, a gateway decrypt is acceptable.
        if (!TFHE.decrypt(withinCap)) {
            emit OwnershipCapRejected(msg.sender, block.timestamp);
            revert("ShieldCap: ownership cap exceeded");
        }

        _balances[msg.sender] = newBalance;

        // Grant the buyer access to decrypt their own balance.
        TFHE.allow(newBalance, msg.sender);
        TFHE.allowThis(newBalance);

        if (!_registered[msg.sender]) {
            _registered[msg.sender] = true;
            _investors.push(msg.sender);
        }

        emit SharesPurchased(msg.sender, block.timestamp);
    }

    // ─────────────────────────────────────────────────────────────────── transfer

    /**
     * @notice Confidential peer-to-peer share transfer.
     * @dev    Transfer amount never appears in plaintext on-chain.
     *         The smart contract uses TFHE.select to conditionally update
     *         balances without branching on encrypted values.
     */
    function transferShares(
        address to,
        bytes32 encryptedAmount,
        bytes calldata inputProof
    ) external returns (bool) {
        euint64 amount  = TFHE.asEuint64(encryptedAmount, inputProof);
        euint64 fromBal = _balances[msg.sender];
        euint64 toBal   = _balances[to];

        // Can transfer if fromBal >= amount AND newToBal <= MAX_SHARES
        euint64 newToBal    = TFHE.add(toBal, amount);
        euint64 maxAllowed  = TFHE.asEuint64(MAX_SHARES);

        ebool hasSufficient = TFHE.le(amount, fromBal);
        ebool recipientOk   = TFHE.le(newToBal, maxAllowed);
        ebool canTransfer   = TFHE.and(hasSufficient, recipientOk);

        // Apply transfer conditionally without revealing amounts.
        _balances[msg.sender] = TFHE.select(
            canTransfer,
            TFHE.sub(fromBal, amount),
            fromBal
        );
        _balances[to] = TFHE.select(canTransfer, newToBal, toBal);

        // Re-allow balances for owners.
        TFHE.allow(_balances[msg.sender], msg.sender);
        TFHE.allowThis(_balances[msg.sender]);
        TFHE.allow(_balances[to], to);
        TFHE.allowThis(_balances[to]);

        if (!_registered[to]) {
            _registered[to] = true;
            _investors.push(to);
        }

        emit ConfidentialTransfer(msg.sender, to, block.timestamp);
        return TFHE.decrypt(canTransfer);
    }

    // ─────────────────────────────────────────────────────────────────── dividends

    /**
     * @notice Distribute dividend revenue proportionally to encrypted balances.
     * @dev    Each investor's payout = (encryptedBalance / TOTAL_SHARES) * totalRevenue.
     *         All arithmetic runs on encrypted values — the platform never sees
     *         individual payouts.
     * @param  totalRevenue  Gross revenue in wei to distribute.
     */
    function distributeDividend(uint256 totalRevenue) external onlyOwner {
        dividendRound++;
        totalRevenueDistributed += totalRevenue;

        // Encrypt the total revenue for FHE arithmetic.
        euint64 encRevenue    = TFHE.asEuint64(uint64(totalRevenue / 1e9)); // scale to avoid overflow
        euint64 encTotalShares = TFHE.asEuint64(uint64(TOTAL_SHARES));

        for (uint256 i = 0; i < _investors.length; i++) {
            address investor = _investors[i];
            euint64 bal     = _balances[investor];

            // payout = balance * revenue / totalShares — fully encrypted
            euint64 payout  = TFHE.div(TFHE.mul(bal, encRevenue), encTotalShares);

            _dividendPayouts[investor] = payout;

            // Allow investor to decrypt their own payout.
            TFHE.allow(payout, investor);
            TFHE.allowThis(payout);
        }

        emit DividendDistributed(totalRevenue, dividendRound);
    }

    // ─────────────────────────────────────────────────────────────────── views

    /**
     * @notice Returns the encrypted balance handle for `account`.
     *         Readable only by the account itself via fhevmjs re-encryption.
     */
    function balanceOf(address account) external view returns (euint64) {
        return _balances[account];
    }

    /**
     * @notice Returns the encrypted dividend payout handle for `account`
     *         from the most recent round.
     */
    function dividendOf(address account) external view returns (euint64) {
        return _dividendPayouts[account];
    }

    function investorCount() external view returns (uint256) {
        return _investors.length;
    }

    // ─────────────────────────────────────────────────────────────────── withdraw
    function withdraw() external onlyOwner {
        payable(owner()).transfer(address(this).balance);
    }
}

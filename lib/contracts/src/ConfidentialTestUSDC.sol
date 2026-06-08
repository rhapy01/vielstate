// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import {FHE, euint64, externalEuint64, ebool} from "@fhevm/solidity/lib/FHE.sol";
import {ZamaEthereumConfig} from "@fhevm/solidity/config/ZamaConfig.sol";
import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";

/**
 * @title ConfidentialTestUSDC
 * @notice Zama-style confidential payment token (6 decimals). Balances and transfer amounts stay encrypted.
 */
contract ConfidentialTestUSDC is ZamaEthereumConfig, Ownable {
    mapping(address => euint64) private _balances;

    address public shieldCap;

    event ConfidentialTransfer(address indexed from, address indexed to);

    constructor() Ownable(msg.sender) {}

    function decimals() external pure returns (uint8) {
        return 6;
    }

    function symbol() external pure returns (string memory) {
        return "ctUSDC";
    }

    function setShieldCap(address shieldCapAddress) external onlyOwner {
        require(shieldCapAddress != address(0), "ctUSDC: invalid ShieldCap");
        shieldCap = shieldCapAddress;
    }

    /// @notice Owner faucet — mint amount is visible in the owner tx (acceptable for testnet drip).
    function drip(address to, uint64 amount) external onlyOwner {
        require(to != address(0), "ctUSDC: invalid recipient");
        euint64 enc = FHE.asEuint64(amount);
        _balances[to] = FHE.add(_balances[to], enc);
        _allowBalance(to);
    }

    function confidentialBalanceOf(address account) external view returns (euint64) {
        return _balances[account];
    }

    /// @notice ShieldCap pulls an already-computed encrypted amount from a user.
    function pullConfidential(address from, address to, euint64 amount) external {
        require(msg.sender == shieldCap, "ctUSDC: not ShieldCap");
        require(FHE.isAllowed(amount, msg.sender), "ctUSDC: unauthorized amount");
        _transferConfidential(from, to, amount);
    }

    function _transferConfidential(address from, address to, euint64 amount) private {
        euint64 fromBal = _balances[from];
        ebool sufficient = FHE.le(amount, fromBal);
        euint64 moved = FHE.select(sufficient, amount, FHE.asEuint64(0));

        _balances[from] = FHE.select(sufficient, FHE.sub(fromBal, amount), fromBal);
        _balances[to] = FHE.add(_balances[to], moved);

        _allowBalance(from);
        _allowBalance(to);

        emit ConfidentialTransfer(from, to);
    }

    function _allowBalance(address account) private {
        FHE.allowThis(_balances[account]);
        FHE.allow(_balances[account], account);
        if (shieldCap != address(0)) {
            FHE.allow(_balances[account], shieldCap);
        }
    }
}

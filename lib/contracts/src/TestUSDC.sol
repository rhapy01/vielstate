// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {ERC20} from "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";

/**
 * @title TestUSDC
 * @notice Sepolia testnet USDC stand-in (6 decimals). Minted by owner / faucet for demos.
 */
contract TestUSDC is ERC20, Ownable {
    constructor() ERC20("Vielstate Test USDC", "tUSDC") Ownable(msg.sender) {
        _mint(msg.sender, 10_000_000 * 10 ** decimals());
    }

    function decimals() public pure override returns (uint8) {
        return 6;
    }

    /// @notice Demo faucet entrypoint (owner-only, called by backend).
    function drip(address to, uint256 amount) external onlyOwner {
        _mint(to, amount);
    }
}

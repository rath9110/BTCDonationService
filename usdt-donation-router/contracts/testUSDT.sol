// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";

contract TestUSDT is ERC20 {
    constructor() ERC20("Test USDT", "tUSDT") {
        // Mint 1 billion test USDT to the deployer
        _mint(msg.sender, 1_000_000_000 * 1e18);
    }
}

// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

contract ReputationToken is ERC20, Ownable {
    constructor() ERC20("Validator Reputation", "REP") Ownable(msg.sender) {}

    address public auditManager;

    function setAuditManager(address _manager) external onlyOwner {
        auditManager = _manager;
    }

    function mint(address to, uint256 amount) external onlyOwner {
        _mint(to, amount);
    }

    function burn(address from, uint256 amount) external {
        require(msg.sender == owner() || msg.sender == auditManager, "Not authorized");
        _burn(from, amount);
    }
}

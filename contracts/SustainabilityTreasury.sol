// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/access/Ownable.sol";

/**
 * @title SustainabilityTreasury
 * @dev Implements the 5th pillar: Automated Maintenance Fund.
 * It automatically takes a percentage of funds (e.g. 0.5%) for the Developer Treasury.
 */
contract SustainabilityTreasury is Ownable {
    uint256 public constant MAINTENANCE_FEE_BPS = 50; // 0.5% (50 Basis Points)
    uint256 public totalMaintenanceFunds;

    struct Bounty {
        uint256 amount;
        bool active;
        address verifiedDev;
    }

    mapping(uint256 => Bounty) public bounties;
    uint256 public nextBountyId;

    event FundsReceived(uint256 totalAmount, uint256 maintenanceCut);
    event BountyCreated(uint256 indexed id, uint256 amount);
    event BountyClaimed(uint256 indexed id, address indexed developer, uint256 amount);

    constructor() Ownable(msg.sender) {}

    /**
     * @dev Simulates an "Enshrined Revenue" event. 
     * In the real dApp, the DonationRouter would call this on every donation.
     */
    function processRevenue() external payable {
        uint256 maintenanceCut = (msg.value * MAINTENANCE_FEE_BPS) / 10000;
        totalMaintenanceFunds += maintenanceCut;
        
        emit FundsReceived(msg.value, maintenanceCut);
        
        // The rest of the funds (99.5%) would typically be forwarded to the NGO/Recipient.
        // For this treasury demo, we store the cut and simulate the forwarding.
    }

    function createBounty(uint256 amount) external onlyOwner {
        require(totalMaintenanceFunds >= amount, "Insufficient treasury funds");
        uint256 id = nextBountyId++;
        bounties[id] = Bounty({
            amount: amount,
            active: true,
            verifiedDev: address(0)
        });
        totalMaintenanceFunds -= amount;
        emit BountyCreated(id, amount);
    }

    /**
     * @dev "Algorithmic Bug Bounty" release.
     * In prod, this could be triggered by a DAO vote or an Oracle verifying a GitHub PR.
     */
    function triggerBountyPayout(uint256 id, address developer) external onlyOwner {
        Bounty storage b = bounties[id];
        require(b.active, "Bounty not active");
        
        b.active = false;
        b.verifiedDev = developer;
        
        payable(developer).transfer(b.amount);
        emit BountyClaimed(id, developer, b.amount);
    }

    // Allow treasury to receive ETH
    receive() external payable {
        totalMaintenanceFunds += msg.value;
    }
}

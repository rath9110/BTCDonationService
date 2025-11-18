// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

contract DonationRouter is Ownable {
    using SafeERC20 for IERC20;

    IERC20 public immutable usdt;

    struct Campaign {
        address recipient;
        bool active;
    }

    mapping(uint256 => Campaign) public campaigns;

    event CampaignCreated(uint256 indexed campaignId, address indexed recipient);
    event CampaignUpdated(uint256 indexed campaignId, address indexed recipient, bool active);
    event DonationReceived(
        uint256 indexed campaignId,
        address indexed donor,
        address indexed recipient,
        uint256 amount
    );

    // 👇 Pass msg.sender to Ownable's constructor (OpenZeppelin v5 requirement)
    constructor(address usdtAddress) Ownable(msg.sender) {
        require(usdtAddress != address(0), "USDT address required");
        usdt = IERC20(usdtAddress);
    }

    function setCampaign(
        uint256 campaignId,
        address recipient,
        bool active
    ) external onlyOwner {
        require(recipient != address(0), "Invalid recipient");

        Campaign storage c = campaigns[campaignId];
        bool isNew = c.recipient == address(0);

        c.recipient = recipient;
        c.active = active;

        if (isNew) {
            emit CampaignCreated(campaignId, recipient);
        } else {
            emit CampaignUpdated(campaignId, recipient, active);
        }
    }

    function donate(uint256 campaignId, uint256 amount) external {
        require(amount > 0, "Amount must be > 0");

        Campaign memory c = campaigns[campaignId];
        require(c.active, "Campaign not active");
        require(c.recipient != address(0), "Campaign not found");

        usdt.safeTransferFrom(msg.sender, c.recipient, amount);

        emit DonationReceived(campaignId, msg.sender, c.recipient, amount);
    }

    function getCampaign(uint256 campaignId) external view returns (address recipient, bool active) {
        Campaign memory c = campaigns[campaignId];
        return (c.recipient, c.active);
    }
}

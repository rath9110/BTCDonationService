export const USDT_ADDRESS = "0x5FbDB2315678afecb367f032d93F642f64180aa3";

export const DONATION_ROUTER_ADDRESS = "0xe7f1725E7734CE288F8367e1Bb143E90bb3F0512";

export const DEFAULT_CAMPAIGN_ID = 1;

// Minimal ERC20 ABI
export const ERC20_ABI = [
  "function decimals() view returns (uint8)",
  "function balanceOf(address) view returns (uint256)",
  "function allowance(address owner, address spender) view returns (uint256)",
  "function approve(address spender, uint256 amount) returns (bool)"
];

// Minimal DonationRouter ABI
export const DONATION_ROUTER_ABI = [
  "function donate(uint256 campaignId, uint256 amount) external",
  "function getCampaign(uint256 campaignId) external view returns (address recipient, bool active)"
];

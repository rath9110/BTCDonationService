# 1. What your system is right now

You’ve built a **local USDT-based donation dApp** with:

- A **smart-contract layer** (Hardhat project)  
- A **local blockchain** (Hardhat node)  
- A **frontend donation UI** (Next.js + React)  
- A cleaned Git setup so the repo contains only the real source files  

It already supports:

- Creating donation campaigns  
- Accepting “USDT” donations to those campaigns  
- Moving tokens on-chain and interacting through MetaMask in the browser  

Everything currently runs on:  
**Local dev chain (`localhost`, chainId `31337`).**

---

# 2. Smart contract layer (Hardhat project)

## a) TestUSDT – fake local USDT token

- File: `contracts/testUSDT.sol`
- Based on **OpenZeppelin ERC20**
- Constructor mints a large supply to the **deployer account**
- Used as local stand-in for USDT so you don’t need real tokens

Local address (from your deployment):

```
USDT_ADDRESS = 0x5FbDB2315678afecb367f032d93F642f64180aa3
```

Implements the same interface as USDT:

- `decimals()`
- `balanceOf()`
- `approve()`
- `allowance()`

---

## b) DonationRouter – core donation logic

- File: `contracts/DonationRouter.sol`
- Inherits `Ownable` (OpenZeppelin)
- Constructor:

```solidity
constructor(address usdtAddress) Ownable(msg.sender) { ... }
```

### Campaign model

```solidity
struct Campaign {
    address recipient;
    bool active;
}

mapping(uint256 => Campaign) public campaigns;
```

### Admin function (owner only)

```solidity
function setCampaign(
    uint256 campaignId,
    address recipient,
    bool active
) external onlyOwner { ... }
```

Used to register or update campaigns.

### Donation function

```solidity
function donate(uint256 campaignId, uint256 amount) external {
    // validations
    // usdt.safeTransferFrom(msg.sender, campaign.recipient, amount);
    // emit DonationReceived(...)
}
```

Donation flow:

1. Pulls USDT from donor (`msg.sender`)
2. Sends USDT directly to campaign recipient
3. Emits `DonationReceived` event for tracking

Router address (from your deployment):

```
DONATION_ROUTER_ADDRESS = 0xe7f1725E7734CE288F8367e1Bb143E90bb3F0512
```

---

## c) Deployment script – `deploy-local.ts`

Network: `localhost`

Flow:

1. Get first signer (Account #0)
2. Deploy `TestUSDT`
3. Deploy `DonationRouter` with USDT address
4. Create a campaign:

```
setCampaign(1, deployer, true)
```

Deployment summary:

```
USDT_ADDRESS = 0x5FbDB2315678afecb367f032d93F642f64180aa3
DONATION_ROUTER_ADDRESS = 0xe7f1725E7734CE288F8367e1Bb143E90bb3F0512
DEMO_CAMPAIGN_ID = 1
```

Meaning:

- **Campaign 1** is active  
- Recipient = **Account #0** (`0xf39F…92266`)

---

# 3. Local blockchain environment (Hardhat Node)

Start it:

```bash
npx hardhat node
```

This:

- Starts chain at: `http://127.0.0.1:8545`
- ChainId: `31337`
- Provides 20 dev accounts with **10,000 ETH** each
- Prints all addresses + private keys (for local dev only)

Deploy your contracts to this network:

```bash
npx hardhat run scripts/deploy-local.ts --network localhost
```

### MetaMask configuration

Add custom network:

- **RPC:** `http://127.0.0.1:8545`
- **Chain ID:** `31337`

Import Account #0 private key → this wallet now has:

- 10,000 ETH  
- A large TestUSDT balance from your `TestUSDT` deployment

---

# 4. Frontend donation UI (Next.js + React)

You created a separate project with:

- **Next.js**
- **TypeScript**
- **App Router**
- **src/** directory
- Installed `ethers`

---

## a) `ethConfig.ts`

Holds your deployment addresses:

```ts
export const USDT_ADDRESS = "0x5FbDB2315678afecb367f032d93F642f64180aa3";
export const DONATION_ROUTER_ADDRESS = "0xe7f1725E7734CE288F8367e1Bb143E90bb3F0512";
export const DEFAULT_CAMPAIGN_ID = 1;
```

Minimal ABIs for USDT & DonationRouter.

- Used by ethers.js to:
  - Read balances  
  - Approve the router  
  - Donate  
  - Check campaign activity  

---

## b) `DonateForm` component

Located in:

```
src/components/DonateForm.tsx
```

### What it does:

### 1) Connect Wallet
- Calls:

```js
window.ethereum.request({ method: "eth_requestAccounts" })
```

- Creates a signer via:

```ts
new BrowserProvider(window.ethereum)
```

- Loads USDT balance from `balanceOf()`

---

### 2) Shows wallet info
- Wallet address  
- USDT balance formatted nicely  
- Inputs:
  - campaign ID (default = 1)
  - donation amount in USDT  

---

### 3) Donation flow

1. Validate amount  
2. Check campaign is active via:

```ts
router.getCampaign(campaignId)
```

3. Instantiate USDT + Router with signer  
4. Convert amount to `wei` based on USDT `decimals()`  
5. Check `allowance()`  
6. If not enough allowance → call:

```ts
usdt.approve(routerAddress, amountWei)
```

7. Call donation:

```ts
router.donate(campaignId, amountWei)
```

8. Show success with tx hash  
9. Refresh UI balance  

---

### 4) Status messages
Shows:

- Not connected  
- Connected  
- Approving…  
- Sending donation…  
- Donation successful  
- Donation failed  

---

### User experience:

1. MetaMask connects to local chain  
2. User sees USDT balance  
3. Inputs amount  
4. Clicks “Donate”  
5. Approve → Donate  
6. Transaction confirmed  
7. Balance updates  

Everything talks directly to the **local Hardhat blockchain** via MetaMask.

---

# 5. How this matches your original goal

Your goal:

> “I want a donation system using USDT to solve FX issues and make donations trackable.”

You now have:

- **USDT-based transfers** (for stable cross-border value)  
- **Per-campaign routing** (each campaign has a dedicated wallet)  
- **On-chain transparency**  
  - Contract logs every donation via events  
  - USDT transfers are visible on-chain  
- **Frontend flow:**
  - Choose campaign  
  - Approve + donate  
  - Fully trackable  

### What’s missing to reach production:

- Real blockchain (testnet → mainnet)
- Backend event indexer
- Database with donation records
- Campaign metadata storage
- NGO dashboard
- Multi-campaign UI
- Potential escrow logic

But the **fundamental architecture already works**:

**Wallet → USDT Token → DonationRouter → Recipient**

---

# 6. Running your full system end-to-end

### 1. Start local blockchain

```bash
npx hardhat node
```

### 2. Deploy contracts

```bash
npx hardhat run scripts/deploy-local.ts --network localhost
```

Copy the USDT + Router addresses into `ethConfig.ts`.

---

### 3. Configure MetaMask

Network:

- RPC: `http://127.0.0.1:8545`
- ChainId: `31337`

Import Account #0 private key.

---

### 4. Run frontend

```bash
npm run dev
```

Open:

```
http://localhost:3000
```

---

### 5. Donate

- Connect wallet  
- Ensure MetaMask is on localhost  
- Enter amount  
- Donate  
- Confirm in MetaMask  
- USDT moves to the campaign recipient wallet  

---

# ✔️ Final: You now have a working USDT donation dApp pipeline  
From **wallet → contract → campaign recipient**, all tracked on-chain and fully transparent.


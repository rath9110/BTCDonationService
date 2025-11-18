import { network } from "hardhat";

// 🔑 Change this if you run against another network name
const { ethers } = await network.connect({
  network: "hardhatMainnet",   // or "localhost" if you use that
});

async function main() {
  const [deployer] = await ethers.getSigners();

  console.log("--------------------------------------------------");
  console.log("Deploying contracts with account:", deployer.address);

  const balance = await ethers.provider.getBalance(deployer.address);
  console.log("Deployer balance:", ethers.formatEther(balance), "ETH");
  console.log("--------------------------------------------------");

  // 1) Deploy TestUSDT
  const TestUSDT = await ethers.getContractFactory("TestUSDT", deployer);
  const usdt = await TestUSDT.deploy();
  await usdt.waitForDeployment();
  const usdtAddress = await usdt.getAddress();

  console.log("TestUSDT deployed to:", usdtAddress);

  // 2) Deploy DonationRouter
  const DonationRouter = await ethers.getContractFactory("DonationRouter", deployer);
  const router = await DonationRouter.deploy(usdtAddress);
  await router.waitForDeployment();
  const routerAddress = await router.getAddress();

  console.log("DonationRouter deployed to:", routerAddress);

  // 3) Create sample campaign
  const campaignId = 1;
  const tx = await router.setCampaign(campaignId, deployer.address, true);
  await tx.wait();

  console.log(`Created campaign ${campaignId} => recipient ${deployer.address}`);
  console.log("--------------------------------------------------");
  console.log("USDT_ADDRESS =", usdtAddress);
  console.log("DONATION_ROUTER_ADDRESS =", routerAddress);
  console.log("DEMO_CAMPAIGN_ID =", campaignId);
  console.log("--------------------------------------------------");
}

main().catch((err) => {
  console.error(err);
  process.exitCode = 1;
});

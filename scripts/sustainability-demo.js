const hre = require("hardhat");

async function main() {
    const { ethers } = hre;
    const [deployer, donor, developer] = await ethers.getSigners();

    console.log("--- Starting Phase 5: Automated Maintenance Fund Demo ---");

    // 1. Deploy Treasury
    const Treasury = await ethers.getContractFactory("SustainabilityTreasury");
    const treasury = await Treasury.deploy();
    await treasury.waitForDeployment();
    const treasuryAddress = await treasury.getAddress();
    console.log("SustainabilityTreasury deployed to:", treasuryAddress);

    // --- THE FLOW ---

    // STEP A: "Enshrined Revenue"
    // A donor sends a donation. The protocol automatically redirects 0.5% to maintenance.
    const donationAmount = ethers.parseEther("100"); // 100 ETH donation
    console.log("\n[Protocol] Processing a 100 ETH Donation...");

    const tx1 = await treasury.connect(donor).processRevenue({ value: donationAmount });
    await tx1.wait();

    // Check Treasury Balance (should be 0.5 ETH)
    const maintenanceFunds = await treasury.totalMaintenanceFunds();
    console.log(`[Treasury] Cumulative Maintenance Cut: ${ethers.formatEther(maintenanceFunds)} ETH`);

    // STEP B: "Algorithmic Bug Bounty"
    // A developer finds and fixes a bug. The system (via owner/oracle) releases funds.
    const bountyReward = ethers.parseEther("0.1");
    console.log("\n[System] Critical bug fix verified on GitHub.");
    console.log(`[System] Creating Reward Bounty: ${ethers.formatEther(bountyReward)} ETH`);

    const tx2 = await treasury.createBounty(bountyReward);
    await tx2.wait();
    const bountyId = Number(await treasury.nextBountyId()) - 1;

    console.log(`[System] Paying out Bounty #${bountyId} to Developer (${developer.address.slice(0, 6)}...)`);
    const initialDevBalance = await ethers.provider.getBalance(developer.address);

    const tx3 = await treasury.triggerBountyPayout(bountyId, developer.address);
    await tx3.wait();

    // STEP C: VERIFY SUSTAINABILITY
    const finalDevBalance = await ethers.provider.getBalance(developer.address);
    const diff = finalDevBalance - initialDevBalance;

    if (diff >= bountyReward) {
        console.log("\n[Global] SUCCESS: Developer rewarded from maintenance fund.");
        console.log("[Global] RESULT: The code is now self-fixing and self-funding.");
        console.log("[Global] The protocol is now a Permanent Digital Utility.");
    }
}

main().catch((error) => {
    console.error(error);
    process.exitCode = 1;
});

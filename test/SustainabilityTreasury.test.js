const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("Phase 5: Automated Maintenance Fund (Sustainability)", function () {
    let Treasury, treasury;
    let owner, donor, developer;

    beforeEach(async function () {
        [owner, donor, developer] = await ethers.getSigners();
        Treasury = await ethers.getContractFactory("SustainabilityTreasury");
        treasury = await Treasury.deploy();
    });

    it("Should correctly calculate and store the 0.5% maintenance fee", async function () {
        const donationAmount = ethers.parseEther("100");
        const expectedCut = ethers.parseEther("0.5"); // 0.5% of 100

        await treasury.connect(donor).processRevenue({ value: donationAmount });

        expect(await treasury.totalMaintenanceFunds()).to.equal(expectedCut);
    });

    it("Should allow the owner to create and payout a bounty", async function () {
        // Fund the treasury
        await treasury.connect(donor).processRevenue({ value: ethers.parseEther("100") });

        const reward = ethers.parseEther("0.1");
        await treasury.createBounty(reward);

        const initialBalance = await ethers.provider.getBalance(developer.address);

        // Payout bounty 0
        await treasury.triggerBountyPayout(0, developer.address);

        const finalBalance = await ethers.provider.getBalance(developer.address);
        expect(finalBalance - initialBalance).to.equal(reward);
    });

    it("Should fail bounty creation if treasury has insufficient funds", async function () {
        const bigReward = ethers.parseEther("1");
        await expect(
            treasury.createBounty(bigReward)
        ).to.be.revertedWith("Insufficient treasury funds");
    });

    it("Should not allow non-owners to trigger payouts", async function () {
        await treasury.connect(donor).processRevenue({ value: ethers.parseEther("100") });
        await treasury.createBounty(ethers.parseEther("0.1"));

        await expect(
            treasury.connect(donor).triggerBountyPayout(0, developer.address)
        ).to.be.revertedWithCustomError(treasury, "OwnableUnauthorizedAccount");
    });
});

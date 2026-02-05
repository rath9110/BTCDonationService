const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("Phase 2: Social Identity and Recovery", function () {
    let SoulboundID, soulboundID;
    let SocialRecoveryWallet, wallet;
    let owner, guardian1, guardian2, guardian3, newOwner, other;

    beforeEach(async function () {
        [owner, guardian1, guardian2, guardian3, newOwner, other] = await ethers.getSigners();

        SoulboundID = await ethers.getContractFactory("SoulboundID");
        soulboundID = await SoulboundID.deploy();

        SocialRecoveryWallet = await ethers.getContractFactory("SocialRecoveryWallet");
        wallet = await SocialRecoveryWallet.deploy(
            owner.address,
            [guardian1.address, guardian2.address, guardian3.address],
            2 // Threshold of 2 out of 3
        );
    });

    describe("SoulboundID", function () {
        it("Should mint an identity and link it to the address", async function () {
            await soulboundID.mintIdentity(owner.address);
            expect(await soulboundID.balanceOf(owner.address)).to.equal(1);
            expect(await soulboundID.addressToTokenId(owner.address)).to.equal(0);
        });

        it("Should not allow minting more than one identity per address", async function () {
            await soulboundID.mintIdentity(owner.address);
            await expect(soulboundID.mintIdentity(owner.address)).to.be.revertedWith("Identity already exists");
        });

        it("Should revert on transfer attempts", async function () {
            await soulboundID.mintIdentity(owner.address);
            await expect(
                soulboundID.transferFrom(owner.address, other.address, 0)
            ).to.be.revertedWith("Transfers are not allowed for Soulbound tokens");
        });
    });

    describe("SocialRecoveryWallet", function () {
        it("Should allow the owner to execute transactions", async function () {
            // Simple value transfer test
            const initialBalance = await ethers.provider.getBalance(other.address);
            await owner.sendTransaction({
                to: await wallet.getAddress(),
                value: ethers.parseEther("1.0")
            });

            await wallet.execute(other.address, ethers.parseEther("0.5"), "0x");
            const finalBalance = await ethers.provider.getBalance(other.address);
            expect(finalBalance - initialBalance).to.equal(ethers.parseEther("0.5"));
        });

        it("Should fail execution if not called by owner", async function () {
            await expect(
                wallet.connect(other).execute(other.address, 0, "0x")
            ).to.be.revertedWith("Not owner");
        });

        it("Should recover the account if threshold is met", async function () {
            // Guardian 1 initiates recovery
            await wallet.connect(guardian1).initiateRecovery(newOwner.address);
            expect(await wallet.owner()).to.equal(owner.address); // Not yet recovered

            // Guardian 2 confirms recovery
            await wallet.connect(guardian2).initiateRecovery(newOwner.address);
            expect(await wallet.owner()).to.equal(newOwner.address); // Successfully recovered!
        });

        it("Should not allow non-guardians to initiate recovery", async function () {
            await expect(
                wallet.connect(other).initiateRecovery(newOwner.address)
            ).to.be.revertedWith("Not a guardian");
        });
    });
});

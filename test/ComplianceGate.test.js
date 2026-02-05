const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("Phase 4: Zero-Knowledge Compliance Gate", function () {
    let ComplianceGate, gate;
    let owner, user, issuer, untrusted;

    beforeEach(async function () {
        [owner, user, issuer, untrusted] = await ethers.getSigners();
        ComplianceGate = await ethers.getContractFactory("ComplianceGate");
        gate = await ComplianceGate.deploy();

        await gate.addTrustedIssuer(issuer.address);
    });

    it("Should verify compliance when using a trusted issuer", async function () {
        const idHash = ethers.id("user1");
        const proof = "0x1234";

        await expect(gate.connect(user).verifyCompliance(idHash, issuer.address, proof))
            .to.emit(gate, "ComplianceVerified")
            .withArgs(idHash, issuer.address);

        expect(await gate.isCompliant(idHash)).to.equal(true);
    });

    it("Should fail if the issuer is not trusted", async function () {
        const idHash = ethers.id("user1");
        await expect(
            gate.connect(user).verifyCompliance(idHash, untrusted.address, "0x1234")
        ).to.be.revertedWith("Issuer not trusted");
    });

    it("Should protect functions with the compliance modifier", async function () {
        const idHash = ethers.id("user1");
        const recipient = ethers.Wallet.createRandom().address;

        // Attempt without compliance
        await expect(
            gate.connect(user).transferImpactFunds(idHash, recipient, 100)
        ).to.be.revertedWith("Compliance check required");

        // Verify compliance
        await gate.connect(user).verifyCompliance(idHash, issuer.address, "0x1234");

        // Attempt again - should succeed (no return value to check, just no revert)
        await gate.connect(user).transferImpactFunds(idHash, recipient, 100);
    });
});

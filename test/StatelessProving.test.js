const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("Phase 3: Stateless Proving (Delegated ZK Flow)", function () {
    let Verifier, verifier;
    let owner, phoneUser, hubNode, otherHub;

    beforeEach(async function () {
        [owner, phoneUser, hubNode, otherHub] = await ethers.getSigners();
        Verifier = await ethers.getContractFactory("ProvingHubVerifier");
        verifier = await Verifier.deploy();

        // Authorize the Hub
        await verifier.authorizeHub(hubNode.address, true);
    });

    it("Should allow a user to submit a commitment", async function () {
        const commitment = ethers.keccak256(ethers.toUtf8Bytes("private_data_123"));
        await expect(verifier.connect(phoneUser).submitCommitment(commitment))
            .to.emit(verifier, "CommitmentSubmitted")
            .withArgs(phoneUser.address, commitment);
    });

    it("Should allow an authorized hub to verify a commitment", async function () {
        const commitment = ethers.keccak256(ethers.toUtf8Bytes("private_data_123"));
        const proof = "0x"; // Mock proof

        await verifier.connect(hubNode).verifyByHub(commitment, proof);

        expect(await verifier.verifiedCommitments(commitment)).to.equal(true);
    });

    it("Should prevent unauthorized hubs from verifying", async function () {
        const commitment = ethers.keccak256(ethers.toUtf8Bytes("private_data_123"));
        const proof = "0x";

        await expect(
            verifier.connect(otherHub).verifyByHub(commitment, proof)
        ).to.be.revertedWith("Not an authorized Proving Hub");
    });

    it("Should allow the owner to de-authorize a hub", async function () {
        await verifier.authorizeHub(hubNode.address, false);
        const commitment = ethers.keccak256(ethers.toUtf8Bytes("private_data_123"));

        await expect(
            verifier.connect(hubNode).verifyByHub(commitment, "0x")
        ).to.be.revertedWith("Not an authorized Proving Hub");
    });
});

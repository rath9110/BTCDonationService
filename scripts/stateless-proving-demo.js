const hre = require("hardhat");

async function main() {
    const { ethers } = hre;
    const [deployer, phoneUser, hubNode] = await ethers.getSigners();

    console.log("--- Starting Phase 3: Stateless Proving Demo ---");

    // 1. Deploy Verifier
    const Verifier = await ethers.getContractFactory("ProvingHubVerifier");
    const verifier = await Verifier.deploy();
    await verifier.waitForDeployment();
    const verifierAddress = await verifier.getAddress();
    console.log("ProvingHubVerifier deployed to:", verifierAddress);

    // 2. Authorize the Hub Node
    await verifier.authorizeHub(hubNode.address, true);
    console.log(`Authorized Hub: ${hubNode.address}`);

    // --- THE FLOW ---

    // STEP A: THE PHONE (Client-side)
    // The phone has a 50MB receipt image but doesn't want to spend data or battery uploading/proving it.
    const privateReceiptData = "TOTAL_USD: 50.00 | MERCHANT: NGO_GLOBAL | DATE: 2026-02-05";
    const commitment = ethers.keccak256(ethers.toUtf8Bytes(privateReceiptData));

    console.log("\n[Phone] Data hashed. Commitment:", commitment);
    console.log("[Phone] Submitting 32-byte commitment to chain (Stateless)...");

    const tx1 = await verifier.connect(phoneUser).submitCommitment(commitment);
    await tx1.wait();

    // STEP B: THE PROVING HUB (Delegated)
    // The phone sends the receipt data to the Hub via a low-cost off-chain channel (e.g., P2P).
    // The Hub (powerful server) verifies the data and generates the Proof.
    console.log("\n[Hub] Received private data from phone.");
    console.log("[Hub] Validating receipt against NGO database...");

    // Real ZK would take 30 seconds here. We mock the "Proof" generation.
    const mockProof = "0xdeadbeef";

    console.log("[Hub] Proof generated. Submitting to chain for verification...");
    const tx2 = await verifier.connect(hubNode).verifyByHub(commitment, mockProof);
    await tx2.wait();

    // STEP C: ON-CHAIN RESULT
    const isVerified = await verifier.verifiedCommitments(commitment);
    if (isVerified) {
        console.log("\n[Global] SUCCESS: Commitment is now VERIFIED on-chain.");
        console.log("[Global] No private data was ever revealed on-chain.");
    }
}

main().catch((error) => {
    console.error(error);
    process.exitCode = 1;
});

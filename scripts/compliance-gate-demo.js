const hre = require("hardhat");

async function main() {
    const { ethers } = hre;
    const [deployer, user, regulatorNGO] = await ethers.getSigners();

    console.log("--- Starting Phase 4: ZK-Compliance Gate Demo ---");

    // 1. Deploy Gate
    const ComplianceGate = await ethers.getContractFactory("ComplianceGate");
    const gate = await ComplianceGate.deploy();
    await gate.waitForDeployment();
    console.log("ComplianceGate deployed to:", await gate.getAddress());

    // 2. Setup Regulatory Trust
    await gate.addTrustedIssuer(regulatorNGO.address);
    console.log(`Regulator NGO (${regulatorNGO.address}) added as Trusted Issuer.`);

    // --- THE FLOW ---

    // User has a private identity (e.g. from SoulboundID)
    const identityHash = ethers.id("USER_SECRET_ID_123");

    console.log("\n[User] Wants to access Institutional Impact Funds.");
    console.log("[User] Generating ZK-Proof against Sanctions List...");

    // In a real system, the user creates the proof locally using their VC.
    const mockZkProof = ethers.hexlify(ethers.randomBytes(32));

    console.log("[User] Submitting Proof to ComplianceGate...");

    // The user proves they are compliant without revealing WHO they are.
    const tx = await gate.connect(user).verifyCompliance(identityHash, regulatorNGO.address, mockZkProof);
    await tx.wait();

    // 3. Verify Access
    const status = await gate.isCompliant(identityHash);
    if (status) {
        console.log("\n[Global] SUCCESS: User identity is COMPLIANT.");
        console.log("[Global] User can now trigger 'transferImpactFunds'.");
        console.log("[Global] System satisfied AML/KYC laws without a backdoor.");
    }
}

main().catch((error) => {
    console.error(error);
    process.exitCode = 1;
});

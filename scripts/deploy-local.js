const hre = require("hardhat");

async function main() {
    const [deployer] = await hre.ethers.getSigners();
    console.log("Deploying contracts with the account:", deployer.address);

    // 1. Deploy Reputation Token
    const ReputationToken = await hre.ethers.getContractFactory("ReputationToken");
    const reputationToken = await ReputationToken.deploy();
    await reputationToken.waitForDeployment();
    const repAddress = await reputationToken.getAddress();
    console.log("ReputationToken deployed to:", repAddress);

    // 2. Deploy Audit Manager
    const AuditManager = await hre.ethers.getContractFactory("AuditManager");
    const auditManager = await AuditManager.deploy(repAddress);
    await auditManager.waitForDeployment();
    const managerAddress = await auditManager.getAddress();
    console.log("AuditManager deployed to:", managerAddress);

    // 3. Link AuditManager to ReputationToken
    const tx = await reputationToken.setAuditManager(managerAddress);
    await tx.wait();
    console.log("Set AuditManager as burner on ReputationToken");

    // 4. Mint initial REP to deployer
    const mintTx = await reputationToken.mint(deployer.address, hre.ethers.parseEther("1000000"));
    await mintTx.wait();
    console.log("Minted 1,000,000 REP to deployer");

    console.log("Deployment complete.");
    console.log("Addresses:");
    console.log("ReputationToken:", repAddress);
    console.log("AuditManager:", managerAddress);
}

main().catch((error) => {
    console.error(error);
    process.exitCode = 1;
});

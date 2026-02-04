const hre = require("hardhat");

async function main() {
    const { ethers } = hre;
    const [deployer, ...others] = await ethers.getSigners();

    console.log("--- Starting Honeycomb Audit Simulation (JS) ---");

    // Load Addresses (Hardcoded from previous deployment log)
    const REP_ADDRESS = "0x5FbDB2315678afecb367f032d93F642f64180aa3";
    const AUDIT_ADDRESS = "0xe7f1725E7734CE288F8367e1Bb143E90bb3F0512";

    const repToken = await ethers.getContractAt("ReputationToken", REP_ADDRESS);
    const auditManager = await ethers.getContractAt("AuditManager", AUDIT_ADDRESS);

    // Setup Validators
    const HONEST_COUNT = 3;
    const LAZY_COUNT = 2;
    const stakeAmount = ethers.parseEther("100");
    const validators = [];

    console.log("\n--- Setting up Validators ---");

    // Helper to setup a validator
    async function setupValidator(signer, type) {
        // Mint REP
        await (await repToken.mint(signer.address, stakeAmount)).wait();
        // Approve
        await (await repToken.connect(signer).approve(AUDIT_ADDRESS, stakeAmount)).wait();
        // Register (ignore fail if already registered)
        try {
            await (await auditManager.connect(signer).registerValidator(stakeAmount)).wait();
            console.log(`Validator ${type} (${signer.address.slice(0, 6)}...) registered.`);
        } catch (e) {
            console.log(`Validator ${type} setup skipped (maybe already registered).`);
        }
        return { signer, type, slashed: false };
    }

    // Honest
    for (let i = 0; i < HONEST_COUNT; i++) {
        validators.push(await setupValidator(others[i], "Honest"));
    }
    // Lazy
    for (let i = 0; i < LAZY_COUNT; i++) {
        validators.push(await setupValidator(others[HONEST_COUNT + i], "Lazy"));
    }

    // Simulation Loop
    const rounds = 10;
    console.log(`\n--- Starting ${rounds} Rounds Simulation ---`);

    for (let r = 0; r < rounds; r++) {
        console.log(`\nRound ${r + 1}:`);

        // 1. Submit Receipt
        const isTrapdoor = Math.random() < 0.3; // 30% chance
        const receiptHash = ethers.keccak256(ethers.toUtf8Bytes(`receipt_${r}_${Date.now()}`));

        await (await auditManager.connect(deployer).submitReceipt(receiptHash, isTrapdoor)).wait();

        const nextId = await auditManager.nextReceiptId();
        const receiptId = Number(nextId) - 1;

        console.log(`Receipt ID ${receiptId} submitted. Trapdoor: ${isTrapdoor ? "YES" : "NO"}`);

        // 2. Voting
        // Shuffle validators
        const shuffled = validators.sort(() => Math.random() - 0.5);

        for (const val of shuffled) {
            if (val.slashed) continue;

            let voteValid = true;
            if (val.type === "Honest") {
                voteValid = !isTrapdoor; // Honest votes False if trapdoor
            } else {
                voteValid = true; // Lazy always approves
            }

            try {
                await (await auditManager.connect(val.signer).vote(receiptId, voteValid)).wait();
                console.log(`  Validator (${val.type}) voted ${voteValid}`);
            } catch (e) {
                // Check if slashed
                // We can read contract state
                const vData = await auditManager.validators(val.signer.address);
                if (!vData[0]) { // isActive
                    console.log(`  !!! BUSTED! Validator (${val.type}) was SLASHED!`);
                    val.slashed = true;
                } else {
                    console.log(`  Vote failed: ${e.message}`);
                }
            }
        }
    }

    // Summary
    console.log("\n--- Simulation Summary ---");
    for (const val of validators) {
        const status = val.slashed ? "SLASHED" : "ACTIVE";
        console.log(`${val.type} Validator (${val.signer.address.slice(0, 6)}...): ${status}`);
    }
}

main().catch((error) => {
    console.error(error);
    process.exitCode = 1;
});

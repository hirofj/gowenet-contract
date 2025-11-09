// ========================================
// GOWENET Monolithic Contract Load Test (with Gas Limits)
// ========================================

const hre = require("hardhat");
const fs = require("fs");

async function main() {
    console.log("=".repeat(60));
    console.log("🔥 GOWENET Monolithic Contract Load Test");
    console.log("=".repeat(60));
    
    // Configuration
    const LOAD_TEST_COUNT = parseInt(process.env.LOAD_TEST_COUNT || "10");
    const TARGET_TPS = parseInt(process.env.TARGET_TPS || "5");
    const INTERVAL_MS = Math.max(1000 / TARGET_TPS, 100);
    
    console.log("\n📋 Test Configuration:");
    console.log("   Contract Count:", LOAD_TEST_COUNT);
    console.log("   Target TPS:", TARGET_TPS);
    console.log("   Interval:", INTERVAL_MS, "ms");
    console.log("   Estimated Time:", Math.round(LOAD_TEST_COUNT * INTERVAL_MS / 1000), "seconds");
    
    // Get signers
    const [deployer, user1, user2] = await hre.ethers.getSigners();
    
    console.log("\n📋 Account Information:");
    console.log("   Deployer:", deployer.address);
    console.log("   Client (User1):", user1.address);
    console.log("   Freelancer (User2):", user2.address);
    
    // Check balances
    const deployerBalance = await hre.ethers.provider.getBalance(deployer.address);
    const user1Balance = await hre.ethers.provider.getBalance(user1.address);
    const user2Balance = await hre.ethers.provider.getBalance(user2.address);
    
    console.log("\n💰 Balances:");
    console.log("   Deployer:", hre.ethers.formatEther(deployerBalance), "GOWE");
    console.log("   Client:", hre.ethers.formatEther(user1Balance), "GOWE");
    console.log("   Freelancer:", hre.ethers.formatEther(user2Balance), "GOWE");
    
    // Gas tracking
    let totalGasUsed = 0n;
    const gasUsageByOperation = {};
    const testResults = [];
    let successCount = 0;
    let failureCount = 0;
    
    const logGasUsage = (operation, receipt, contractIndex) => {
        if (!gasUsageByOperation[operation]) {
            gasUsageByOperation[operation] = [];
        }
        gasUsageByOperation[operation].push(receipt.gasUsed);
        totalGasUsed += receipt.gasUsed;
    };
    
    const logStepError = (step, error, contractIndex) => {
        testResults.push({
            contractIndex: contractIndex,
            step: step,
            success: false,
            error: error.message.substring(0, 100)
        });
    };
    
    // Start load test
    console.log("\n" + "=".repeat(60));
    console.log("🚀 Starting Load Test...");
    console.log("=".repeat(60));
    
    const startTime = Date.now();
    
    for (let i = 0; i < LOAD_TEST_COUNT; i++) {
        const iterationStart = Date.now();
        
        console.log(`\n📝 Load Test ${i+1}/${LOAD_TEST_COUNT} [${new Date().toLocaleTimeString()}]`);
        console.log("   👤 Using Accounts:");
        console.log("     Client:", user1.address);
        console.log("     Freelancer:", user2.address);
        
        let contractAddress = null;
        let contract = null;
        let deliverable = null;
        
        try {
            // ========================================
            // Step 1: Deploy Monolithic Contract
            // ========================================
            console.log("   🏭 Step 1: Deploy Monolithic Contract");
            
            const FreelanceContractMonolithic = await hre.ethers.getContractFactory("FreelanceContractMonolithic");
            const deployedContract = await FreelanceContractMonolithic.deploy(
                user1.address,
                user2.address,
                hre.ethers.parseEther("1.0"),
                `Test Contract ${i+1}-${Date.now()}`
            );
            await deployedContract.waitForDeployment();
            
            contractAddress = await deployedContract.getAddress();
            contract = deployedContract;
            
            const deployTx = await deployedContract.deploymentTransaction();
            if (deployTx) {
                const deployReceipt = await deployTx.wait();
                logGasUsage("deploy", deployReceipt, i+1);
                console.log("     ✅ Contract deployed:", contractAddress.substring(0, 12) + "...");
            }
            
            // ========================================
            // Step 2: Authenticate
            // ========================================
            console.log("     🚀 Step 2: authenticate");
            try {
                const authenticateTx = await contract.connect(user1).authenticate({
                    gasLimit: 500000
                });
                const authenticateReceipt = await authenticateTx.wait();
                logGasUsage("authenticate", authenticateReceipt, i+1);
                console.log("       ✅ authenticate success");
            } catch (error) {
                console.log("       ❌ authenticate failed:", error.message.substring(0, 50));
                logStepError("authenticate", error, i+1);
                failureCount++;
                continue;
            }
            
            // ========================================
            // Step 3: Deliver Work
            // ========================================
            console.log("     📦 Step 3: deliverWork");
            deliverable = `https://example.com/delivery-${i+1}-${Date.now()}`;
            
            try {
                const deliverTx = await contract.connect(user2).deliverWork(deliverable, {
                    gasLimit: 1000000
                });
                const deliverReceipt = await deliverTx.wait();
                logGasUsage("deliverWork", deliverReceipt, i+1);
                console.log("       ✅ deliverWork success");
            } catch (error) {
                console.log("       ❌ deliverWork failed:", error.message.substring(0, 50));
                logStepError("deliverWork", error, i+1);
                failureCount++;
                continue;
            }
            
            // ========================================
            // Step 4: Approve Deliverable
            // ========================================
            console.log("     ✅ Step 4: approveDeliverable");
            try {
                const approveTx = await contract.connect(user1).approveDeliverable(deliverable, {
                    gasLimit: 500000
                });
                const approveReceipt = await approveTx.wait();
                logGasUsage("approveDeliverable", approveReceipt, i+1);
                console.log("       ✅ approveDeliverable success");
            } catch (error) {
                console.log("       ❌ approveDeliverable failed:", error.message.substring(0, 50));
                logStepError("approveDeliverable", error, i+1);
                failureCount++;
                continue;
            }
            
            // ========================================
            // Step 5: Make Direct Payment
            // ========================================
            console.log("     💰 Step 5: makeDirectPayment");
            try {
                const paymentTx = await contract.connect(user1).makeDirectPayment({
                    value: hre.ethers.parseEther("1.0"),
                    gasLimit: 800000
                });
                const paymentReceipt = await paymentTx.wait();
                logGasUsage("makeDirectPayment", paymentReceipt, i+1);
                console.log("       ✅ makeDirectPayment success");
            } catch (error) {
                console.log("       ❌ makeDirectPayment failed:", error.message.substring(0, 50));
                logStepError("makeDirectPayment", error, i+1);
                failureCount++;
                continue;
            }
            
            // ========================================
            // Step 6: Complete Contract
            // ========================================
            console.log("     🎉 Step 6: completeContract");
            try {
                const completeTx = await contract.connect(user1).completeContract({
                    gasLimit: 600000
                });
                const completeReceipt = await completeTx.wait();
                logGasUsage("completeContract", completeReceipt, i+1);
                console.log("       ✅ completeContract success");
            } catch (error) {
                console.log("       ❌ completeContract failed:", error.message.substring(0, 50));
                logStepError("completeContract", error, i+1);
                failureCount++;
                continue;
            }
            
            // Success
            successCount++;
            testResults.push({
                contractIndex: i+1,
                contractAddress: contractAddress,
                success: true,
                executionTime: Date.now() - iterationStart
            });
            
            console.log(`   ✅ Contract ${i+1}/${LOAD_TEST_COUNT} completed successfully`);
            
        } catch (error) {
            console.log(`   ❌ Contract ${i+1}/${LOAD_TEST_COUNT} failed:`, error.message.substring(0, 100));
            failureCount++;
            testResults.push({
                contractIndex: i+1,
                success: false,
                error: error.message.substring(0, 200)
            });
        }
        
        // Wait for next iteration
        if (i < LOAD_TEST_COUNT - 1) {
            const elapsed = Date.now() - iterationStart;
            const waitTime = Math.max(0, INTERVAL_MS - elapsed);
            if (waitTime > 0) {
                await new Promise(resolve => setTimeout(resolve, waitTime));
            }
        }
    }
    
    const endTime = Date.now();
    const totalTime = (endTime - startTime) / 1000;
    
    // ========================================
    // Final Report
    // ========================================
    console.log("\n" + "=".repeat(60));
    console.log("📊 LOAD TEST RESULTS");
    console.log("=".repeat(60));
    
    console.log("\n🎯 Success Rate:");
    console.log(`   ✅ Success: ${successCount}/${LOAD_TEST_COUNT}`);
    console.log(`   ❌ Failed: ${failureCount}/${LOAD_TEST_COUNT}`);
    console.log(`   📈 Success Rate: ${(successCount / LOAD_TEST_COUNT * 100).toFixed(2)}%`);
    
    console.log("\n⏱️  Performance:");
    console.log(`   Total Time: ${totalTime.toFixed(2)}s`);
    console.log(`   Avg Time per Contract: ${(totalTime / LOAD_TEST_COUNT).toFixed(2)}s`);
    console.log(`   Measured TPS: ${(LOAD_TEST_COUNT / totalTime).toFixed(2)}`);
    
    console.log("\n⛽ Gas Usage Summary:");
    console.log(`   Total Gas Used: ${totalGasUsed.toLocaleString()}`);
    console.log(`   Avg Gas per Contract: ${successCount > 0 ? (totalGasUsed / BigInt(successCount)).toLocaleString() : "N/A"}`);
    
    if (successCount > 0) {
        console.log("\n📋 Gas Usage by Operation:");
        for (const [operation, gasArray] of Object.entries(gasUsageByOperation)) {
            const total = gasArray.reduce((sum, val) => sum + val, 0n);
            const avg = total / BigInt(gasArray.length);
            const min = gasArray.reduce((min, val) => val < min ? val : min);
            const max = gasArray.reduce((max, val) => val > max ? val : max);
            
            console.log(`   ${operation}:`);
            console.log(`     Count: ${gasArray.length}`);
            console.log(`     Avg: ${avg.toLocaleString()} gas`);
            console.log(`     Min: ${min.toLocaleString()} gas`);
            console.log(`     Max: ${max.toLocaleString()} gas`);
        }
    }
    
    // Save results
    const resultsFile = `test-results-monolithic-${new Date().toISOString().replace(/[:.]/g, '-')}.json`;
    const resultsData = {
        testType: "monolithic-load-test",
        timestamp: new Date().toISOString(),
        configuration: {
            loadTestCount: LOAD_TEST_COUNT,
            targetTPS: TARGET_TPS,
            intervalMs: INTERVAL_MS
        },
        results: {
            successCount,
            failureCount,
            successRate: (successCount / LOAD_TEST_COUNT * 100).toFixed(2) + "%",
            totalTimeSeconds: totalTime,
            avgTimePerContract: (totalTime / LOAD_TEST_COUNT).toFixed(2),
            measuredTPS: (LOAD_TEST_COUNT / totalTime).toFixed(2)
        },
        gas: {
            totalGasUsed: totalGasUsed.toString(),
            avgGasPerContract: successCount > 0 ? (totalGasUsed / BigInt(successCount)).toString() : "N/A",
            byOperation: successCount > 0 ? Object.fromEntries(
                Object.entries(gasUsageByOperation).map(([op, arr]) => [
                    op,
                    {
                        count: arr.length,
                        total: arr.reduce((sum, val) => sum + val, 0n).toString(),
                        avg: (arr.reduce((sum, val) => sum + val, 0n) / BigInt(arr.length)).toString()
                    }
                ])
            ) : {}
        },
        testResults
    };
    
    fs.writeFileSync(resultsFile, JSON.stringify(resultsData, null, 2));
    console.log(`\n💾 Results saved to: ${resultsFile}`);
    
    console.log("\n" + "=".repeat(60));
    console.log("✅ Load Test Completed");
    console.log("=".repeat(60));
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });

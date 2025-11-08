// ========================================
// GOWENET 負荷テスト実行スクリプト（改善版）
// 戦略: 毎回新規契約作成 + 問題対策強化
// ========================================

const hre = require("hardhat");

async function main() {
    console.log("=".repeat(60));
    console.log("🔥 GOWENET 負荷テスト実行（改善版）");
    console.log("=".repeat(60));
    
    // 設定パラメータ
    const LOAD_TEST_COUNT = parseInt(process.env.LOAD_TEST_COUNT || "10");
    const TARGET_TPS = parseInt(process.env.TARGET_TPS || "5");
    const INTERVAL_MS = Math.max(1000 / TARGET_TPS, 100); // 最小100ms間隔
    
    console.log("\n📋 負荷テスト設定:");
    console.log("   契約実行回数:", LOAD_TEST_COUNT);
    console.log("   目標TPS:", TARGET_TPS);
    console.log("   実行間隔:", INTERVAL_MS, "ms");
    console.log("   推定実行時間:", Math.round(LOAD_TEST_COUNT * INTERVAL_MS / 1000), "秒");
    
    // デプロイ情報読み込み
    const fs = require('fs');
    let deploymentInfo;
    try {
        deploymentInfo = JSON.parse(fs.readFileSync('deployment-info-oop.json', 'utf8'));
    } catch (error) {
        console.error("❌ deployment-info-oop.json が見つかりません");
        console.error("   先にデプロイスクリプトを実行してください: npx hardhat run scripts/deploy-oop.js --network gowenet");
        process.exit(1);
    }
    
    // アカウント取得
    const [deployer, user1, user2, user3, user4, user5] = await hre.ethers.getSigners();
    
    console.log("\n👤 アカウント情報:");
    console.log("   Deployer (contract creator):", deployer.address);
    console.log("   Base Client:", user1.address);
    console.log("   Base Freelancer:", user2.address);
    console.log("   追加アカウント利用可能:", user3 && user4 && user5 ? "✅" : "⚠️");
    
    // Factory準備
    const factory = await hre.ethers.getContractAt("FreelanceContractFactory", deploymentInfo.contracts.FreelanceContractFactory);
    const stakingContract = await hre.ethers.getContractAt("StakingContract", deploymentInfo.contracts.StakingContract);
    
    console.log("\n🔗 コントラクト接続:");
    console.log("   FreelanceContractFactory:", deploymentInfo.contracts.FreelanceContractFactory);
    console.log("   StakingContract:", deploymentInfo.contracts.StakingContract);
    
    // 負荷テスト実行状況
    const results = [];
    let successCount = 0;
    let errorCount = 0;
    let deliverWorkErrors = 0; // deliverWork特化エラーカウント
    
    // ガス使用量記録
    let totalGasUsed = 0n;
    const gasUsageLog = [];
    const stepErrorLog = []; // ステップ別エラーログ
    
    function logGasUsage(stepName, receipt, cycleId) {
        const gasUsed = receipt.gasUsed;
        totalGasUsed += gasUsed;
        gasUsageLog.push({
            cycle: cycleId,
            step: stepName,
            gasUsed: gasUsed.toString(),
            blockNumber: receipt.blockNumber,
            timestamp: new Date().toISOString()
        });
    }
    
    function logStepError(stepName, error, cycleId) {
        stepErrorLog.push({
            cycle: cycleId,
            step: stepName,
            error: error.message,
            reason: error.reason || "Unknown",
            timestamp: new Date().toISOString()
        });
        
        if (stepName === "deliverWork") {
            deliverWorkErrors++;
        }
    }
    
    // 負荷テスト開始
    console.log("\n" + "=".repeat(50));
    console.log("🚀 負荷テスト実行開始");
    console.log("=".repeat(50));
    
    const startTime = Date.now();
    
    for (let i = 0; i < LOAD_TEST_COUNT; i++) {
        const cycleStartTime = Date.now();
        
        console.log(`\n📝 負荷テスト ${i+1}/${LOAD_TEST_COUNT} [${new Date().toLocaleTimeString()}]`);
        
        // ★★★ 改善1: アカウント分散 ★★★
        const clientIndex = i % 3; // user1, user3, user4 をローテーション
        const freelancerIndex = i % 2; // user2, user5 をローテーション
        
        let currentClient = user1;
        let currentFreelancer = user2;
        
        if (clientIndex === 1 && user3) currentClient = user3;
        else if (clientIndex === 2 && user4) currentClient = user4;
        
        if (freelancerIndex === 1 && user5) currentFreelancer = user5;
        
        console.log("   👤 使用アカウント:");
        console.log("     Client:", currentClient.address);
        console.log("     Freelancer:", currentFreelancer.address);
        
        try {
            // ========================================
            // Step 8: 新規契約作成
            // ========================================
            
            console.log("   🏭 Step 8: 契約作成");
            
            const createTx = await factory.connect(deployer).createContract(
                currentClient.address,  // 分散されたclient
                currentFreelancer.address,  // 分散されたfreelancer
                hre.ethers.parseEther("1.0"),
                `Load test contract ${i+1} - ${new Date().toISOString()}`,
                { value: 0 }
            );
            
            const createReceipt = await createTx.wait();
            logGasUsage("createContract", createReceipt, i+1);
            
            // 契約アドレス取得
            const contractCount = await factory.getContractCount();
            const freelanceContractAddress = await factory.contracts(contractCount);
            const freelanceContract = await hre.ethers.getContractAt("FreelanceContract", freelanceContractAddress);
            
            console.log("     ✅ 契約作成完了:", freelanceContractAddress.substring(0, 10) + "...");
            
            // ========================================
            // Step 11: authenticate
            // ========================================
            
            console.log("     🚀 Step 11: authenticate");
            try {
                const authenticateTx = await freelanceContract.connect(currentClient).authenticate();
                const authenticateReceipt = await authenticateTx.wait();
                logGasUsage("authenticate", authenticateReceipt, i+1);
                console.log("       ✅ authenticate成功");
            } catch (error) {
                console.log("       ❌ authenticate失敗:", error.message.substring(0, 50));
                logStepError("authenticate", error, i+1);
                throw error;
            }
            
            // ========================================
            // Step 12: deliverWork（特別な注意）
            // ========================================
            
            console.log("     📦 Step 12: deliverWork");
            try {
                // ★★★ 改善2: deliverWork詳細デバッグ ★★★
                const deliverable = `https://example.com/delivery-${i+1}-${Date.now()}`;
                console.log("       📋 deliverable:", deliverable);
                console.log("       📋 signature: '0x'");
                console.log("       📋 実行者:", currentFreelancer.address);
                
                // 前提条件確認
                const stateBefore = await freelanceContract.getState();
                console.log("       📋 実行前状態:", stateBefore.toString(), "(期待: 1-InProgress)");
                
                if (stateBefore.toString() !== "1") {
                    throw new Error(`Invalid state for deliverWork: ${stateBefore.toString()}, expected 1`);
                }
                
                // ガス推定
                try {
                    const estimatedGas = await freelanceContract.connect(currentFreelancer).estimateGas.deliverWork(deliverable, "0x");
                    console.log("       ⛽ 推定ガス:", estimatedGas.toString());
                } catch (gasError) {
                    console.log("       ⚠️ ガス推定失敗:", gasError.message.substring(0, 50));
                }
                
                const deliverTx = await freelanceContract.connect(currentFreelancer).deliverWork(deliverable, "0x");
                const deliverReceipt = await deliverTx.wait();
                logGasUsage("deliverWork", deliverReceipt, i+1);
                
                // 事後確認
                const stateAfter = await freelanceContract.getState();
                console.log("       📋 実行後状態:", stateAfter.toString(), "(期待: 2-Delivered)");
                
                if (stateAfter.toString() !== "2") {
                    throw new Error(`deliverWork state transition failed: ${stateAfter.toString()}, expected 2`);
                }
                
                console.log("       ✅ deliverWork成功");
            } catch (error) {
                console.log("       ❌ deliverWork失敗:", error.message.substring(0, 100));
                console.log("       💡 詳細:", error.reason || "revert理由なし");
                logStepError("deliverWork", error, i+1);
                throw error;
            }
            
            // ========================================
            // Step 13: approveDeliverable
            // ========================================
            
            console.log("     ✅ Step 13: approveDeliverable");
            try {
                const deliverable = `https://example.com/delivery-${i+1}-${Date.now()}`;
                const approveTx = await freelanceContract.connect(currentClient).approveDeliverable(deliverable, "0x");
                const approveReceipt = await approveTx.wait();
                logGasUsage("approveDeliverable", approveReceipt, i+1);
                console.log("       ✅ approveDeliverable成功");
            } catch (error) {
                console.log("       ❌ approveDeliverable失敗:", error.message.substring(0, 50));
                logStepError("approveDeliverable", error, i+1);
                throw error;
            }
            
            // ========================================
            // Step 14: makeDirectPayment
            // ========================================
            
            console.log("     💳 Step 14: makeDirectPayment");
            try {
                const paymentTx = await freelanceContract.connect(currentClient).makeDirectPayment("0x", {
                    value: hre.ethers.parseEther("1.0")
                });
                const paymentReceipt = await paymentTx.wait();
                logGasUsage("makeDirectPayment", paymentReceipt, i+1);
                console.log("       ✅ makeDirectPayment成功");
            } catch (error) {
                console.log("       ❌ makeDirectPayment失敗:", error.message.substring(0, 50));
                logStepError("makeDirectPayment", error, i+1);
                throw error;
            }
            
            // ========================================
            // Step 15: completeContract
            // ========================================
            
            console.log("     🎉 Step 15: completeContract");
            try {
                const completeTx = await freelanceContract.connect(currentClient).completeContract();
                const completeReceipt = await completeTx.wait();
                logGasUsage("completeContract", completeReceipt, i+1);
                console.log("       ✅ completeContract成功");
            } catch (error) {
                console.log("       ❌ completeContract失敗:", error.message.substring(0, 50));
                logStepError("completeContract", error, i+1);
                throw error;
            }
            
            const cycleEndTime = Date.now();
            const cycleDuration = cycleEndTime - cycleStartTime;
            
            console.log(`   ✅ 契約サイクル完了 (${cycleDuration}ms)`);
            
            // ★★★ 改善3: 個別貢献度確認 ★★★
            try {
                const clientScoreAfter = await stakingContract.contributionScore(currentClient.address);
                const freelancerScoreAfter = await stakingContract.contributionScore(currentFreelancer.address);
                console.log("     📊 貢献度記録:");
                console.log("       Client:", clientScoreAfter.toString(), "sec");
                console.log("       Freelancer:", freelancerScoreAfter.toString(), "sec");
            } catch (scoreError) {
                console.log("     ⚠️ 貢献度確認エラー:", scoreError.message.substring(0, 50));
            }
            
            // 結果記録
            results.push({
                cycle: i+1,
                success: true,
                duration: cycleDuration,
                contractAddress: freelanceContractAddress,
                clientAddress: currentClient.address,
                freelancerAddress: currentFreelancer.address,
                gasUsed: gasUsageLog.filter(log => log.cycle === i+1).reduce((sum, log) => sum + BigInt(log.gasUsed), 0n).toString()
            });
            
            successCount++;
            
        } catch (error) {
            const cycleEndTime = Date.now();
            const cycleDuration = cycleEndTime - cycleStartTime;
            
            console.log(`   ❌ 契約サイクル失敗 (${cycleDuration}ms):`);
            console.log("     エラー:", error.message.substring(0, 100));
            console.log("     詳細:", error.reason || "revert理由なし");
            
            results.push({
                cycle: i+1,
                success: false,
                duration: cycleDuration,
                error: error.message,
                reason: error.reason || "Unknown",
                clientAddress: currentClient.address,
                freelancerAddress: currentFreelancer.address,
                gasUsed: "0"
            });
            
            errorCount++;
        }
        
        // 目標TPSに合わせて待機
        if (i < LOAD_TEST_COUNT - 1) {
            await new Promise(resolve => setTimeout(resolve, INTERVAL_MS));
        }
        
        // 進捗表示（10サイクル毎）
        if ((i + 1) % 10 === 0 || i === LOAD_TEST_COUNT - 1) {
            console.log(`\n📊 進捗: ${i+1}/${LOAD_TEST_COUNT} (成功: ${successCount}, 失敗: ${errorCount})`);
        }
    }
    
    const endTime = Date.now();
    const totalDuration = endTime - startTime;
    
    // ========================================
    // ★★★ 改善4: 詳細分析レポート ★★★
    // ========================================
    
    console.log("\n" + "=".repeat(60));
    console.log("📊 負荷テスト詳細分析レポート");
    console.log("=".repeat(60));
    
    // 基本統計
    console.log("\n📋 基本統計:");
    console.log("   総実行時間:", Math.round(totalDuration / 1000), "秒");
    console.log("   成功回数:", successCount);
    console.log("   失敗回数:", errorCount);
    console.log("   成功率:", Math.round(successCount / LOAD_TEST_COUNT * 100), "%");
    
    // ★★★ deliverWork特化分析 ★★★
    console.log("\n🔍 deliverWork特化分析:");
    console.log("   deliverWork失敗数:", deliverWorkErrors);
    console.log("   deliverWork成功率:", Math.round((successCount / LOAD_TEST_COUNT) * 100), "%");
    if (deliverWorkErrors > 0) {
        console.log("   ⚠️ deliverWork問題を検出！詳細は stepErrorLog を確認");
    }
    
    // ステップ別エラー分析
    if (stepErrorLog.length > 0) {
        console.log("\n❌ ステップ別エラー統計:");
        const errorsByStep = {};
        stepErrorLog.forEach(log => {
            errorsByStep[log.step] = (errorsByStep[log.step] || 0) + 1;
        });
        Object.entries(errorsByStep).forEach(([step, count]) => {
            console.log(`   ${step}: ${count}回失敗`);
        });
    }
    
    // TPS計算
    const actualTPS = successCount / (totalDuration / 1000);
    console.log("\n⚡ TPS分析:");
    console.log("   実測TPS:", actualTPS.toFixed(2));
    console.log("   目標TPS:", TARGET_TPS);
    console.log("   TPS達成率:", Math.round(actualTPS / TARGET_TPS * 100), "%");
    
    // ガス統計
    console.log("\n⛽ ガス使用統計:");
    console.log("   総ガス使用量:", totalGasUsed.toLocaleString(), "gas");
    console.log("   平均ガス/契約:", successCount > 0 ? (totalGasUsed / BigInt(successCount)).toLocaleString() : "N/A", "gas");
    
    // ステップ別ガス分析
    if (gasUsageLog.length > 0) {
        const gasByStep = {};
        gasUsageLog.forEach(log => {
            if (!gasByStep[log.step]) gasByStep[log.step] = [];
            gasByStep[log.step].push(BigInt(log.gasUsed));
        });
        
        console.log("\n   ステップ別ガス使用量:");
        Object.entries(gasByStep).forEach(([step, gasArray]) => {
            const avgGas = gasArray.reduce((sum, gas) => sum + gas, 0n) / BigInt(gasArray.length);
            console.log(`     ${step}: 平均 ${avgGas.toLocaleString()} gas (${gasArray.length}回実行)`);
        });
    }
    
    // パフォーマンス統計
    const successResults = results.filter(r => r.success);
    if (successResults.length > 0) {
        const durations = successResults.map(r => r.duration);
        const avgDuration = durations.reduce((sum, d) => sum + d, 0) / durations.length;
        const minDuration = Math.min(...durations);
        const maxDuration = Math.max(...durations);
        
        console.log("\n⏱️  実行時間統計:");
        console.log("   平均実行時間:", Math.round(avgDuration), "ms");
        console.log("   最短実行時間:", minDuration, "ms");
        console.log("   最長実行時間:", maxDuration, "ms");
        console.log("   実行時間標準偏差:", Math.round(Math.sqrt(durations.map(d => Math.pow(d - avgDuration, 2)).reduce((sum, d) => sum + d, 0) / durations.length)), "ms");
    }
    
    // 結果保存
    const resultData = {
        testConfig: {
            count: LOAD_TEST_COUNT,
            targetTPS: TARGET_TPS,
            intervalMs: INTERVAL_MS,
            timestamp: new Date().toISOString()
        },
        summary: {
            totalDuration: totalDuration,
            successCount: successCount,
            errorCount: errorCount,
            deliverWorkErrors: deliverWorkErrors,
            successRate: successCount / LOAD_TEST_COUNT,
            actualTPS: actualTPS,
            totalGasUsed: totalGasUsed.toString()
        },
        results: results,
        gasLog: gasUsageLog,
        errorLog: stepErrorLog,
        deploymentInfo: deploymentInfo
    };
    
    const resultFileName = `load-test-results-${new Date().toISOString().replace(/[:.]/g, '-')}.json`;
    fs.writeFileSync(resultFileName, JSON.stringify(resultData, null, 2));
    console.log(`\n💾 詳細結果保存: ${resultFileName}`);
    
    // 最終判定
    if (successCount === LOAD_TEST_COUNT) {
        console.log("\n🎉 負荷テスト完全成功！");
        console.log("   全ての契約が正常に実行されました");
        console.log("   deliverWork問題は発生しませんでした");
    } else if (deliverWorkErrors > 0) {
        console.log("\n⚠️ deliverWork問題を検出");
        console.log(`   ${deliverWorkErrors}回のdeliverWork失敗が発生しました`);
        console.log("   詳細は保存されたエラーログを確認してください");
    } else if (successCount > LOAD_TEST_COUNT * 0.8) {
        console.log("\n⚠️ 負荷テスト部分成功");
        console.log(`   ${Math.round(100 - successCount / LOAD_TEST_COUNT * 100)}%の失敗がありました`);
    } else {
        console.log("\n❌ 負荷テスト失敗");
        console.log("   大量の失敗が発生しました。システム調査が必要です");
    }
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error("\n❌ 負荷テスト実行失敗:");
        console.error(error);
        process.exit(1);
    });
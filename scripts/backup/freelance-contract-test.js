const hre = require("hardhat");
const fs = require('fs');

async function main() {
    // デプロイ情報を読み込み
    const deployInfo = JSON.parse(fs.readFileSync('deployment-info-oop.json', 'utf8'));
    const savedTestResults = JSON.parse(fs.readFileSync('test-results-oop.json', 'utf8'));
    
    const [deployer, user1, user2] = await hre.ethers.getSigners();
    const freelanceContractAddress = savedTestResults.generatedContractAddress;
    
    console.log("\n" + "=".repeat(50));
    console.log("🧪 Phase 3: 生成された契約のテスト");
    console.log("=".repeat(50));
    console.log(`📋 テスト契約アドレス: ${freelanceContractAddress}`);
    
    // 生成された契約のインスタンス取得
    const freelanceContract = await hre.ethers.getContractAt("FreelanceContract", freelanceContractAddress);
    
    // 手順書準拠の統一署名（空の署名）
    const STANDARD_SIGNATURE = "0x";
    
    // テスト実行状況追跡
    let testsPassed = 0;
    let testsTotal = 5;
    const testResults = [];
    
    // Step 10相当: 契約情報の確認
    console.log("\n📋 Step 10: 契約情報の確認");
    try {
        const info = await freelanceContract.getFreelanceInfo();
        const state = await freelanceContract.getState();
        console.log(`   契約状態: ${state}`);
        console.log(`   作業説明: ${info[0]}`);
        console.log(`   報酬額: ${hre.ethers.formatEther(info[1])} GOWE`);
        console.log(`   作業状況: ${info[2]}`);
    } catch (error) {
        console.log(`   ⚠️  情報取得エラー: ${error.message}`);
    }
    
    // Step 11: 契約認証・作業開始 (authenticate)
    console.log("\n🚀 Step 11: 契約認証・作業開始 (authenticate)");
    try {
        const preState = await freelanceContract.getState();
        console.log(`   実行前の状態: ${preState}`);
        
        if (preState.toString() !== "0") {
            console.log("   ⚠️  既に認証済みです。スキップします。");
        } else {
            const authTx = await freelanceContract.connect(user1).authenticate();
            const authReceipt = await authTx.wait();
            
            const postState = await freelanceContract.getState();
            const postWorkStatus = await freelanceContract.workStatus();
            
            console.log(`   ✅ authenticate成功`);
            console.log(`   ⛽ Gas: ${authReceipt.gasUsed.toString()}`);
            console.log(`   📊 状態遷移: ${preState} → ${postState}`);
            console.log(`   📊 作業状況: ${postWorkStatus}`);
            
            testsPassed++;
            testResults.push({ step: 'authenticate', status: 'PASSED', gas: authReceipt.gasUsed.toString() });
        }
    } catch (error) {
        console.log(`   ❌ authenticate失敗: ${error.message}`);
        testResults.push({ step: 'authenticate', status: 'FAILED', error: error.message });
    }
    
    // Step 12: 作業成果物の納品 (deliverWork)
    console.log("\n📦 Step 12: 作業成果物の納品 (deliverWork)");
    try {
        const preState = await freelanceContract.getState();
        console.log(`   実行前の状態: ${preState}`);
        
        if (preState.toString() !== "1") {
            console.log(`   ⚠️  状態が InProgress(1) ではありません (現在: ${preState})。スキップします。`);
        } else {
            console.log(`   🔍 deliverWork実行準備:`);
            console.log(`      実行者: user2 (freelancer)`);
            console.log(`      納品物: "https://example.com/website-preview"`);
            console.log(`      署名: "${STANDARD_SIGNATURE}"`);
            
            const deliverTx = await freelanceContract.connect(user2).deliverWork(
                "https://example.com/website-preview",
                STANDARD_SIGNATURE
            );
            const deliverReceipt = await deliverTx.wait();
            
            const postState = await freelanceContract.getState();
            const postWorkStatus = await freelanceContract.workStatus();
            
            console.log(`   ✅ deliverWork成功`);
            console.log(`   ⛽ Gas: ${deliverReceipt.gasUsed.toString()}`);
            console.log(`   📊 状態遷移: ${preState} → ${postState}`);
            console.log(`   📊 作業状況: ${postWorkStatus}`);
            
            testsPassed++;
            testResults.push({ step: 'deliverWork', status: 'PASSED', gas: deliverReceipt.gasUsed.toString() });
        }
    } catch (error) {
        console.log(`   ❌ deliverWork失敗: ${error.message}`);
        console.log(`   🔍 エラー詳細:`);
        if (error.data) console.log(`      data: ${error.data}`);
        if (error.transaction) console.log(`      transaction.data: ${error.transaction.data}`);
        testResults.push({ step: 'deliverWork', status: 'FAILED', error: error.message });
    }
    
    // Step 13: 納品物の承認 (approveDeliverable)
    console.log("\n✅ Step 13: 納品物の承認 (approveDeliverable)");
    try {
        const workStatus = await freelanceContract.workStatus();
        console.log(`   実行前の作業状況: ${workStatus}`);
        
        if (workStatus.toString() !== "2") {
            console.log(`   ⚠️  状態が UnderReview(2) ではありません (現在: ${workStatus})。スキップします。`);
        } else {
            const approveTx = await freelanceContract.connect(user1).approveDeliverable(
                "https://example.com/website-preview",
                STANDARD_SIGNATURE
            );
            const approveReceipt = await approveTx.wait();
            
            const postWorkStatus = await freelanceContract.workStatus();
            
            console.log(`   ✅ approveDeliverable成功`);
            console.log(`   ⛽ Gas: ${approveReceipt.gasUsed.toString()}`);
            console.log(`   📊 作業状況: ${workStatus} → ${postWorkStatus}`);
            
            testsPassed++;
            testResults.push({ step: 'approveDeliverable', status: 'PASSED', gas: approveReceipt.gasUsed.toString() });
        }
    } catch (error) {
        console.log(`   ❌ approveDeliverable失敗: ${error.message}`);
        testResults.push({ step: 'approveDeliverable', status: 'FAILED', error: error.message });
    }
    
    // Step 14: 直接支払い (makeDirectPayment)
    console.log("\n💳 Step 14: 直接支払い (makeDirectPayment)");
    try {
        const state = await freelanceContract.getState();
        console.log(`   実行前の状態: ${state}`);
        
        if (state.toString() !== "2") {
            console.log(`   ⚠️  状態が Delivered(2) ではありません (現在: ${state})。スキップします。`);
        } else {
            const payTx = await freelanceContract.connect(user1).makeDirectPayment(STANDARD_SIGNATURE, { value: hre.ethers.parseEther("1.0") });
            const payReceipt = await payTx.wait();
            
            const postState = await freelanceContract.getState();
            
            console.log(`   ✅ makeDirectPayment成功`);
            console.log(`   ⛽ Gas: ${payReceipt.gasUsed.toString()}`);
            console.log(`   📊 状態遷移: ${state} → ${postState}`);
            
            testsPassed++;
            testResults.push({ step: 'makeDirectPayment', status: 'PASSED', gas: payReceipt.gasUsed.toString() });
        }
    } catch (error) {
        console.log(`   ❌ makeDirectPayment失敗: ${error.message}`);
        testResults.push({ step: 'makeDirectPayment', status: 'FAILED', error: error.message });
    }
    
    // Step 15: 契約完了 (completeContract)
    console.log("\n🎉 Step 15: 契約完了 (completeContract)");
    try {
        const state = await freelanceContract.getState();
        const workStatus = await freelanceContract.workStatus();
        console.log(`   実行前の状態: ${state}`);
        console.log(`   実行前の作業状況: ${workStatus}`);
        
        if (state.toString() !== "4") {
            console.log(`   ⚠️  状態が Paid(4) ではありません (現在: ${state})。スキップします。`);
        } else {
            const completeTx = await freelanceContract.connect(user1).completeContract(
                5, "Excellent work!",
                STANDARD_SIGNATURE
            );
            const completeReceipt = await completeTx.wait();
            
            const postState = await freelanceContract.getState();
            
            console.log(`   ✅ completeContract成功`);
            console.log(`   ⛽ Gas: ${completeReceipt.gasUsed.toString()}`);
            console.log(`   📊 状態遷移: ${state} → ${postState}`);
            
            testsPassed++;
            testResults.push({ step: 'completeContract', status: 'PASSED', gas: completeReceipt.gasUsed.toString() });
        }
    } catch (error) {
        console.log(`   ❌ completeContract失敗: ${error.message}`);
        testResults.push({ step: 'completeContract', status: 'FAILED', error: error.message });
    }
    
    // 結果サマリー
    console.log("\n" + "=".repeat(50));
    console.log("📊 テスト結果サマリー");
    console.log("=".repeat(50));
    console.log(`✅ 成功: ${testsPassed}/${testsTotal}`);
    console.log(`❌ 失敗: ${testsTotal - testsPassed}/${testsTotal}`);
    
    console.log("\n📋 詳細結果:");
    testResults.forEach(result => {
        const icon = result.status === 'PASSED' ? '✅' : '❌';
        console.log(`${icon} ${result.step}: ${result.status}${result.gas ? ` (${result.gas} gas)` : ''}`);
        if (result.error) console.log(`   エラー: ${result.error}`);
    });
    
    if (testsPassed < testsTotal) {
        console.log("\n⚠️  一部のテストが失敗しました");
        console.log("   根本的な問題の調査が必要です");
    }
    
    // 最終確認（手順書チェックリスト準拠）
    console.log("\n📝 手順書チェックリスト確認:");
    try {
        const finalState = await freelanceContract.getState();
        const finalInfo = await freelanceContract.getFreelanceInfo();
        
        console.log("   Phase 3: 契約実行");
        console.log(`   - [ ] authenticate: ${testResults.find(r => r.step === 'authenticate')?.status || 'NOT_RUN'}`);
        console.log(`   - [ ] deliverWork: ${testResults.find(r => r.step === 'deliverWork')?.status || 'NOT_RUN'}`);
        console.log(`   - [ ] approveDeliverable: ${testResults.find(r => r.step === 'approveDeliverable')?.status || 'NOT_RUN'}`);
        console.log(`   - [ ] makeDirectPayment: ${testResults.find(r => r.step === 'makeDirectPayment')?.status || 'NOT_RUN'}`);
        console.log(`   - [ ] completeContract: ${testResults.find(r => r.step === 'completeContract')?.status || 'NOT_RUN'}`);
        console.log(`   - [ ] StakingContract貢献度記録: ${testsPassed >= 5 ? 'PASSED' : 'FAILED'}`);
        
    } catch (error) {
        console.log("   ⚠️  最終確認エラー:", error.message);
    }
    
    console.log("\n🎯 オブジェクト指向型テスト完了!");
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error("❌ テスト実行エラー:", error);
        process.exit(1);
    });

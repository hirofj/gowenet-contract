// ========================================
// Phase 3: 生成された契約のテスト（最終修正版）
// ========================================

console.log("\n" + "=".repeat(50));
console.log("🧪 Phase 3: 生成された契約のテスト");
console.log("=".repeat(50));

// 生成された契約のインスタンス取得
const freelanceContract = await hre.ethers.getContractAt("FreelanceContract", freelanceContractAddress);

// 手順書準拠の統一署名（空の署名）
const STANDARD_SIGNATURE = "0x";

// テスト実行状況追跡
let testsPassed = 0;
let testsTotal = 5;
const testResults = [];

// Step 10相当: 契約情報の確認
console.log("\n📋 Step 10: 契約情報の初期確認");
try {
    const partyA = await freelanceContract.partyA();
    const partyB = await freelanceContract.partyB();
    const amount = await freelanceContract.paymentAmount();
    const description = await freelanceContract.workDescription();
    const state = await freelanceContract.getState();
    const workStatus = await freelanceContract.workStatus();
    
    console.log("   📋 partyA (Client):", partyA);
    console.log("   📋 partyB (Freelancer):", partyB);
    console.log("   📋 paymentAmount:", hre.ethers.formatEther(amount), "GOWE");
    console.log("   📋 workDescription:", description);
    console.log("   📋 getState():", state.toString(), "(期待値: 0-Created)");
    console.log("   📋 workStatus():", workStatus.toString(), "(期待値: 0-NotStarted)");
    
    // アカウント整合性確認
    const clientMatch = partyA.toLowerCase() === user1.address.toLowerCase();
    const freelancerMatch = partyB.toLowerCase() === user2.address.toLowerCase();
    
    console.log("   ✅ Client一致:", clientMatch ? "OK" : "NG");
    console.log("   ✅ Freelancer一致:", freelancerMatch ? "OK" : "NG");
    
    if (!clientMatch || !freelancerMatch) {
        console.log("   ❌ アカウント設定に問題があります");
        return;
    }
    
} catch (error) {
    console.log("   ❌ 初期状態確認エラー:", error.message);
    return;
}

// Step 11: 契約認証・作業開始 (authenticate)
console.log("\n🚀 Step 11: 契約認証・作業開始 (authenticate)");
try {
    const stateBefore = await freelanceContract.getState();
    const workStatusBefore = await freelanceContract.workStatus();
    
    console.log("   📋 実行前 Contract State:", stateBefore.toString());
    console.log("   📋 実行前 Work Status:", workStatusBefore.toString());
    
    if (stateBefore.toString() !== "0") {
        console.log("   ⚠️  状態が Created(0) ではありません。現在:", stateBefore.toString());
        console.log("   💡 それでもauthenticateを試行します...");
    }
    
    // user1 (client) で実行
    const authenticateTx = await freelanceContract.connect(user1).authenticate();
    const authenticateReceipt = await authenticateTx.wait();
    
    console.log("   ✅ 契約認証成功");
    logGasUsage("authenticate", authenticateReceipt, "契約認証・作業開始");
    
    // 手順書Step 11確認項目
    const stateAfter = await freelanceContract.getState();
    const workStatusAfter = await freelanceContract.workStatus();
    console.log("   📋 実行後 Contract State:", stateAfter.toString(), "(期待値: 1-InProgress)");
    console.log("   📋 実行後 Work Status:", workStatusAfter.toString(), "(期待値: 1-InProgress)");
    
    // 検証
    if (stateAfter.toString() === "1" && workStatusAfter.toString() === "1") {
        console.log("   🎯 Step 11 PASSED: Created → InProgress 成功");
        testsPassed++;
        testResults.push({ step: "authenticate", status: "PASSED", details: "状態遷移正常" });
    } else {
        console.log("   ❌ Step 11 FAILED: 期待通りの状態変化になりませんでした");
        testResults.push({ step: "authenticate", status: "FAILED", details: `状態異常: state=${stateAfter}, workStatus=${workStatusAfter}` });
    }
    
} catch (error) {
    console.log("   ❌ authenticate エラー:", error.message);
    console.log("   💡 詳細:", error.reason || "revert理由なし");
    testResults.push({ step: "authenticate", status: "ERROR", details: error.message });
}

// Step 12: 作業成果物の納品 (deliverWork)
console.log("\n📦 Step 12: 作業成果物の納品 (deliverWork)");
try {
    const stateBefore = await freelanceContract.getState();
    const workStatusBefore = await freelanceContract.workStatus();
    console.log("   📋 実行前 Contract State:", stateBefore.toString(), "(期待値: 1-InProgress)");
    console.log("   📋 実行前 Work Status:", workStatusBefore.toString(), "(期待値: 1-InProgress)");
    
    if (stateBefore.toString() !== "1") {
        console.log("   ❌ PREREQUISITE FAILED: Contract State が InProgress(1) ではありません");
        throw new Error("Prerequisite not met: Contract not in InProgress state");
    }
    
    // 手順書準拠のパラメータ
    const deliverable = "https://example.com/website-preview";
    
    console.log("   📋 deliverable:", deliverable);
    console.log("   📋 signature:", STANDARD_SIGNATURE);
    console.log("   📋 実行者:", user2.address, "(Freelancer)");
    
    // ガス推定（デバッグ用）
    try {
        const estimatedGas = await freelanceContract.connect(user2).estimateGas.deliverWork(deliverable, STANDARD_SIGNATURE);
        console.log("   ⛽ 推定ガス:", estimatedGas.toString());
    } catch (gasError) {
        console.log("   ⚠️  ガス推定エラー:", gasError.message);
    }
    
    // user2 (freelancer) で実行
    const deliverTx = await freelanceContract.connect(user2).deliverWork(deliverable, STANDARD_SIGNATURE);
    const deliverReceipt = await deliverTx.wait();
    
    console.log("   ✅ 作業納品成功");
    logGasUsage("deliverWork", deliverReceipt, "作業成果物の納品");
    
    // 手順書Step 12確認項目
    const stateAfter = await freelanceContract.getState();
    const workStatusAfter = await freelanceContract.workStatus();
    const deliverables = await freelanceContract.getDeliverables();
    
    console.log("   📋 実行後 Contract State:", stateAfter.toString(), "(期待値: 2-Delivered)");
    console.log("   📋 実行後 Work Status:", workStatusAfter.toString(), "(期待値: 2-UnderReview)");
    console.log("   📋 Deliverables配列:", deliverables.length > 0 ? "✅ 含まれる" : "❌ 空");
    
    // 検証
    if (stateAfter.toString() === "2" && workStatusAfter.toString() === "2" && deliverables.length > 0) {
        console.log("   🎯 Step 12 PASSED: InProgress → Delivered 成功");
        testsPassed++;
        testResults.push({ step: "deliverWork", status: "PASSED", details: "納品正常完了" });
    } else {
        console.log("   ❌ Step 12 FAILED: 期待通りの結果になりませんでした");
        testResults.push({ step: "deliverWork", status: "FAILED", details: `state=${stateAfter}, workStatus=${workStatusAfter}, deliverables=${deliverables.length}` });
    }
    
} catch (error) {
    console.log("   ❌ deliverWork エラー:", error.message);
    console.log("   💡 詳細:", error.reason || "revert理由なし");
    if (error.transaction) {
        console.log("   🔍 トランザクション情報:", JSON.stringify({
            to: error.transaction.to,
            data: error.transaction.data?.substring(0, 20) + "...",
            gasLimit: error.transaction.gasLimit?.toString()
        }, null, 2));
    }
    testResults.push({ step: "deliverWork", status: "ERROR", details: error.message });
}

// Step 13: 納品物の承認 (approveDeliverable)
console.log("\n✅ Step 13: 納品物の承認 (approveDeliverable)");
try {
    const workStatusBefore = await freelanceContract.workStatus();
    console.log("   📋 実行前 Work Status:", workStatusBefore.toString(), "(期待値: 2-UnderReview)");
    
    if (workStatusBefore.toString() !== "2") {
        console.log("   ❌ PREREQUISITE FAILED: Work Status が UnderReview(2) ではありません");
        throw new Error("Prerequisite not met: Work not under review");
    }
    
    // 手順書準拠のパラメータ
    const deliverable = "https://example.com/website-preview";
    
    // user1 (client) で実行
    const approveTx = await freelanceContract.connect(user1).approveDeliverable(deliverable, STANDARD_SIGNATURE);
    const approveReceipt = await approveTx.wait();
    
    console.log("   ✅ 納品物承認成功");
    logGasUsage("approveDeliverable", approveReceipt, "納品物の承認");
    
    // 手順書Step 13確認項目
    const workStatusAfter = await freelanceContract.workStatus();
    const isApproved = await freelanceContract.approvedDeliverables(deliverable);
    
    console.log("   📋 実行後 Work Status:", workStatusAfter.toString(), "(期待値: 4-Completed)");
    console.log("   📋 承認状況:", isApproved ? "✅ true" : "❌ false");
    
    // 検証
    if (workStatusAfter.toString() === "4" && isApproved) {
        console.log("   🎯 Step 13 PASSED: UnderReview → Completed 成功");
        testsPassed++;
        testResults.push({ step: "approveDeliverable", status: "PASSED", details: "承認処理正常" });
    } else {
        console.log("   ❌ Step 13 FAILED: 承認処理に問題があります");
        testResults.push({ step: "approveDeliverable", status: "FAILED", details: `workStatus=${workStatusAfter}, approved=${isApproved}` });
    }
    
} catch (error) {
    console.log("   ❌ approveDeliverable エラー:", error.message);
    console.log("   💡 詳細:", error.reason || "revert理由なし");
    testResults.push({ step: "approveDeliverable", status: "ERROR", details: error.message });
}

// Step 14: 報酬の支払い（直接支払い）(makeDirectPayment)
console.log("\n💳 Step 14: 報酬の支払い（直接支払い）(makeDirectPayment)");
try {
    const stateBefore = await freelanceContract.getState();
    const workStatusBefore = await freelanceContract.workStatus();
    console.log("   📋 実行前 Contract State:", stateBefore.toString(), "(期待値: 2-Delivered)");
    console.log("   📋 実行前 Work Status:", workStatusBefore.toString(), "(期待値: 4-Completed)");
    
    if (stateBefore.toString() !== "2") {
        console.log("   ❌ PREREQUISITE FAILED: Contract State が Delivered(2) ではありません");
        throw new Error("Prerequisite not met: Contract not in Delivered state");
    }
    
    // 手順書Step 14準拠: VALUE: 1000000000000000000（1 ETH）
    const paymentValue = hre.ethers.parseEther("1.0");
    
    // 支払い前の残高記録
    const freelancerBalanceBefore = await hre.ethers.provider.getBalance(user2.address);
    console.log("   📋 支払い前 Freelancer残高:", hre.ethers.formatEther(freelancerBalanceBefore), "GOWE");
    console.log("   📋 支払い額:", hre.ethers.formatEther(paymentValue), "GOWE");
    
    // user1 (client) で実行
    const paymentTx = await freelanceContract.connect(user1).makeDirectPayment(STANDARD_SIGNATURE, {
        value: paymentValue
    });
    const paymentReceipt = await paymentTx.wait();
    
    console.log("   ✅ 直接支払い成功");
    logGasUsage("makeDirectPayment", paymentReceipt, "直接支払い（1.0 GOWE）");
    
    // 手順書Step 14確認項目
    const stateAfter = await freelanceContract.getState();
    const freelancerBalanceAfter = await hre.ethers.provider.getBalance(user2.address);
    const paymentHistory = await freelanceContract.getPaymentHistory();
    
    console.log("   📋 実行後 Contract State:", stateAfter.toString(), "(期待値: 4-Paid)");
    console.log("   📋 支払い後 Freelancer残高:", hre.ethers.formatEther(freelancerBalanceAfter), "GOWE");
    console.log("   📋 残高増加:", hre.ethers.formatEther(freelancerBalanceAfter - freelancerBalanceBefore), "GOWE");
    console.log("   📋 Payment History:", paymentHistory.length, "transactions");
    
    // 検証
    const balanceIncrease = freelancerBalanceAfter - freelancerBalanceBefore;
    if (stateAfter.toString() === "4" && balanceIncrease > 0n && paymentHistory.length > 0) {
        console.log("   🎯 Step 14 PASSED: Delivered → Paid 成功");
        testsPassed++;
        testResults.push({ step: "makeDirectPayment", status: "PASSED", details: "支払い処理正常" });
    } else {
        console.log("   ❌ Step 14 FAILED: 支払い処理に問題があります");
        testResults.push({ step: "makeDirectPayment", status: "FAILED", details: `state=${stateAfter}, increase=${hre.ethers.formatEther(balanceIncrease)}` });
    }
    
} catch (error) {
    console.log("   ❌ makeDirectPayment エラー:", error.message);
    console.log("   💡 詳細:", error.reason || "revert理由なし");
    testResults.push({ step: "makeDirectPayment", status: "ERROR", details: error.message });
}

// Step 15: 契約完了処理 (completeContract)
console.log("\n🎉 Step 15: 契約完了処理 (completeContract)");
try {
    const stateBefore = await freelanceContract.getState();
    const workStatusBefore = await freelanceContract.workStatus();
    console.log("   📋 実行前 Contract State:", stateBefore.toString(), "(期待値: 4-Paid)");
    console.log("   📋 実行前 Work Status:", workStatusBefore.toString(), "(期待値: 4-Completed)");
    
    if (stateBefore.toString() !== "4") {
        console.log("   ❌ PREREQUISITE FAILED: Contract State が Paid(4) ではありません");
        throw new Error("Prerequisite not met: Contract not in Paid state");
    }
    
    if (workStatusBefore.toString() !== "4") {
        console.log("   ⚠️  WARNING: Work Status が Completed(4) ではありませんが続行します");
        console.log("      現在のWork Status:", workStatusBefore.toString());
    }
    
    // user1 (client) で実行
    const completeTx = await freelanceContract.connect(user1).completeContract();
    const completeReceipt = await completeTx.wait();
    
    console.log("   ✅ 契約完了成功");
    logGasUsage("completeContract", completeReceipt, "契約完了・貢献度記録");
    
    // 手順書Step 15確認項目
    const stateAfter = await freelanceContract.getState();
    const ratingsEnabled = await freelanceContract.ratingsEnabled();
    
    console.log("   📋 最終 Contract State:", stateAfter.toString(), "(期待値: 5-Completed)");
    console.log("   📋 ratingsEnabled():", ratingsEnabled ? "✅ true" : "❌ false");
    
    // 手順書Step 16: 貢献度スコアの確認
    console.log("\n📊 Step 16: 貢献度スコアの確認");
    const stakingContract = await hre.ethers.getContractAt("StakingContract", deploymentInfo.contracts.StakingContract);
    const clientScore = await stakingContract.contributionScore(user1.address);
    const freelancerScore = await stakingContract.contributionScore(user2.address);
    
    console.log("   📋 Client Contribution Score:", clientScore.toString(), "seconds");
    console.log("   📋 Freelancer Contribution Score:", freelancerScore.toString(), "seconds");
    
    // 検証
    if (stateAfter.toString() === "5" && ratingsEnabled && clientScore > 0n && freelancerScore > 0n) {
        console.log("   🎯 Step 15 PASSED: Paid → Completed 成功、貢献度記録完了");
        testsPassed++;
        testResults.push({ step: "completeContract", status: "PASSED", details: "契約完了・貢献度記録正常" });
    } else {
        console.log("   ❌ Step 15 FAILED: 契約完了処理に問題があります");
        testResults.push({ step: "completeContract", status: "FAILED", details: `state=${stateAfter}, ratings=${ratingsEnabled}, scores=${clientScore}/${freelancerScore}` });
    }
    
} catch (error) {
    console.log("   ❌ completeContract エラー:", error.message);
    console.log("   💡 詳細:", error.reason || "revert理由なし");
    testResults.push({ step: "completeContract", status: "ERROR", details: error.message });
}

// 手順書準拠のテスト結果サマリー
console.log("\n" + "=".repeat(60));
console.log("📊 手順書準拠テスト結果サマリー");
console.log("=".repeat(60));

console.log(`\n🎯 総合結果: ${testsPassed}/${testsTotal} テスト成功`);

console.log("\n📋 詳細結果:");
testResults.forEach((result, index) => {
    const statusIcon = result.status === "PASSED" ? "✅" : result.status === "FAILED" ? "❌" : "⚠️";
    console.log(`   ${index + 1}. ${result.step}: ${statusIcon} ${result.status}`);
    if (result.details) {
        console.log(`      ${result.details}`);
    }
});

if (testsPassed === testsTotal) {
    console.log("\n🎉 手順書完全準拠テスト全て成功！");
    console.log("   オブジェクト指向型スマートコントラクトは正常に動作しています！");
} else if (testsPassed > 0) {
    console.log(`\n⚠️  ${testsTotal - testsPassed}個のテストが失敗しました`);
    console.log("   基本機能は動作していますが、問題の調査が必要です");
} else {
    console.log("\n❌ 全テストが失敗しました");
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

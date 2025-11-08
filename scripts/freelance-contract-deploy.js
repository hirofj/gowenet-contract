// ========================================
// Phase 1: 独立モジュールのデプロイ（修正版）
// ========================================

console.log("\n" + "=".repeat(50));
console.log("📦 Phase 1: 独立モジュールのデプロイ");
console.log("=".repeat(50));

// 1. SignatureVerifier
console.log("\n🔐 Step 1: SignatureVerifier をデプロイ中...");
try {
    const SignatureVerifier = await hre.ethers.getContractFactory("SignatureVerifier");
    const signatureVerifier = await SignatureVerifier.deploy();
    await signatureVerifier.waitForDeployment();
    
    const signatureVerifierAddress = await signatureVerifier.getAddress();
    deployedContracts.SignatureVerifier = signatureVerifierAddress;
    console.log("✅ SignatureVerifier deployed to:", signatureVerifierAddress);
    
    // ガス使用量記録
    const deployTx1 = await signatureVerifier.deploymentTransaction();
    if (deployTx1) {
        const receipt1 = await deployTx1.wait();
        logGasUsage("SignatureVerifier Deploy", receipt1, "デジタル署名検証モジュール");
    }
} catch (error) {
    console.error("❌ SignatureVerifier デプロイ失敗:", error.message);
    throw error;
}

// 2. ContractBase
console.log("\n📊 Step 2: ContractBase をデプロイ中...");
try {
    const ContractBase = await hre.ethers.getContractFactory("ContractBase");
    const contractBase = await ContractBase.deploy();
    await contractBase.waitForDeployment();
    
    const contractBaseAddress = await contractBase.getAddress();
    deployedContracts.ContractBase = contractBaseAddress;
    console.log("✅ ContractBase deployed to:", contractBaseAddress);
    
    // ガス使用量記録
    const deployTx2 = await contractBase.deploymentTransaction();
    if (deployTx2) {
        const receipt2 = await deployTx2.wait();
        logGasUsage("ContractBase Deploy", receipt2, "状態管理モジュール");
    }
    
    // 手順書Step 2確認項目: owner確認（重要！）
    const owner = await contractBase.owner();
    console.log("   📋 ContractBase owner:", owner);
    console.log("   📋 Deployer address:", deployer.address);
    console.log("   📋 Owner確認:", owner.toLowerCase() === deployer.address.toLowerCase() ? "✅ 正しい" : "❌ 不正");
    
    if (owner.toLowerCase() !== deployer.address.toLowerCase()) {
        throw new Error("ContractBase owner verification failed");
    }
    
} catch (error) {
    console.error("❌ ContractBase デプロイ失敗:", error.message);
    throw error;
}

// 3. StakingContract
console.log("\n🎯 Step 3: StakingContract をデプロイ中...");
try {
    const StakingContract = await hre.ethers.getContractFactory("StakingContract");
    const stakingContract = await StakingContract.deploy("1000000000000000"); // 手順書準拠
    await stakingContract.waitForDeployment();
    
    const stakingContractAddress = await stakingContract.getAddress();
    deployedContracts.StakingContract = stakingContractAddress;
    console.log("✅ StakingContract deployed to:", stakingContractAddress);
    
    // ガス使用量記録
    const deployTx3 = await stakingContract.deploymentTransaction();
    if (deployTx3) {
        const receipt3 = await deployTx3.wait();
        logGasUsage("StakingContract Deploy", receipt3, "ステーキング・貢献度管理");
    }
    
    // 手順書Step 3確認項目: 設定確認
    const rewardRate = await stakingContract.rewardRate();
    console.log("   📋 RewardRate:", rewardRate.toString());
    console.log("   📋 期待値: 1000000000000000");
    console.log("   📋 設定確認:", rewardRate.toString() === "1000000000000000" ? "✅ 正しい" : "❌ 不正");
    
} catch (error) {
    console.error("❌ StakingContract デプロイ失敗:", error.message);
    throw error;
}

// ========================================
// Phase 2: 依存モジュールのデプロイ（修正版）
// ========================================

console.log("\n" + "=".repeat(50));
console.log("📦 Phase 2: 依存モジュールのデプロイ");
console.log("=".repeat(50));

// 4. PaymentFlow (SignatureVerifier + ContractBase依存)
console.log("\n💳 Step 4: PaymentFlow をデプロイ中...");
try {
    console.log("   📋 引数: SignatureVerifier =", deployedContracts.SignatureVerifier);
    console.log("   📋 引数: StateManager =", deployedContracts.ContractBase);
    
    const PaymentFlow = await hre.ethers.getContractFactory("PaymentFlow");
    const paymentFlow = await PaymentFlow.deploy(
        deployedContracts.SignatureVerifier,
        deployedContracts.ContractBase
    );
    await paymentFlow.waitForDeployment();
    
    const paymentFlowAddress = await paymentFlow.getAddress();
    deployedContracts.PaymentFlow = paymentFlowAddress;
    console.log("✅ PaymentFlow deployed to:", paymentFlowAddress);
    
    // ガス使用量記録
    const deployTx4 = await paymentFlow.deploymentTransaction();
    if (deployTx4) {
        const receipt4 = await deployTx4.wait();
        logGasUsage("PaymentFlow Deploy", receipt4, "支払い処理・エスクロー");
    }
    
    // 設定確認
    const owner = await paymentFlow.owner();
    console.log("   📋 PaymentFlow owner:", owner);
    console.log("   📋 Owner確認:", owner.toLowerCase() === deployer.address.toLowerCase() ? "✅ 正しい" : "❌ 不正");
    
} catch (error) {
    console.error("❌ PaymentFlow デプロイ失敗:", error.message);
    throw error;
}

// 5. FreelanceContractFactory
console.log("\n🏭 Step 5: FreelanceContractFactory をデプロイ中...");
try {
    const FreelanceContractFactory = await hre.ethers.getContractFactory("FreelanceContractFactory");
    const factory = await FreelanceContractFactory.deploy(0); // creationFee = 0（手順書準拠）
    await factory.waitForDeployment();
    
    const factoryAddress = await factory.getAddress();
    deployedContracts.FreelanceContractFactory = factoryAddress;
    console.log("✅ FreelanceContractFactory deployed to:", factoryAddress);
    
    // ガス使用量記録
    const deployTx5 = await factory.deploymentTransaction();
    if (deployTx5) {
        const receipt5 = await deployTx5.wait();
        logGasUsage("FreelanceContractFactory Deploy", receipt5, "ファクトリーパターン実装");
    }
    
    // 設定確認
    const creationFee = await factory.creationFee();
    console.log("   📋 CreationFee:", creationFee.toString());
    console.log("   📋 期待値: 0");
    console.log("   📋 設定確認:", creationFee.toString() === "0" ? "✅ 正しい" : "❌ 不正");
    
} catch (error) {
    console.error("❌ FreelanceContractFactory デプロイ失敗:", error.message);
    throw error;
}

// ========================================
// Phase 3: Factory設定（修正版・手順書完全準拠）
// ========================================

console.log("\n" + "=".repeat(50));
console.log("⚙️  Phase 3: Factory設定");
console.log("=".repeat(50));

// 6. registerModules（手順書Step 6）
console.log("\n🔗 Step 6: registerModules 実行中...");
try {
    console.log("   📋 ContractBase:", deployedContracts.ContractBase);
    console.log("   📋 PaymentFlow:", deployedContracts.PaymentFlow);
    console.log("   📋 SignatureVerifier:", deployedContracts.SignatureVerifier);
    
    const factory = await hre.ethers.getContractAt("FreelanceContractFactory", deployedContracts.FreelanceContractFactory);
    const registerTx = await factory.registerModules(
        deployedContracts.ContractBase,
        deployedContracts.PaymentFlow,
        deployedContracts.SignatureVerifier
    );
    const registerReceipt = await registerTx.wait();
    console.log("✅ registerModules 完了");
    logGasUsage("registerModules", registerReceipt, "モジュール登録");
    
    // 手順書Step 6確認項目
    const registeredModules = await factory.getRegisteredModules();
    console.log("\n   📋 登録確認:");
    console.log("   ContractBase:", registeredModules[0] === deployedContracts.ContractBase ? "✅ 正しい" : "❌ 不正");
    console.log("   PaymentFlow:", registeredModules[1] === deployedContracts.PaymentFlow ? "✅ 正しい" : "❌ 不正");
    console.log("   SignatureVerifier:", registeredModules[2] === deployedContracts.SignatureVerifier ? "✅ 正しい" : "❌ 不正");
    
} catch (error) {
    console.error("❌ registerModules 失敗:", error.message);
    throw error;
}

// 7. setStakingModule（手順書Step 7）
console.log("\n🎯 Step 7: setStakingModule 実行中...");
try {
    console.log("   📋 StakingContract:", deployedContracts.StakingContract);
    
    const factory = await hre.ethers.getContractAt("FreelanceContractFactory", deployedContracts.FreelanceContractFactory);
    const setStakingTx = await factory.setStakingModule(deployedContracts.StakingContract);
    const setStakingReceipt = await setStakingTx.wait();
    console.log("✅ setStakingModule 完了");
    logGasUsage("setStakingModule", setStakingReceipt, "ステーキングモジュール設定");
    
    // 手順書Step 7確認項目
    const stakingModule = await factory.stakingContractModule();
    console.log("   📋 StakingModule登録確認:", stakingModule === deployedContracts.StakingContract ? "✅ 正しい" : "❌ 不正");
    
} catch (error) {
    console.error("❌ setStakingModule 失敗:", error.message);
    throw error;
}

// 7.5 & 7.6: オーナーシップ移譲（手順書Step 7.5-7.6）
console.log("\n👤 Step 7.5-7.6: オーナーシップ移譲実行中...");
try {
    const contractBase = await hre.ethers.getContractAt("ContractBase", deployedContracts.ContractBase);
    const paymentFlow = await hre.ethers.getContractAt("PaymentFlow", deployedContracts.PaymentFlow);
    const factoryAddress = deployedContracts.FreelanceContractFactory;
    
    console.log("   📋 ContractBase ownership → Factory");
    console.log("      移譲先:", factoryAddress);
    const transferOwnership1Tx = await contractBase.transferOwnership(factoryAddress);
    const transferOwnership1Receipt = await transferOwnership1Tx.wait();
    console.log("   ✅ ContractBase ownership 移譲完了");
    logGasUsage("transferOwnership ContractBase", transferOwnership1Receipt, "ContractBase所有権移譲");
    
    console.log("   📋 PaymentFlow ownership → Factory");
    console.log("      移譲先:", factoryAddress);
    const transferOwnership2Tx = await paymentFlow.transferOwnership(factoryAddress);
    const transferOwnership2Receipt = await transferOwnership2Tx.wait();
    console.log("   ✅ PaymentFlow ownership 移譲完了");
    logGasUsage("transferOwnership PaymentFlow", transferOwnership2Receipt, "PaymentFlow所有権移譲");
    
    // 手順書Step 7.5-7.6確認項目
    const contractBaseOwner = await contractBase.owner();
    const paymentFlowOwner = await paymentFlow.owner();
    console.log("\n   📋 オーナーシップ移譲確認:");
    console.log("   ContractBase owner:", contractBaseOwner === factoryAddress ? "✅ Factory" : "❌ 失敗");
    console.log("   PaymentFlow owner:", paymentFlowOwner === factoryAddress ? "✅ Factory" : "❌ 失敗");
    
    if (contractBaseOwner !== factoryAddress || paymentFlowOwner !== factoryAddress) {
        throw new Error("Ownership transfer verification failed");
    }
    
} catch (error) {
    console.error("❌ オーナーシップ移譲 失敗:", error.message);
    throw error;
}

// ========================================
// Phase 4: 設定確認（修正版・手順書完全準拠）
// ========================================

console.log("\n" + "=".repeat(50));
console.log("🔍 Phase 4: 設定確認（手順書準拠）");
console.log("=".repeat(50));

try {
    const factory = await hre.ethers.getContractAt("FreelanceContractFactory", deployedContracts.FreelanceContractFactory);
    const contractBase = await hre.ethers.getContractAt("ContractBase", deployedContracts.ContractBase);
    const paymentFlow = await hre.ethers.getContractAt("PaymentFlow", deployedContracts.PaymentFlow);
    
    // 手順書準拠の完全チェック
    console.log("\n📋 手順書 Phase 2 完了チェック:");
    
    // 1. registerModules確認
    const registeredModules = await factory.getRegisteredModules();
    const step6Success = registeredModules[0] === deployedContracts.ContractBase && 
                        registeredModules[1] === deployedContracts.PaymentFlow && 
                        registeredModules[2] === deployedContracts.SignatureVerifier;
    console.log(`   - [${step6Success ? '✅' : '❌'}] registerModules 実行成功`);
    
    // 2. setStakingModule確認
    const stakingModule = await factory.stakingContractModule();
    const step7Success = stakingModule === deployedContracts.StakingContract;
    console.log(`   - [${step7Success ? '✅' : '❌'}] setStakingModule 実行成功`);
    
    // 3. オーナーシップ移譲確認
    const contractBaseOwner = await contractBase.owner();
    const paymentFlowOwner = await paymentFlow.owner();
    const ownershipSuccess = contractBaseOwner === deployedContracts.FreelanceContractFactory && 
                            paymentFlowOwner === deployedContracts.FreelanceContractFactory;
    console.log(`   - [${ownershipSuccess ? '✅' : '❌'}] オーナーシップ移譲完了`);
    
    // 総合判定
    const allSuccess = step6Success && step7Success && ownershipSuccess;
    console.log(`\n🎯 Phase 2 総合結果: ${allSuccess ? '✅ 全て成功' : '❌ 一部失敗'}`);
    
    if (!allSuccess) {
        console.log("\n⚠️  以下の問題を解決してから次に進んでください:");
        if (!step6Success) console.log("   - registerModules の確認・再実行");
        if (!step7Success) console.log("   - setStakingModule の確認・再実行");
        if (!ownershipSuccess) console.log("   - オーナーシップ移譲の確認・再実行");
        throw new Error("Phase 2 setup verification failed");
    }
    
    console.log("\n🚀 デプロイ・設定完了！次のStep 8（契約作成）が実行可能です！");
    
} catch (error) {
    console.error("❌ 設定確認でエラー:", error.message);
    throw error;
}
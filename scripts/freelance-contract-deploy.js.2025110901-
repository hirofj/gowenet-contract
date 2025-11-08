const hre = require("hardhat");

async function main() {
    console.log("=".repeat(60));
    console.log("🚀 GOWENET オブジェクト指向型スマートコントラクト デプロイ専用");
    console.log("=".repeat(60));

    // ========================================
    // アカウント情報取得
    // ========================================
    
    const [deployer, user1, user2] = await hre.ethers.getSigners();
    
    console.log("\n📋 アカウント情報:");
    console.log("  Deployer (gowenet-owner):", deployer.address);
    console.log("  User1 (client):", user1.address);
    console.log("  User2 (freelancer):", user2.address);
    
    // 残高確認
    const deployerBalance = await hre.ethers.provider.getBalance(deployer.address);
    const user1Balance = await hre.ethers.provider.getBalance(user1.address);
    const user2Balance = await hre.ethers.provider.getBalance(user2.address);
    
    console.log("\n💰 残高情報:");
    console.log("  Deployer:", hre.ethers.formatEther(deployerBalance), "GOWE");
    console.log("  User1:", hre.ethers.formatEther(user1Balance), "GOWE");
    console.log("  User2:", hre.ethers.formatEther(user2Balance), "GOWE");
    
    // デプロイ結果を記録するオブジェクト
    const deployedContracts = {};
    const gasUsageLog = [];
    let totalGasUsed = 0n;
    
    // ガス使用量記録用ヘルパー関数
    function logGasUsage(stepName, receipt, description = "") {
        const gasUsed = receipt.gasUsed;
        const gasPrice = receipt.gasPrice || receipt.effectiveGasPrice || 0n;
        const gasCost = gasUsed * gasPrice;
        
        totalGasUsed += gasUsed;
        
        const gasRecord = {
            step: stepName,
            description: description,
            gasUsed: gasUsed.toString(),
            gasPrice: gasPrice.toString(),
            gasCostWei: gasCost.toString(),
            gasCostGOWE: hre.ethers.formatEther(gasCost),
            transactionHash: receipt.hash,
            blockNumber: receipt.blockNumber
        };
        
        gasUsageLog.push(gasRecord);
        
        console.log(`   ⛽ ガス使用量: ${gasUsed.toLocaleString()} gas (${hre.ethers.formatEther(gasCost)} GOWE)`);
        return gasRecord;
    }
    
    // ========================================
    // Phase 1: 独立モジュールのデプロイ
    // ========================================
    
    console.log("\n" + "=".repeat(50));
    console.log("📦 Phase 1: 独立モジュールのデプロイ");
    console.log("=".repeat(50));
    
    // 1. SignatureVerifier
    console.log("\n🔐 1. SignatureVerifier をデプロイ中...");
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
    
    // 2. ContractBase
    console.log("\n📊 2. ContractBase をデプロイ中...");
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
    
    // ContractBase初期状態確認
    
    // 3. StakingContract
    console.log("\n🎯 3. StakingContract をデプロイ中...");
    const StakingContract = await hre.ethers.getContractFactory("StakingContract");
    const stakingContract = await StakingContract.deploy("1000000000000000");
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
    
    // StakingContract設定確認
    const rewardRate = await stakingContract.rewardRate();
    console.log("   📋 RewardRate:", rewardRate.toString());
    
    // ========================================
    // Phase 2: 依存モジュールのデプロイ
    // ========================================
    
    console.log("\n" + "=".repeat(50));
    console.log("📦 Phase 2: 依存モジュールのデプロイ");
    console.log("=".repeat(50));
    
    // 4. PaymentFlow (SignatureVerifier + ContractBase依存)
    console.log("\n💳 4. PaymentFlow をデプロイ中...");
    console.log("   📋 引数: SignatureVerifier =", signatureVerifierAddress);
    console.log("   📋 引数: StateManager =", contractBaseAddress);
    
    const PaymentFlow = await hre.ethers.getContractFactory("PaymentFlow");
    const paymentFlow = await PaymentFlow.deploy(
        signatureVerifierAddress,
        contractBaseAddress
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
    
    // 5. FreelanceContractFactory
    console.log("\n🏭 5. FreelanceContractFactory をデプロイ中...");
    const FreelanceContractFactory = await hre.ethers.getContractFactory("FreelanceContractFactory");
    const factory = await FreelanceContractFactory.deploy(0); // creationFee = 0
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
    
    // ========================================
    // Phase 3: Factory設定（重要）
    // ========================================
    
    console.log("\n" + "=".repeat(50));
    console.log("⚙️  Phase 3: Factory設定");
    console.log("=".repeat(50));
    
    // 6. registerModules
    console.log("\n🔗 6. registerModules 実行中...");
    console.log("   📋 ContractBase:", contractBaseAddress);
    console.log("   📋 PaymentFlow:", paymentFlowAddress);
    console.log("   📋 SignatureVerifier:", signatureVerifierAddress);
    
    const registerTx = await factory.registerModules(
        contractBaseAddress,
        paymentFlowAddress,
        signatureVerifierAddress
    );
    const registerReceipt = await registerTx.wait();
    console.log("✅ registerModules 完了");
    logGasUsage("registerModules", registerReceipt, "モジュール登録");
    
    // 7. setStakingModule
    console.log("\n🎯 7. setStakingModule 実行中...");
    console.log("   📋 StakingContract:", stakingContractAddress);
    
    const setStakingTx = await factory.setStakingModule(stakingContractAddress);
    const setStakingReceipt = await setStakingTx.wait();
    console.log("✅ setStakingModule 完了");
    logGasUsage("setStakingModule", setStakingReceipt, "ステーキングモジュール設定");
    
    // 8. オーナーシップ移譲（重要）
    console.log("\n👤 8. オーナーシップ移譲実行中...");
    
    console.log("   📋 ContractBase ownership → Factory");
    const transferOwnership1Tx = await contractBase.transferOwnership(factoryAddress);
    const transferOwnership1Receipt = await transferOwnership1Tx.wait();
    console.log("   ✅ ContractBase ownership 移譲完了");
    logGasUsage("transferOwnership ContractBase", transferOwnership1Receipt, "ContractBase所有権移譲");
    
    console.log("   📋 PaymentFlow ownership → Factory");
    const transferOwnership2Tx = await paymentFlow.transferOwnership(factoryAddress);
    const transferOwnership2Receipt = await transferOwnership2Tx.wait();
    console.log("   ✅ PaymentFlow ownership 移譲完了");
    logGasUsage("transferOwnership PaymentFlow", transferOwnership2Receipt, "PaymentFlow所有権移譲");
    
    // ========================================
    // Phase 4: 設定確認
    // ========================================
    
    console.log("\n" + "=".repeat(50));
    console.log("🔍 Phase 4: 設定確認");
    console.log("=".repeat(50));
    
    try {
        // Factory設定確認
        const registeredModules = await factory.getRegisteredModules();
        console.log("\n📋 登録されたモジュール:");
        console.log("   ContractBase:", registeredModules[0]);
        console.log("   PaymentFlow:", registeredModules[1]);
        console.log("   SignatureVerifier:", registeredModules[2]);
        
        // オーナーシップ確認
        const contractBaseOwner = await contractBase.owner();
        const paymentFlowOwner = await paymentFlow.owner();
        console.log("\n👤 オーナーシップ確認:");
        console.log("   ContractBase owner:", contractBaseOwner);
        console.log("   PaymentFlow owner:", paymentFlowOwner);
        console.log("   Factory address:", factoryAddress);
        console.log("   オーナーシップ移譲:", contractBaseOwner === factoryAddress && paymentFlowOwner === factoryAddress ? "✅ 成功" : "❌ 失敗");
        
    } catch (error) {
        console.log("⚠️  設定確認でエラー:", error.message);
    }
    
    // ========================================
    // Phase 5: 結果保存
    // ========================================
    
    console.log("\n" + "=".repeat(50));
    console.log("💾 Phase 5: デプロイ結果保存");
    console.log("=".repeat(50));
    
    const deploymentInfo = {
        architecture: "object_oriented",
        network: "gowenet",
        chainId: 98888,
        deployer: deployer.address,
        deploymentTime: new Date().toISOString(),
        accounts: {
            deployer: deployer.address,
            client: user1.address,
            freelancer: user2.address
        },
        contracts: deployedContracts,
        balances: {
            deployer: hre.ethers.formatEther(deployerBalance),
            user1: hre.ethers.formatEther(user1Balance),
            user2: hre.ethers.formatEther(user2Balance)
        },
        gasUsage: {
            totalGasUsed: totalGasUsed.toString(),
            totalGasCostGOWE: hre.ethers.formatEther(
                gasUsageLog.reduce((sum, record) => sum + BigInt(record.gasCostWei), 0n)
            ),
            detailedLog: gasUsageLog
        }
    };
    
    // JSON形式で保存情報を出力
    console.log("\n📄 deployment-info-oop.json の内容:");
    console.log(JSON.stringify(deploymentInfo, null, 2));
    
    // ファイル書き込み
    const fs = require('fs');
    try {
        fs.writeFileSync('deployment-info-oop.json', JSON.stringify(deploymentInfo, null, 2));
        console.log("✅ deployment-info-oop.json に保存完了");
    } catch (error) {
        console.log("⚠️  ファイル保存エラー:", error.message);
    }
    
    // ========================================
    // 完了レポート
    // ========================================
    
    console.log("\n" + "=".repeat(60));
    console.log("🎉 GOWENET オブジェクト指向型スマートコントラクト デプロイ完了!");
    console.log("=".repeat(60));
    
    console.log("\n📋 デプロイされたコントラクト一覧:");
    Object.entries(deployedContracts).forEach(([name, address]) => {
        console.log(`   ${name}: ${address}`);
    });
    
    console.log("\n⛽ ガス使用量サマリー:");
    console.log(`   総ガス使用量: ${totalGasUsed.toLocaleString()} gas`);
    console.log(`   総ガス代金: ${hre.ethers.formatEther(
        gasUsageLog.reduce((sum, record) => sum + BigInt(record.gasCostWei), 0n)
    )} GOWE`);
    
    console.log("\n📊 ステップ別ガス使用量:");
    gasUsageLog.forEach((record, index) => {
        console.log(`   ${index + 1}. ${record.step}: ${BigInt(record.gasUsed).toLocaleString()} gas (${record.gasCostGOWE} GOWE)`);
    });
    
    console.log("\n🔍 アーキテクチャ比較用データ:");
    console.log("   アーキテクチャ: オブジェクト指向型（モジュール分離）");
    console.log("   コントラクト数: 5個");
    console.log("   デプロイステップ: 8ステップ");
    console.log("   デプロイガス使用量:", totalGasUsed.toLocaleString(), "gas");
    
    console.log("\n🔗 次のステップ:");
    console.log("1. テスト実行: npx hardhat run scripts/test-oop.js --network gowenet");
    console.log("2. モノリシック型との比較分析");
    console.log("3. ガス使用量・コストの比較");
    
    console.log("\n📖 使用例:");
    console.log("// Factory経由での新しい契約作成");
    console.log(`const factory = await hre.ethers.getContractAt("FreelanceContractFactory", "${factoryAddress}");`);
    console.log(`await factory.createContract(client, freelancer, amount, description);`);
    
    console.log("\n🚀 オブジェクト指向型デプロイ成功 - テスト実行可能!");
}

// エラーハンドリング
main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error("\n❌ オブジェクト指向型デプロイ失敗:");
        console.error(error);
        process.exit(1);
    });


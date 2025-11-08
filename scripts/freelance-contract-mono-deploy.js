const hre = require("hardhat");

async function main() {
    console.log("=".repeat(60));
    console.log("🏗️  GOWENET モノリシック型スマートコントラクト デプロイ専用");
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
    // Phase 1: モノリシック型コントラクトデプロイ
    // ========================================
    
    console.log("\n" + "=".repeat(50));
    console.log("🏗️  Phase 1: モノリシック型コントラクトデプロイ");
    console.log("=".repeat(50));
    
    console.log("\n🎯 FreelanceContractMonolithic をデプロイ中...");
    console.log("   📋 引数: partyA (client) =", user1.address);
    console.log("   📋 引数: partyB (freelancer) =", user2.address);
    console.log("   📋 引数: paymentAmount = 1.0 GOWE");
    console.log("   📋 引数: workDescription = Test Website Development Project");
    
    const FreelanceContractMonolithic = await hre.ethers.getContractFactory("FreelanceContractMonolithic");
    const monolithicContract = await FreelanceContractMonolithic.deploy(
        user1.address, // partyA (client)
        user2.address, // partyB (freelancer)
        hre.ethers.parseEther("1.0"), // 1 GOWE
        "Test Website Development Project" // workDescription
    );
    await monolithicContract.waitForDeployment();
    
    const monolithicContractAddress = await monolithicContract.getAddress();
    deployedContracts.FreelanceContractMonolithic = monolithicContractAddress;
    console.log("✅ FreelanceContractMonolithic deployed to:", monolithicContractAddress);
    
    // ガス使用量記録
    const deployTx = await monolithicContract.deploymentTransaction();
    if (deployTx) {
        const receipt = await deployTx.wait();
        logGasUsage("FreelanceContractMonolithic Deploy", receipt, "モノリシック型契約（全機能統合）");
    }
    
    // ========================================
    // Phase 2: 初期状態確認
    // ========================================
    
    console.log("\n" + "=".repeat(50));
    console.log("🔍 Phase 2: 初期状態確認");
    console.log("=".repeat(50));
    
    try {
        // 契約情報確認
        const contractInfo = await monolithicContract.getContractInfo();
        console.log("\n📋 契約情報確認:");
        console.log("   PartyA (client):", contractInfo[0]);
        console.log("   PartyB (freelancer):", contractInfo[1]);
        console.log("   Payment Amount:", hre.ethers.formatEther(contractInfo[2]), "GOWE");
        console.log("   Created At:", new Date(Number(contractInfo[3]) * 1000).toISOString());
        console.log("   State:", contractInfo[4].toString(), "(Created)");
        console.log("   State Change Count:", contractInfo[5].toString());
        
        // 追加情報確認
        const freelanceInfo = await monolithicContract.getFreelanceInfo();
        console.log("\n📋 フリーランス契約情報:");
        console.log("   Payment Amount:", hre.ethers.formatEther(freelanceInfo[0]), "GOWE");
        console.log("   Work Description:", freelanceInfo[1]);
        console.log("   Work Status:", freelanceInfo[2].toString(), "(NotStarted)");
        console.log("   Escrow Active:", freelanceInfo[3]);
        console.log("   Escrow Amount:", hre.ethers.formatEther(freelanceInfo[4]), "GOWE");
        
    } catch (error) {
        console.log("⚠️  初期状態確認でエラー:", error.message);
    }
    
    // ========================================
    // Phase 3: 結果保存
    // ========================================
    
    console.log("\n" + "=".repeat(50));
    console.log("💾 Phase 3: デプロイ結果保存");
    console.log("=".repeat(50));
    
    const deploymentInfo = {
        architecture: "monolithic",
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
    console.log("\n📄 deployment-info-monolithic.json の内容:");
    console.log(JSON.stringify(deploymentInfo, null, 2));
    
    // ファイル書き込み
    const fs = require('fs');
    try {
        fs.writeFileSync('deployment-info-monolithic.json', JSON.stringify(deploymentInfo, null, 2));
        console.log("✅ deployment-info-monolithic.json に保存完了");
    } catch (error) {
        console.log("⚠️  ファイル保存エラー:", error.message);
    }
    
    // ========================================
    // 完了レポート
    // ========================================
    
    console.log("\n" + "=".repeat(60));
    console.log("🎉 GOWENET モノリシック型スマートコントラクト デプロイ完了!");
    console.log("=".repeat(60));
    
    console.log("\n📋 デプロイされたコントラクト:");
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
    console.log("   アーキテクチャ: モノリシック型（単一コントラクト）");
    console.log("   コントラクト数: 1");
    console.log("   デプロイステップ: 1");
    console.log("   デプロイガス使用量:", totalGasUsed.toLocaleString(), "gas");
    
    console.log("\n🔗 次のステップ:");
    console.log("1. テスト実行: npx hardhat run scripts/test-monolithic.js --network gowenet");
    console.log("2. オブジェクト指向型との比較分析");
    console.log("3. ガス使用量・コストの比較");
    
    console.log("\n📖 使用例:");
    console.log("// デプロイされた契約への接続");
    console.log(`const contract = await hre.ethers.getContractAt("FreelanceContractMonolithic", "${monolithicContractAddress}");`);
    
    console.log("\n🎯 モノリシック型デプロイ成功 - テスト実行可能!");
}

// エラーハンドリング
main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error("\n❌ モノリシック型デプロイ失敗:");
        console.error(error);
        process.exit(1);
    });


const hre = require("hardhat");

// 新規デプロイ関数
async function deployNewMonolithicContract() {
    console.log("🏗️  新規モノリシック型コントラクトをデプロイ中...");
    
    const [deployer, user1, user2] = await hre.ethers.getSigners();
    
    console.log("📋 アカウント情報:");
    console.log("  Deployer:", deployer.address);
    console.log("  Client:", user1.address);
    console.log("  Freelancer:", user2.address);
    
    // デプロイ実行
    const FreelanceContractMonolithic = await hre.ethers.getContractFactory("FreelanceContractMonolithic");
    const monolithicContract = await FreelanceContractMonolithic.deploy(
        user1.address, // partyA (client)
        user2.address, // partyB (freelancer)
        hre.ethers.parseEther("1.0"), // 1 GOWE
        "Test Website Development Project" // workDescription
    );
    await monolithicContract.waitForDeployment();
    
    const contractAddress = await monolithicContract.getAddress();
    console.log("✅ 新規契約デプロイ完了:", contractAddress);
    
    // ガス使用量記録
    const deployTx = await monolithicContract.deploymentTransaction();
    let gasUsed = 0n;
    if (deployTx) {
        const receipt = await deployTx.wait();
        gasUsed = receipt.gasUsed;
        console.log("⛽ デプロイガス使用量:", gasUsed.toLocaleString(), "gas");
    }
    
    // deployment-info-monolithic.json を更新
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
        contracts: {
            FreelanceContractMonolithic: contractAddress
        },
        gasUsage: {
            totalGasUsed: gasUsed.toString(),
            totalGasCostGOWE: hre.ethers.formatEther(gasUsed * 25000000001n), // 概算
            detailedLog: [{
                step: "FreelanceContractMonolithic Deploy",
                description: "新規デプロイ（テストスクリプト内）",
                gasUsed: gasUsed.toString(),
                gasPrice: "25000000001",
                gasCostWei: (gasUsed * 25000000001n).toString(),
                gasCostGOWE: hre.ethers.formatEther(gasUsed * 25000000001n),
                transactionHash: deployTx?.hash || "",
                blockNumber: deployTx ? (await deployTx.wait()).blockNumber : 0
            }]
        }
    };
    
    // ファイル保存
    const fs = require('fs');
    fs.writeFileSync('deployment-info-monolithic.json', JSON.stringify(deploymentInfo, null, 2));
    console.log("💾 deployment-info-monolithic.json を更新しました");
    
    return contractAddress;
}

async function main() {
    console.log("=".repeat(60));
    console.log("🧪 GOWENET モノリシック型スマートコントラクト テスト実行");
    console.log("=".repeat(60));

    // 状態リセット機能の確認
    const FORCE_NEW_DEPLOY = process.env.FORCE_NEW_DEPLOY === 'true';
    
    if (FORCE_NEW_DEPLOY) {
        console.log("🔄 FORCE_NEW_DEPLOY=true: 新規デプロイを実行します...\n");
        
        try {
            // 新規デプロイを実行
            await deployNewMonolithicContract();
            console.log("✅ 新規デプロイ完了\n");
        } catch (error) {
            console.error("❌ 新規デプロイに失敗:", error.message);
            return;
        }
    }

    // デプロイ済みコントラクトアドレスを動的取得
    let MONOLITHIC_CONTRACT_ADDRESS;
    
    try {
        const fs = require('fs');
        const deploymentInfo = JSON.parse(fs.readFileSync('deployment-info-monolithic.json', 'utf8'));
        MONOLITHIC_CONTRACT_ADDRESS = deploymentInfo.contracts.FreelanceContractMonolithic;
        
        if (!MONOLITHIC_CONTRACT_ADDRESS) {
            throw new Error("FreelanceContractMonolithic address not found in deployment-info-monolithic.json");
        }
        
        console.log("📄 deployment-info-monolithic.json から読み込み成功");
        
    } catch (error) {
        console.error("❌ deployment-info-monolithic.json の読み込みに失敗:");
        console.error("   エラー:", error.message);
        console.error("\n💡 解決方法:");
        console.error("   1. 新規デプロイで実行:");
        console.error("      FORCE_NEW_DEPLOY=true npx hardhat run scripts/test-monolithic.js --network gowenet");
        console.error("   2. または手動でデプロイ:");
        console.error("      npx hardhat run scripts/deploy-monolithic-only.js --network gowenet");
        return;
    }

    // ========================================
    // アカウント情報取得
    // ========================================
    
    const [deployer, user1, user2] = await hre.ethers.getSigners();
    
    console.log("\n📋 アカウント情報:");
    console.log("  User1 (client):", user1.address);
    console.log("  User2 (freelancer):", user2.address);
    console.log("  Contract Address:", MONOLITHIC_CONTRACT_ADDRESS);
    
    // デプロイ情報との整合性確認
    try {
        const fs = require('fs');
        const deploymentInfo = JSON.parse(fs.readFileSync('deployment-info-monolithic.json', 'utf8'));
        
        console.log("\n📄 デプロイ情報確認:");
        console.log("  デプロイ時刻:", deploymentInfo.deploymentTime);
        console.log("  デプロイャー:", deploymentInfo.deployer);
        console.log("  期待クライアント:", deploymentInfo.accounts.client);
        console.log("  期待フリーランサー:", deploymentInfo.accounts.freelancer);
        
        // アカウント整合性チェック
        if (deploymentInfo.accounts.client.toLowerCase() !== user1.address.toLowerCase()) {
            console.log("⚠️  警告: クライアントアドレスが deployment-info と異なります");
            console.log("   deployment-info:", deploymentInfo.accounts.client);
            console.log("   現在のuser1:", user1.address);
        }
        
        if (deploymentInfo.accounts.freelancer.toLowerCase() !== user2.address.toLowerCase()) {
            console.log("⚠️  警告: フリーランサーアドレスが deployment-info と異なります");
            console.log("   deployment-info:", deploymentInfo.accounts.freelancer);
            console.log("   現在のuser2:", user2.address);
        }
        
    } catch (error) {
        console.log("⚠️  デプロイ情報の詳細確認でエラー:", error.message);
    }
    
    // 残高確認
    const user1Balance = await hre.ethers.provider.getBalance(user1.address);
    const user2Balance = await hre.ethers.provider.getBalance(user2.address);
    
    console.log("\n💰 残高情報:");
    console.log("  User1:", hre.ethers.formatEther(user1Balance), "GOWE");
    console.log("  User2:", hre.ethers.formatEther(user2Balance), "GOWE");
    
    // コントラクトインスタンス取得
    const contract = await hre.ethers.getContractAt("FreelanceContractMonolithic", MONOLITHIC_CONTRACT_ADDRESS);
    
    // ガス使用量記録
    const gasUsageLog = [];
    let totalGasUsed = 0n;
    
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
    // Phase 1: 現在の状態確認
    // ========================================
    
    console.log("\n" + "=".repeat(50));
    console.log("🔍 Phase 1: 現在の状態確認");
    console.log("=".repeat(50));
    
    try {
        const contractInfo = await contract.getContractInfo();
        const freelanceInfo = await contract.getFreelanceInfo();
        
        console.log("\n📋 現在の契約状態:");
        console.log("   Contract State:", contractInfo[4].toString());
        console.log("   Work Status:", freelanceInfo[2].toString());
        console.log("   PartyA (client):", contractInfo[0]);
        console.log("   PartyB (freelancer):", contractInfo[1]);
        console.log("   Payment Amount:", hre.ethers.formatEther(contractInfo[2]), "GOWE");
        console.log("   Escrow Active:", freelanceInfo[3]);
        
        // 期待される状態かチェック
        const expectedClient = user1.address;
        const expectedFreelancer = user2.address;
        
        if (contractInfo[0].toLowerCase() !== expectedClient.toLowerCase()) {
            console.log("⚠️  警告: 期待されるクライアントアドレスと異なります");
            console.log("   期待値:", expectedClient);
            console.log("   実際値:", contractInfo[0]);
        }
        
        if (contractInfo[1].toLowerCase() !== expectedFreelancer.toLowerCase()) {
            console.log("⚠️  警告: 期待されるフリーランサーアドレスと異なります");
            console.log("   期待値:", expectedFreelancer);
            console.log("   実際値:", contractInfo[1]);
        }
        
    } catch (error) {
        console.log("❌ 状態確認でエラー:", error.message);
        return;
    }
    
    // ========================================
    // Phase 2: 個別機能テスト
    // ========================================
    
    console.log("\n" + "=".repeat(50));
    console.log("🧪 Phase 2: 個別機能テスト");
    console.log("=".repeat(50));
    
    // テスト1: 契約認証・作業開始
    console.log("\n🚀 Test 1: 契約認証・作業開始 (authenticate)");
    try {
        // 現在の状態を再確認
        const currentState = await contract.getState();
        console.log("   📋 実行前の状態:", currentState.toString());
        
        if (currentState.toString() !== "0") {
            console.log("   ⚠️  状態が Created(0) ではありません。スキップします。");
        } else {
            // user1 (client) で実行
            const authenticateTx = await contract.connect(user1).authenticate();
            const authenticateReceipt = await authenticateTx.wait();
            
            console.log("   ✅ 契約認証成功");
            logGasUsage("authenticate", authenticateReceipt, "契約認証・作業開始");
            
            // 状態確認
            const newState = await contract.getState();
            const newWorkStatus = await contract.workStatus();
            console.log("   📋 実行後 Contract State:", newState.toString(), "(InProgress)");
            console.log("   📋 実行後 Work Status:", newWorkStatus.toString(), "(InProgress)");
        }
        
    } catch (error) {
        console.log("   ❌ authenticate エラー:", error.message);
        
        // エラーの詳細情報
        if (error.receipt) {
            console.log("   📋 Transaction Hash:", error.receipt.hash);
            console.log("   📋 Gas Used:", error.receipt.gasUsed.toString());
            console.log("   📋 Status:", error.receipt.status);
        }
    }
    
    // テスト2: 作業成果物の納品
    console.log("\n📦 Test 2: 作業成果物の納品 (deliverWork)");
    try {
        const currentState = await contract.getState();
        console.log("   📋 実行前の状態:", currentState.toString());
        
        if (currentState.toString() !== "1") {
            console.log("   ⚠️  状態が InProgress(1) ではありません。スキップします。");
        } else {
            // user2 (freelancer) で実行
            const deliverTx = await contract.connect(user2).deliverWork("https://example.com/website-preview");
            const deliverReceipt = await deliverTx.wait();
            
            console.log("   ✅ 作業納品成功");
            logGasUsage("deliverWork", deliverReceipt, "作業成果物の納品");
            
            // 状態確認
            const newState = await contract.getState();
            const newWorkStatus = await contract.workStatus();
            console.log("   📋 実行後 Contract State:", newState.toString(), "(Delivered)");
            console.log("   📋 実行後 Work Status:", newWorkStatus.toString(), "(UnderReview)");
            
            // 納品物確認
            const deliverables = await contract.getDeliverables();
            console.log("   📋 Deliverables:", deliverables);
        }
        
    } catch (error) {
        console.log("   ❌ deliverWork エラー:", error.message);
    }
    
    // テスト3: 納品物の承認
    console.log("\n✅ Test 3: 納品物の承認 (approveDeliverable)");
    try {
        const currentWorkStatus = await contract.workStatus();
        console.log("   📋 実行前の Work Status:", currentWorkStatus.toString());
        
        if (currentWorkStatus.toString() !== "2") {
            console.log("   ⚠️  状態が UnderReview(2) ではありません。スキップします。");
        } else {
            // user1 (client) で実行
            const approveTx = await contract.connect(user1).approveDeliverable("https://example.com/website-preview");
            const approveReceipt = await approveTx.wait();
            
            console.log("   ✅ 納品物承認成功");
            logGasUsage("approveDeliverable", approveReceipt, "納品物の承認");
            
            // 状態確認
            const newWorkStatus = await contract.workStatus();
            console.log("   📋 実行後 Work Status:", newWorkStatus.toString(), "(Completed)");
        }
        
    } catch (error) {
        console.log("   ❌ approveDeliverable エラー:", error.message);
    }
    
    // テスト4: 直接支払い
    console.log("\n💳 Test 4: 直接支払い (makeDirectPayment)");
    try {
        const currentState = await contract.getState();
        console.log("   📋 実行前の状態:", currentState.toString());
        
        if (currentState.toString() !== "2") {
            console.log("   ⚠️  状態が Delivered(2) ではありません。スキップします。");
        } else {
            // 支払い前の残高記録
            const freelancerBalanceBefore = await hre.ethers.provider.getBalance(user2.address);
            console.log("   📋 支払い前 Freelancer残高:", hre.ethers.formatEther(freelancerBalanceBefore), "GOWE");
            
            // user1 (client) で実行
            const paymentTx = await contract.connect(user1).makeDirectPayment({ 
                value: hre.ethers.parseEther("1.0") 
            });
            const paymentReceipt = await paymentTx.wait();
            
            console.log("   ✅ 直接支払い成功");
            logGasUsage("makeDirectPayment", paymentReceipt, "直接支払い（1.0 GOWE）");
            
            // 状態確認
            const newState = await contract.getState();
            console.log("   📋 実行後 Contract State:", newState.toString(), "(Paid)");
            
            // 支払い後の残高確認
            const freelancerBalanceAfter = await hre.ethers.provider.getBalance(user2.address);
            console.log("   📋 支払い後 Freelancer残高:", hre.ethers.formatEther(freelancerBalanceAfter), "GOWE");
            
            // 支払い履歴確認
            const paymentHistory = await contract.getPaymentHistory();
            console.log("   📋 Payment History:", paymentHistory.length, "transactions");
        }
        
    } catch (error) {
        console.log("   ❌ makeDirectPayment エラー:", error.message);
    }
    
    // テスト5: 契約完了
    console.log("\n🎉 Test 5: 契約完了 (completeContract)");
    try {
        const currentState = await contract.getState();
        const currentWorkStatus = await contract.workStatus();
        console.log("   📋 実行前 Contract State:", currentState.toString());
        console.log("   📋 実行前 Work Status:", currentWorkStatus.toString());
        
        if (currentState.toString() !== "4") {
            console.log("   ⚠️  状態が Paid(4) ではありません。スキップします。");
        } else if (currentWorkStatus.toString() !== "4") {
            console.log("   ⚠️  Work Status が Completed(4) ではありません。スキップします。");
        } else {
            // user1 (client) で実行
            const completeTx = await contract.connect(user1).completeContract();
            const completeReceipt = await completeTx.wait();
            
            console.log("   ✅ 契約完了成功");
            logGasUsage("completeContract", completeReceipt, "契約完了・貢献度記録");
            
            // 最終状態確認
            const finalState = await contract.getState();
            console.log("   📋 最終 Contract State:", finalState.toString(), "(Completed)");
            
            // 貢献度スコア確認
            const clientScore = await contract.getContributionScore(user1.address);
            const freelancerScore = await contract.getContributionScore(user2.address);
            console.log("   📋 Client Contribution Score:", clientScore.toString(), "seconds");
            console.log("   📋 Freelancer Contribution Score:", freelancerScore.toString(), "seconds");
        }
        
    } catch (error) {
        console.log("   ❌ completeContract エラー:", error.message);
    }
    
    // ========================================
    // Phase 3: 結果サマリー
    // ========================================
    
    console.log("\n" + "=".repeat(50));
    console.log("📊 Phase 3: テスト結果サマリー");
    console.log("=".repeat(50));
    
    console.log("\n⛽ ガス使用量サマリー:");
    console.log(`   総ガス使用量: ${totalGasUsed.toLocaleString()} gas`);
    console.log(`   総ガス代金: ${hre.ethers.formatEther(
        gasUsageLog.reduce((sum, record) => sum + BigInt(record.gasCostWei), 0n)
    )} GOWE`);
    
    console.log("\n📊 実行されたテスト:");
    gasUsageLog.forEach((record, index) => {
        console.log(`   ${index + 1}. ${record.step}: ${BigInt(record.gasUsed).toLocaleString()} gas (${record.gasCostGOWE} GOWE)`);
    });
    
    // 最終状態確認
    try {
        const finalContractInfo = await contract.getContractInfo();
        const finalFreelanceInfo = await contract.getFreelanceInfo();
        
        console.log("\n📋 最終状態:");
        console.log("   Contract State:", finalContractInfo[4].toString());
        console.log("   Work Status:", finalFreelanceInfo[2].toString());
        console.log("   State Change Count:", finalContractInfo[5].toString());
    } catch (error) {
        console.log("⚠️  最終状態確認エラー:", error.message);
    }
    
    // テスト結果保存
    const testResults = {
        contractAddress: MONOLITHIC_CONTRACT_ADDRESS,
        testTime: new Date().toISOString(),
        gasUsage: {
            totalGasUsed: totalGasUsed.toString(),
            totalGasCostGOWE: hre.ethers.formatEther(
                gasUsageLog.reduce((sum, record) => sum + BigInt(record.gasCostWei), 0n)
            ),
            detailedLog: gasUsageLog
        },
        testsExecuted: gasUsageLog.length,
        successfulTests: gasUsageLog.map(log => log.step)
    };
    
    // ファイル保存
    const fs = require('fs');
    try {
        fs.writeFileSync('test-results-monolithic.json', JSON.stringify(testResults, null, 2));
        console.log("\n✅ test-results-monolithic.json に保存完了");
    } catch (error) {
        console.log("⚠️  ファイル保存エラー:", error.message);
    }
    
    console.log("\n🎯 モノリシック型テスト完了!");
}

// エラーハンドリング
main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error("\n❌ テスト実行失敗:");
        console.error(error);
        process.exit(1);
    });


const hre = require("hardhat");
const fs = require('fs');

// 負荷テスト設定
const CONFIG = {
    contractCount: 1,              // 作成する契約数
    delayBetweenContracts: 1000,   // 契約間の待機時間(ms)
    delayBetweenSteps: 500,        // ステップ間の待機時間(ms)
    saveResults: true,              // 結果を保存するか
    verbose: true                  // 詳細ログを表示するか
};

// 統計データ
const stats = {
    total: 0,
    successful: 0,
    failed: 0,
    steps: {
        createContract: { success: 0, failed: 0, totalGas: 0n },
        authenticate: { success: 0, failed: 0, totalGas: 0n },
        deliverWork: { success: 0, failed: 0, totalGas: 0n },
        approveDeliverable: { success: 0, failed: 0, totalGas: 0n },
        makeDirectPayment: { success: 0, failed: 0, totalGas: 0n },
        completeContract: { success: 0, failed: 0, totalGas: 0n }
    },
    contracts: [],
    startTime: null,
    endTime: null
};

async function executeContractLifecycle(factory, deployer, user1, user2, index) {
    const contractData = {
        index,
        address: null,
        status: 'pending',
        steps: {},
        errors: []
    };

    try {
        // Step 1: 契約作成
        if (CONFIG.verbose) console.log(`\n[${index}] 📝 契約作成中...`);
        
        const createTx = await factory.connect(deployer).createContract(
            user1.address,
            user2.address,
            hre.ethers.parseEther("1.0"),
            `Load Test Contract #${index}`
        );
        const createReceipt = await createTx.wait();
        
        // 契約アドレスを取得
        let contractAddress;
        for (const log of createReceipt.logs) {
            try {
                const parsed = factory.interface.parseLog(log);
                if (parsed.name === 'ContractCreated') {
                    contractAddress = parsed.args.contractAddress;
                    break;
                }
            } catch (e) {}
        }
        
        if (!contractAddress) throw new Error('Contract address not found');
        
        contractData.address = contractAddress;
        contractData.steps.createContract = {
            status: 'success',
            gas: createReceipt.gasUsed.toString(),
            txHash: createReceipt.hash
        };
        stats.steps.createContract.success++;
        stats.steps.createContract.totalGas += createReceipt.gasUsed;
        
        if (CONFIG.verbose) console.log(`[${index}] ✅ 契約作成成功: ${contractAddress}`);
        
        // 契約インスタンス取得
        // 新しいproviderで契約インスタンスを再取得してクリーンな状態にする
        const contract = await hre.ethers.getContractAt("FreelanceContract", contractAddress);
        
        await new Promise(resolve => setTimeout(resolve, CONFIG.delayBetweenSteps));
        
        // Step 2: authenticate
        if (CONFIG.verbose) console.log(`[${index}] 🚀 authenticate実行中...`);
        
        const authTx = await contract.connect(user1).authenticate();
        const authReceipt = await authTx.wait();
        
        contractData.steps.authenticate = {
            status: 'success',
            gas: authReceipt.gasUsed.toString(),
            txHash: authReceipt.hash
        };
        stats.steps.authenticate.success++;
        stats.steps.authenticate.totalGas += authReceipt.gasUsed;
        
        if (CONFIG.verbose) console.log(`[${index}] ✅ authenticate成功`);
        
        await new Promise(resolve => setTimeout(resolve, CONFIG.delayBetweenSteps));
        
        // deliverWork用に契約インスタンスを再取得
        const contractForDeliver = await hre.ethers.getContractAt("FreelanceContract", contractAddress);

        // Step 3: deliverWork
        if (CONFIG.verbose) console.log(`[${index}] 📦 deliverWork実行中...`);
        
        const deliverTx = await contractForDeliver.connect(user2).deliverWork(
            `https://example.com/deliverable-${index}`,
            "0x"
        );
        const deliverReceipt = await deliverTx.wait();
        
        contractData.steps.deliverWork = {
            status: 'success',
            gas: deliverReceipt.gasUsed.toString(),
            txHash: deliverReceipt.hash
        };
        stats.steps.deliverWork.success++;
        stats.steps.deliverWork.totalGas += deliverReceipt.gasUsed;
        
        if (CONFIG.verbose) console.log(`[${index}] ✅ deliverWork成功`);
        
        await new Promise(resolve => setTimeout(resolve, CONFIG.delayBetweenSteps));
        
        // Step 4: approveDeliverable
        if (CONFIG.verbose) console.log(`[${index}] ✅ approveDeliverable実行中...`);
        
        const approveTx = await contract.connect(user1).approveDeliverable(
            `https://example.com/deliverable-${index}`,
            "0x"
        );
        const approveReceipt = await approveTx.wait();
        
        contractData.steps.approveDeliverable = {
            status: 'success',
            gas: approveReceipt.gasUsed.toString(),
            txHash: approveReceipt.hash
        };
        stats.steps.approveDeliverable.success++;
        stats.steps.approveDeliverable.totalGas += approveReceipt.gasUsed;
        
        if (CONFIG.verbose) console.log(`[${index}] ✅ approveDeliverable成功`);
        
        await new Promise(resolve => setTimeout(resolve, CONFIG.delayBetweenSteps));
        
        // Step 5: makeDirectPayment
        if (CONFIG.verbose) console.log(`[${index}] 💳 makeDirectPayment実行中...`);
        
        const payTx = await contract.connect(user1).makeDirectPayment("0x", {
            value: hre.ethers.parseEther("1.0")
        });
        const payReceipt = await payTx.wait();
        
        contractData.steps.makeDirectPayment = {
            status: 'success',
            gas: payReceipt.gasUsed.toString(),
            txHash: payReceipt.hash
        };
        stats.steps.makeDirectPayment.success++;
        stats.steps.makeDirectPayment.totalGas += payReceipt.gasUsed;
        
        if (CONFIG.verbose) console.log(`[${index}] ✅ makeDirectPayment成功`);
        
        await new Promise(resolve => setTimeout(resolve, CONFIG.delayBetweenSteps));
        
        // Step 6: completeContract
        if (CONFIG.verbose) console.log(`[${index}] 🎉 completeContract実行中...`);
        
        const completeTx = await contract.connect(user1).completeContract(
            5, "Excellent work!", "0x"
        );
        const completeReceipt = await completeTx.wait();
        
        contractData.steps.completeContract = {
            status: 'success',
            gas: completeReceipt.gasUsed.toString(),
            txHash: completeReceipt.hash
        };
        stats.steps.completeContract.success++;
        stats.steps.completeContract.totalGas += completeReceipt.gasUsed;
        
        if (CONFIG.verbose) console.log(`[${index}] ✅ completeContract成功`);
        
        contractData.status = 'completed';
        stats.successful++;
        
        console.log(`✅ [${index}/${CONFIG.contractCount}] 契約完了: ${contractAddress}`);
        
    } catch (error) {
        contractData.status = 'failed';
        contractData.errors.push({
            step: getCurrentStep(contractData),
            message: error.message,
            shortMessage: error.shortMessage
        });
        stats.failed++;
        
        // 失敗したステップを記録
        const currentStep = getCurrentStep(contractData);
        if (currentStep && stats.steps[currentStep]) {
            stats.steps[currentStep].failed++;
        }
        
        console.log(`❌ [${index}/${CONFIG.contractCount}] 契約失敗: ${error.shortMessage || error.message}`);
    }
    
    return contractData;
}

function getCurrentStep(contractData) {
    const steps = ['createContract', 'authenticate', 'deliverWork', 'approveDeliverable', 'makeDirectPayment', 'completeContract'];
    for (let i = steps.length - 1; i >= 0; i--) {
        if (contractData.steps[steps[i]]) return steps[i + 1] || 'completeContract';
    }
    return 'createContract';
}

async function main() {
    console.log("=" .repeat(60));
    console.log("🔥 オブジェクト指向型アーキテクチャ 負荷テスト");
    console.log("=".repeat(60));
    
    stats.startTime = new Date().toISOString();
    const startTimestamp = Date.now();
    
    // デプロイ情報読み込み
    const deployInfo = JSON.parse(fs.readFileSync('deployment-info-oop.json', 'utf8'));
    const [deployer, user1, user2] = await hre.ethers.getSigners();
    
    console.log("\n📋 テスト設定:");
    console.log(`   契約数: ${CONFIG.contractCount}`);
    console.log(`   Factory: ${deployInfo.contracts.FreelanceContractFactory}`);
    console.log(`   Client: ${user1.address}`);
    console.log(`   Freelancer: ${user2.address}`);
    console.log(`   契約間待機: ${CONFIG.delayBetweenContracts}ms`);
    console.log(`   ステップ間待機: ${CONFIG.delayBetweenSteps}ms\n`);
    
    const factory = await hre.ethers.getContractAt(
        "FreelanceContractFactory",
        deployInfo.contracts.FreelanceContractFactory
    );
    
    // 負荷テスト実行
    console.log("🚀 負荷テスト開始...\n");
    
    for (let i = 1; i <= CONFIG.contractCount; i++) {
        stats.total++;
        
        const contractData = await executeContractLifecycle(factory, deployer, user1, user2, i);
        stats.contracts.push(contractData);
        
        // 契約間の待機
        if (i < CONFIG.contractCount) {
            await new Promise(resolve => setTimeout(resolve, CONFIG.delayBetweenContracts));
        }
    }
    
    stats.endTime = new Date().toISOString();
    const duration = ((Date.now() - startTimestamp) / 1000).toFixed(2);
    
    // 結果サマリー
    console.log("\n" + "=".repeat(60));
    console.log("📊 負荷テスト結果サマリー");
    console.log("=".repeat(60));
    
    console.log(`\n⏱️  実行時間: ${duration}秒`);
    console.log(`📈 総契約数: ${stats.total}`);
    console.log(`✅ 成功: ${stats.successful} (${(stats.successful/stats.total*100).toFixed(1)}%)`);
    console.log(`❌ 失敗: ${stats.failed} (${(stats.failed/stats.total*100).toFixed(1)}%)`);
    
    console.log("\n📊 ステップ別統計:");
    for (const [step, data] of Object.entries(stats.steps)) {
        const total = data.success + data.failed;
        if (total > 0) {
            const avgGas = data.success > 0 ? (data.totalGas / BigInt(data.success)).toString() : '0';
            console.log(`   ${step}:`);
            console.log(`      成功: ${data.success}/${total} (${(data.success/total*100).toFixed(1)}%)`);
            console.log(`      平均Gas: ${avgGas}`);
            console.log(`      総Gas: ${data.totalGas.toString()}`);
        }
    }
    
    // 結果を保存
    if (CONFIG.saveResults) {
        const results = {
            config: CONFIG,
            stats: {
                ...stats,
                steps: Object.fromEntries(
                    Object.entries(stats.steps).map(([k, v]) => [k, {
                        ...v,
                        totalGas: v.totalGas.toString()
                    }])
                )
            },
            duration: `${duration}s`
        };
        
        const filename = `load-test-results-${new Date().toISOString().replace(/[:.]/g, '-')}.json`;
        fs.writeFileSync(filename, JSON.stringify(results, null, 2));
        console.log(`\n💾 結果を保存: ${filename}`);
    }
    
    console.log("\n🎯 負荷テスト完了!");
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error("\n💥 負荷テスト失敗:", error);
        process.exit(1);
    });

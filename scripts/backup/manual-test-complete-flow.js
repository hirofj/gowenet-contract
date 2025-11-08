const hre = require("hardhat");
const fs = require('fs');

async function main() {
    console.log("=== Phase 4: 契約動作確認（手順書準拠） ===\n");
    
    const deployInfo = JSON.parse(fs.readFileSync('deployment-info-oop.json', 'utf8'));
    const [deployer, client, freelancer] = await hre.ethers.getSigners();
    
    console.log("📋 アカウント:");
    console.log(`  Client (user1):     ${client.address}`);
    console.log(`  Freelancer (user2): ${freelancer.address}\n`);
    
    const factory = await hre.ethers.getContractAt(
        "FreelanceContractFactory",
        deployInfo.contracts.FreelanceContractFactory
    );
    
    // Step 8: 契約生成
    console.log("Step 8: 契約生成中...");
    const paymentAmount = hre.ethers.parseEther("1.0");
    const description = "Website design and development project";
    
    const createTx = await factory.connect(deployer).createContract(
        client.address,
        freelancer.address,
        paymentAmount,
        description
    );
    const createReceipt = await createTx.wait();
    
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
    
    console.log(`✅ FreelanceContract生成: ${contractAddress}\n`);
    
    const contract = await hre.ethers.getContractAt("FreelanceContract", contractAddress);
    
    // Step 1: 初期状態確認
    console.log("Step 1: 初期状態確認");
    const partyA = await contract.partyA();
    const partyB = await contract.partyB();
    const amount = await contract.paymentAmount();
    const desc = await contract.workDescription();
    const state = await contract.getState();
    const workStatus = await contract.workStatus();
    
    console.log(`  partyA: ${partyA} ${partyA === client.address ? '✅' : '❌'}`);
    console.log(`  partyB: ${partyB} ${partyB === freelancer.address ? '✅' : '❌'}`);
    console.log(`  paymentAmount: ${hre.ethers.formatEther(amount)} GOWE`);
    console.log(`  workDescription: ${desc}`);
    console.log(`  getState: ${state} (Created) ${state === 0n ? '✅' : '❌'}`);
    console.log(`  workStatus: ${workStatus} (NotStarted) ${workStatus === 0n ? '✅' : '❌'}\n`);
    
    // Step 2: authenticate
    console.log("Step 2: 契約認証・作業開始 (authenticate)");
    const authTx = await contract.connect(client).authenticate();
    await authTx.wait();
    
    const stateAfterAuth = await contract.getState();
    const workStatusAfterAuth = await contract.workStatus();
    console.log(`  getState: ${stateAfterAuth} (InProgress) ${stateAfterAuth === 1n ? '✅' : '❌'}`);
    console.log(`  workStatus: ${workStatusAfterAuth} (InProgress) ${workStatusAfterAuth === 1n ? '✅' : '❌'}\n`);
    
    // Step 3: deliverWork
    console.log("Step 3: 作業成果物の納品 (deliverWork)");
    const deliverable = "https://example.com/website-preview";
    const signature = "0x";
    
    try {
        const deliverTx = await contract.connect(freelancer).deliverWork(deliverable, signature);
        await deliverTx.wait();
        
        const stateAfterDeliver = await contract.getState();
        const workStatusAfterDeliver = await contract.workStatus();
        console.log(`  ✅ 納品成功`);
        console.log(`  getState: ${stateAfterDeliver} (Delivered) ${stateAfterDeliver === 2n ? '✅' : '❌'}`);
        console.log(`  workStatus: ${workStatusAfterDeliver} (UnderReview) ${workStatusAfterDeliver === 2n ? '✅' : '❌'}\n`);
        
        // Step 4: approveDeliverable
        console.log("Step 4: 納品物の承認 (approveDeliverable)");
        const approveTx = await contract.connect(client).approveDeliverable(deliverable, signature);
        await approveTx.wait();
        
        const workStatusAfterApprove = await contract.workStatus();
        console.log(`  ✅ 承認成功`);
        console.log(`  workStatus: ${workStatusAfterApprove} (Completed) ${workStatusAfterApprove === 4n ? '✅' : '❌'}\n`);
        
        // Step 5: makeDirectPayment
        console.log("Step 5: 報酬の支払い (makeDirectPayment)");
        const freelancerBalanceBefore = await hre.ethers.provider.getBalance(freelancer.address);
        
        const paymentTx = await contract.connect(client).makeDirectPayment(signature, {
            value: paymentAmount
        });
        await paymentTx.wait();
        
        const stateAfterPayment = await contract.getState();
        const freelancerBalanceAfter = await hre.ethers.provider.getBalance(freelancer.address);
        const diff = freelancerBalanceAfter - freelancerBalanceBefore;
        
        console.log(`  ✅ 支払い成功`);
        console.log(`  getState: ${stateAfterPayment} (Paid) ${stateAfterPayment === 4n ? '✅' : '❌'}`);
        console.log(`  Freelancer残高変化: ${hre.ethers.formatEther(diff)} GOWE\n`);
        
        // Step 6: completeContract
        console.log("Step 6: 契約完了処理 (completeContract)");
        const completeTx = await contract.connect(client).completeContract();
        await completeTx.wait();
        
        const stateAfterComplete = await contract.getState();
        console.log(`  ✅ 完了成功`);
        console.log(`  getState: ${stateAfterComplete} (Completed) ${stateAfterComplete === 5n ? '✅' : '❌'}\n`);
        
        // Step 7: 貢献度スコア確認
        console.log("Step 7: 貢献度スコア確認");
        const stakingContract = await hre.ethers.getContractAt(
            "StakingContract",
            deployInfo.contracts.StakingContract
        );
        
        const clientScore = await stakingContract.contributionScore(client.address);
        const freelancerScore = await stakingContract.contributionScore(freelancer.address);
        
        console.log(`  Client貢献度: ${clientScore} ${clientScore > 0n ? '✅' : '❌'}`);
        console.log(`  Freelancer貢献度: ${freelancerScore} ${freelancerScore > 0n ? '✅' : '❌'}\n`);
        
        console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
        console.log("🎉 全ステップ成功！完全な支払いフロー確認完了");
        console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
        
    } catch (error) {
        console.log(`  ❌ エラー発生: ${error.message}`);
        console.log(`\n現在の状態確認:`);
        console.log(`  getState: ${await contract.getState()}`);
        console.log(`  workStatus: ${await contract.workStatus()}`);
    }
}

main().catch(e => { console.error(e); process.exit(1); });

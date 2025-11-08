const hre = require("hardhat");
const fs = require('fs');

async function main() {
    const contractAddress = fs.readFileSync('.contract_address', 'utf8').trim();
    const [deployer, client, freelancer] = await hre.ethers.getSigners();
    
    console.log("=== Step 3: 作業成果物の納品 ===");
    console.log(`契約アドレス: ${contractAddress}\n`);
    
    const contract = await hre.ethers.getContractAt("FreelanceContract", contractAddress);
    
    const deliverable = "https://example.com/work-output.zip";
    const signature = "0x";
    
    console.log(`deliverWork実行中 (freelancer)...`);
    console.log(`  納品物: ${deliverable}`);
    
    try {
        const deliverTx = await contract.connect(freelancer).deliverWork(deliverable, signature);
        console.log("トランザクション送信完了、待機中...");
        const deliverReceipt = await deliverTx.wait();
        console.log(`Gas使用: ${deliverReceipt.gasUsed.toString()}`);
        
        // 状態変化確認
        const stateAfter = await contract.getState();
        const workStatusAfter = await contract.workStatus();
        const deliverables = await contract.getDeliverables();
        
        console.log("\n状態変化:");
        console.log(`  getState(): ${stateAfter} (期待値: 2 Delivered) ${stateAfter === 2n ? '✅' : '❌'}`);
        console.log(`  workStatus(): ${workStatusAfter} (期待値: 2 UnderReview) ${workStatusAfter === 2n ? '✅' : '❌'}`);
        console.log(`  getDeliverables(): [${deliverables.join(', ')}]`);
        
        if (stateAfter === 2n && workStatusAfter === 2n) {
            console.log("\n✅ Step 3 完了: deliverWork成功");
            console.log("\n次: npx hardhat run scripts/step4-approve-deliverable.js --network gowenet");
        } else {
            console.log("\n❌ Step 3 失敗: 状態が期待値と異なります");
        }
    } catch (error) {
        console.log(`\n❌ deliverWork失敗:`);
        console.log(`  エラー: ${error.message}`);
        if (error.receipt) {
            console.log(`  status: ${error.receipt.status}`);
            console.log(`  gasUsed: ${error.receipt.gasUsed.toString()}`);
        }
    }
}

main().catch(e => { console.error(e); process.exit(1); });

const hre = require("hardhat");
const fs = require('fs');

async function main() {
    const contractAddress = fs.readFileSync('.contract_address', 'utf8').trim();
    const [deployer, client, freelancer] = await hre.ethers.getSigners();
    
    console.log("=== Step 2: 契約認証・作業開始 ===");
    console.log(`契約アドレス: ${contractAddress}\n`);
    
    const contract = await hre.ethers.getContractAt("FreelanceContract", contractAddress);
    
    console.log("authenticate実行中 (client)...");
    const authTx = await contract.connect(client).authenticate();
    const authReceipt = await authTx.wait();
    console.log(`Gas使用: ${authReceipt.gasUsed.toString()}`);
    
    // 状態変化確認
    const stateAfter = await contract.getState();
    const workStatusAfter = await contract.workStatus();
    
    console.log("\n状態変化:");
    console.log(`  getState(): ${stateAfter} (期待値: 1 InProgress) ${stateAfter === 1n ? '✅' : '❌'}`);
    console.log(`  workStatus(): ${workStatusAfter} (期待値: 1 InProgress) ${workStatusAfter === 1n ? '✅' : '❌'}`);
    
    if (stateAfter === 1n && workStatusAfter === 1n) {
        console.log("\n✅ Step 2 完了: authenticate成功");
        console.log("\n次: npx hardhat run scripts/step3-deliver-work.js --network gowenet");
    } else {
        console.log("\n❌ Step 2 失敗");
    }
}

main().catch(e => { console.error(e); process.exit(1); });

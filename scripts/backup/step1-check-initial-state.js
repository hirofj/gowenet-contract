const hre = require("hardhat");
const fs = require('fs');

async function main() {
    const contractAddress = fs.readFileSync('.contract_address', 'utf8').trim();
    const [deployer, client, freelancer] = await hre.ethers.getSigners();
    
    console.log("=== Step 1: 初期状態確認 ===");
    console.log(`契約アドレス: ${contractAddress}\n`);
    
    const contract = await hre.ethers.getContractAt("FreelanceContract", contractAddress);
    
    // 基本情報確認
    const partyA = await contract.partyA();
    const partyB = await contract.partyB();
    const paymentAmount = await contract.paymentAmount();
    const workDescription = await contract.workDescription();
    
    // 初期状態確認
    const state = await contract.getState();
    const workStatus = await contract.workStatus();
    const escrowActive = await contract.escrowActive();
    const ratingsEnabled = await contract.ratingsEnabled();
    
    console.log("基本情報:");
    console.log(`  partyA (Client): ${partyA} ${partyA === client.address ? '✅' : '❌'}`);
    console.log(`  partyB (Freelancer): ${partyB} ${partyB === freelancer.address ? '✅' : '❌'}`);
    console.log(`  paymentAmount: ${hre.ethers.formatEther(paymentAmount)} GOWE`);
    console.log(`  workDescription: ${workDescription}`);
    
    console.log("\n初期状態:");
    console.log(`  getState(): ${state} (期待値: 0 Created) ${state === 0n ? '✅' : '❌'}`);
    console.log(`  workStatus(): ${workStatus} (期待値: 0 NotStarted) ${workStatus === 0n ? '✅' : '❌'}`);
    console.log(`  escrowActive(): ${escrowActive}`);
    console.log(`  ratingsEnabled(): ${ratingsEnabled}`);
    
    if (state === 0n && workStatus === 0n) {
        console.log("\n✅ Step 1 完了: 初期状態OK");
        console.log("\n次: npx hardhat run scripts/step2-authenticate.js --network gowenet");
    } else {
        console.log("\n❌ Step 1 失敗: 初期状態が期待値と異なります");
    }
}

main().catch(e => { console.error(e); process.exit(1); });

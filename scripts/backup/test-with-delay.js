const hre = require("hardhat");
const fs = require('fs');

async function main() {
    const deployInfo = JSON.parse(fs.readFileSync('deployment-info-oop.json', 'utf8'));
    const [deployer, user1, user2] = await hre.ethers.getSigners();
    
    // 新しい契約作成
    const factory = await hre.ethers.getContractAt("FreelanceContractFactory", deployInfo.contracts.FreelanceContractFactory);
    
    console.log("📝 新しい契約作成中...");
    const createTx = await factory.connect(deployer).createContract(
        user1.address, user2.address,
        hre.ethers.parseEther("1.0"),
        "Delay Test Contract"
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
    
    console.log(`✅ 契約作成完了: ${contractAddress}`);
    
    const contract = await hre.ethers.getContractAt("FreelanceContract", contractAddress);
    
    // Step 1: authenticate
    console.log("\n🚀 Step 1: authenticate");
    const authTx = await contract.connect(user1).authenticate();
    const authReceipt = await authTx.wait();
    console.log(`✅ authenticate成功 (Gas: ${authReceipt.gasUsed.toString()})`);
    
    const state1 = await contract.getState();
    console.log(`📊 状態: ${state1}`);
    
    // 5秒待機
    console.log("\n⏳ 5秒待機中...");
    await new Promise(resolve => setTimeout(resolve, 5000));
    
    // Step 2: deliverWork
    console.log("\n📦 Step 2: deliverWork");
    try {
        const deliverTx = await contract.connect(user2).deliverWork(
            "https://test.com/final",
            "0x"
        );
        const deliverReceipt = await deliverTx.wait();
        console.log(`✅ deliverWork成功 (Gas: ${deliverReceipt.gasUsed.toString()})`);
        
        const state2 = await contract.getState();
        console.log(`📊 状態: ${state2}`);
    } catch (error) {
        console.log(`❌ deliverWork失敗: ${error.message}`);
    }
}

main().then(() => process.exit(0)).catch(e => { console.error(e); process.exit(1); });

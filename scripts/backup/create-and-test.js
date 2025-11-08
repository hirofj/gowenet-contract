const hre = require("hardhat");
const fs = require('fs');

async function main() {
    const deployInfo = JSON.parse(fs.readFileSync('deployment-info-oop.json', 'utf8'));
    const [deployer, user1, user2] = await hre.ethers.getSigners();
    
    // Factory取得
    const factory = await hre.ethers.getContractAt("FreelanceContractFactory", deployInfo.contracts.FreelanceContractFactory);
    
    // 新しい契約作成
    console.log("📝 新しい契約作成中...");
    const createTx = await factory.connect(deployer).createContract(
        user1.address,
        user2.address,
        hre.ethers.parseEther("1.0"),
        "Full Test Contract"
    );
    const createReceipt = await createTx.wait();
    
    // 契約アドレス取得
    let newContractAddress;
    for (const log of createReceipt.logs) {
        try {
            const parsedLog = factory.interface.parseLog(log);
            if (parsedLog.name === 'ContractCreated') {
                newContractAddress = parsedLog.args.contractAddress;
                break;
            }
        } catch (e) {}
    }
    
    console.log(`✅ 契約作成完了: ${newContractAddress}`);
    
    // test-results-oop.jsonを更新
    fs.writeFileSync('test-results-oop.json', JSON.stringify({
        architecture: "object_oriented",
        factoryAddress: deployInfo.contracts.FreelanceContractFactory,
        generatedContractAddress: newContractAddress,
        testTime: new Date().toISOString()
    }, null, 2));
    
    console.log("✅ test-results-oop.json 更新完了");
}

main().then(() => process.exit(0)).catch((error) => { console.error(error); process.exit(1); });

const hre = require("hardhat");
const fs = require('fs');

async function main() {
    const deployInfo = JSON.parse(fs.readFileSync('deployment-info-oop.json', 'utf8'));
    const [deployer, client, freelancer] = await hre.ethers.getSigners();
    
    console.log("📋 アカウント:");
    console.log(`  Deployer: ${deployer.address}`);
    console.log(`  Client:   ${client.address}`);
    console.log(`  Freelancer: ${freelancer.address}\n`);
    
    const factory = await hre.ethers.getContractAt(
        "FreelanceContractFactory",
        deployInfo.contracts.FreelanceContractFactory
    );
    
    console.log("=== Step 8: 契約生成 ===");
    const paymentAmount = hre.ethers.parseEther("1.0");
    const description = "Website design and development project";
    
    const createTx = await factory.connect(deployer).createContract(
        client.address,
        freelancer.address,
        paymentAmount,
        description
    );
    
    console.log("トランザクション送信完了、待機中...");
    const createReceipt = await createTx.wait();
    console.log(`Gas使用: ${createReceipt.gasUsed.toString()}`);
    
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
    
    // 契約アドレスを環境変数ファイルに保存
    fs.writeFileSync('.contract_address', contractAddress);
    
    console.log(`契約アドレスを .contract_address に保存しました`);
}

main().catch(e => { console.error(e); process.exit(1); });

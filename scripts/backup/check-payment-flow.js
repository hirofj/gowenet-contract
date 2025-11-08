const hre = require("hardhat");
const fs = require('fs');

async function main() {
    const deployInfo = JSON.parse(fs.readFileSync('deployment-info-oop.json', 'utf8'));
    const [deployer, client, freelancer] = await hre.ethers.getSigners();
    
    console.log("📋 アカウント情報:");
    console.log(`Deployer:   ${deployer.address}`);
    console.log(`Client:     ${client.address}`);
    console.log(`Freelancer: ${freelancer.address}`);
    
    // 残高確認
    const clientBalance = await hre.ethers.provider.getBalance(client.address);
    const freelancerBalance = await hre.ethers.provider.getBalance(freelancer.address);
    
    console.log(`\nClient残高:     ${hre.ethers.formatEther(clientBalance)} GOWE`);
    console.log(`Freelancer残高: ${hre.ethers.formatEther(freelancerBalance)} GOWE`);
    
    // Factoryコントラクトの確認
    const factory = await hre.ethers.getContractAt(
        "FreelanceContractFactory",
        deployInfo.contracts.FreelanceContractFactory
    );
    
    console.log(`\n📍 Factory: ${await factory.getAddress()}`);
    
    // 簡単なテスト：1 GOWEで契約作成
    console.log("\n🔨 テスト: 1 GOWEで契約作成...");
    const paymentAmount = hre.ethers.parseEther("1.0");
    
    try {
        const createTx = await factory.connect(client).createContract(
            client.address,
            freelancer.address,
            paymentAmount,
            `Payment Test ${Date.now()}`,
            { value: paymentAmount }
        );
        const receipt = await createTx.wait();
        
        let contractAddress;
        for (const log of receipt.logs) {
            try {
                const parsed = factory.interface.parseLog(log);
                if (parsed.name === 'ContractCreated') {
                    contractAddress = parsed.args.contractAddress;
                    break;
                }
            } catch (e) {}
        }
        
        console.log(`✅ 契約作成成功: ${contractAddress}`);
        console.log(`Gas使用: ${receipt.gasUsed.toString()}`);
        
        // 契約の残高確認
        const contractBalance = await hre.ethers.provider.getBalance(contractAddress);
        console.log(`契約の残高: ${hre.ethers.formatEther(contractBalance)} GOWE`);
        
        // 契約後のFreelancer残高
        const freelancerBalanceAfter = await hre.ethers.provider.getBalance(freelancer.address);
        console.log(`\n作成後のFreelancer残高: ${hre.ethers.formatEther(freelancerBalanceAfter)} GOWE`);
        
    } catch (error) {
        console.log(`❌ エラー: ${error.message}`);
        if (error.data) {
            console.log(`Data: ${error.data}`);
        }
    }
}

main()
    .then(() => process.exit(0))
    .catch(e => { console.error(e); process.exit(1); });

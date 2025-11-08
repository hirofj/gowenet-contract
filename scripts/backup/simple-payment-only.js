const hre = require("hardhat");
const fs = require('fs');

async function main() {
    // 既存の契約で支払いテストするため、まず新しい契約を作成
    const deployInfo = JSON.parse(fs.readFileSync('deployment-info-oop.json', 'utf8'));
    const [deployer, client, freelancer] = await hre.ethers.getSigners();
    
    const factory = await hre.ethers.getContractAt(
        "FreelanceContractFactory",
        deployInfo.contracts.FreelanceContractFactory
    );
    
    const paymentAmount = hre.ethers.parseEther("1.0");
    
    // 1. 契約作成
    const createTx = await factory.connect(client).createContract(
        client.address,
        freelancer.address,
        paymentAmount,
        `Payment Only Test ${Date.now()}`
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
    
    console.log(JSON.stringify({
        success: true,
        contractAddress,
        createGas: createReceipt.gasUsed.toString(),
        note: "契約作成のみ完了。支払いはmakeDirectPaymentで別途実行"
    }));
}

main()
    .then(() => process.exit(0))
    .catch(e => { 
        console.error(JSON.stringify({ success: false, error: e.message })); 
        process.exit(1); 
    });

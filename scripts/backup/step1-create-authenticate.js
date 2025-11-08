const hre = require("hardhat");
const fs = require('fs');

async function main() {
    const deployInfo = JSON.parse(fs.readFileSync('deployment-info-oop.json', 'utf8'));
    const [deployer, client, freelancer] = await hre.ethers.getSigners();
    
    const factory = await hre.ethers.getContractAt(
        "FreelanceContractFactory",
        deployInfo.contracts.FreelanceContractFactory
    );
    
    const paymentAmount = hre.ethers.parseEther("1.0");
    
    // ステップ1: 契約作成
    const createTx = await factory.connect(client).createContract(
        client.address,
        freelancer.address,
        paymentAmount,
        `Contract ${Date.now()}`
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
    
    const contract = await hre.ethers.getContractAt("FreelanceContract", contractAddress);
    
    // ステップ2: 認証
    const authTx = await contract.connect(freelancer).authenticate();
    const authReceipt = await authTx.wait();
    
    console.log(JSON.stringify({
        success: true,
        contractAddress,
        createGas: createReceipt.gasUsed.toString(),
        authGas: authReceipt.gasUsed.toString(),
        totalGas: (createReceipt.gasUsed + authReceipt.gasUsed).toString()
    }));
}

main()
    .then(() => process.exit(0))
    .catch(e => { 
        console.error(JSON.stringify({ success: false, error: e.message })); 
        process.exit(1); 
    });

const hre = require("hardhat");
const fs = require('fs');

async function main() {
    const deployInfo = JSON.parse(fs.readFileSync('deployment-info-oop.json', 'utf8'));
    const [deployer, user1, user2] = await hre.ethers.getSigners();
    
    const factory = await hre.ethers.getContractAt(
        "FreelanceContractFactory",
        deployInfo.contracts.FreelanceContractFactory
    );
    
    // 契約作成
    const createTx = await factory.connect(deployer).createContract(
        user1.address,
        user2.address,
        hre.ethers.parseEther("1.0"),
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
    
    // authenticate
    const contract = await hre.ethers.getContractAt("FreelanceContract", contractAddress);
    const authTx = await contract.connect(user1).authenticate();
    const authReceipt = await authTx.wait();
    
    console.log(JSON.stringify({
        success: true,
        contractAddress,
        createGas: createReceipt.gasUsed.toString(),
        authGas: authReceipt.gasUsed.toString(),
        totalGas: (createReceipt.gasUsed + authReceipt.gasUsed).toString()
    }));
}

main().then(() => process.exit(0)).catch(e => { console.error(e); process.exit(1); });

const hre = require("hardhat");
const fs = require('fs');

async function main() {
    const startTime = Date.now();
    const deployInfo = JSON.parse(fs.readFileSync('deployment-info-oop.json', 'utf8'));
    const [deployer, user1, user2] = await hre.ethers.getSigners();
    
    const result = {
        contractAddress: null,
        success: false,
        steps: {},
        totalGas: 0n,
        errors: [],
        duration: 0
    };
    
    try {
        const factory = await hre.ethers.getContractAt(
            "FreelanceContractFactory",
            deployInfo.contracts.FreelanceContractFactory
        );
        
        // Step 1: 契約作成
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
        
        result.contractAddress = contractAddress;
        result.steps.createContract = { gas: createReceipt.gasUsed.toString() };
        result.totalGas += createReceipt.gasUsed;
        
        // Step 2: authenticate
        const contract1 = await hre.ethers.getContractAt("FreelanceContract", contractAddress);
        const authTx = await contract1.connect(user1).authenticate();
        const authReceipt = await authTx.wait();
        
        result.steps.authenticate = { gas: authReceipt.gasUsed.toString() };
        result.totalGas += authReceipt.gasUsed;
        
        // Step 3: deliverWork (新しいインスタンス)
        const contract2 = await hre.ethers.getContractAt("FreelanceContract", contractAddress);
        const deliverableUrl = `https://example.com/del-${Date.now()}`;
        const deliverTx = await contract2.connect(user2).deliverWork(
            deliverableUrl,
            "0x"
        );
        const deliverReceipt = await deliverTx.wait();
        
        result.steps.deliverWork = { gas: deliverReceipt.gasUsed.toString() };
        result.totalGas += deliverReceipt.gasUsed;
        
        // Step 4: approveDeliverable (新しいインスタンス)
        const contract3 = await hre.ethers.getContractAt("FreelanceContract", contractAddress);
        const approveTx = await contract3.connect(user1).approveDeliverable(
            deliverableUrl,
            "0x"
        );
        const approveReceipt = await approveTx.wait();
        
        result.steps.approveDeliverable = { gas: approveReceipt.gasUsed.toString() };
        result.totalGas += approveReceipt.gasUsed;
        
        // Step 5: makeDirectPayment (新しいインスタンス)
        const contract4 = await hre.ethers.getContractAt("FreelanceContract", contractAddress);
        const payTx = await contract4.connect(user1).makeDirectPayment("0x", {
            value: hre.ethers.parseEther("1.0")
        });
        const payReceipt = await payTx.wait();
        
        result.steps.makeDirectPayment = { gas: payReceipt.gasUsed.toString() };
        result.totalGas += payReceipt.gasUsed;
        
        // Step 6: completeContract (新しいインスタンス)
        const contract5 = await hre.ethers.getContractAt("FreelanceContract", contractAddress);
        const completeTx = await contract5.connect(user1).completeContract(
            5, "Great!", "0x"
        );
        const completeReceipt = await completeTx.wait();
        
        result.steps.completeContract = { gas: completeReceipt.gasUsed.toString() };
        result.totalGas += completeReceipt.gasUsed;
        
        result.success = true;
        
    } catch (error) {
        result.errors.push(error.message);
    }
    
    result.duration = Date.now() - startTime;
    result.totalGas = result.totalGas.toString();
    
    // 結果を出力（シェルスクリプトで集計できるようにJSON形式）
    console.log(JSON.stringify(result));
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(JSON.stringify({ success: false, errors: [error.message] }));
        process.exit(1);
    });

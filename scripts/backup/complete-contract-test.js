const hre = require("hardhat");
const fs = require('fs');

async function main() {
    const deployInfo = JSON.parse(fs.readFileSync('deployment-info-oop.json', 'utf8'));
    const [deployer, client, freelancer] = await hre.ethers.getSigners();
    
    const factory = await hre.ethers.getContractAt(
        "FreelanceContractFactory",
        deployInfo.contracts.FreelanceContractFactory
    );
    
    // ステップ1: 契約作成（clientがデプロイし、1 GOWE を送金）
    const paymentAmount = hre.ethers.parseEther("1.0");
    const createTx = await factory.connect(client).createContract(
        client.address,
        freelancer.address,
        paymentAmount,
        `Test Contract ${Date.now()}`,
        { value: paymentAmount }  // 1 GOWEを送金
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
    
    // ステップ2: Freelancerが認証
    const authTx = await contract.connect(freelancer).authenticate();
    const authReceipt = await authTx.wait();
    
    // ステップ3: Freelancerが納品
    const deliverTx = await contract.connect(freelancer).deliverWork(
        "https://example.com/deliverable",
        "0x"
    );
    const deliverReceipt = await deliverTx.wait();
    
    // ステップ4: Clientが承認（これで支払いが実行される）
    const approveTx = await contract.connect(client).approveDeliverable();
    const approveReceipt = await approveTx.wait();
    
    // ステップ5: 契約完了
    const completeTx = await contract.connect(client).completeContract();
    const completeReceipt = await completeTx.wait();
    
    const totalGas = 
        createReceipt.gasUsed + 
        authReceipt.gasUsed + 
        deliverReceipt.gasUsed + 
        approveReceipt.gasUsed + 
        completeReceipt.gasUsed;
    
    console.log(JSON.stringify({
        success: true,
        contractAddress,
        paymentAmount: hre.ethers.formatEther(paymentAmount),
        gas: {
            create: createReceipt.gasUsed.toString(),
            authenticate: authReceipt.gasUsed.toString(),
            deliver: deliverReceipt.gasUsed.toString(),
            approve: approveReceipt.gasUsed.toString(),
            complete: completeReceipt.gasUsed.toString(),
            total: totalGas.toString()
        }
    }));
}

main()
    .then(() => process.exit(0))
    .catch(e => { 
        console.error(JSON.stringify({ success: false, error: e.message })); 
        process.exit(1); 
    });

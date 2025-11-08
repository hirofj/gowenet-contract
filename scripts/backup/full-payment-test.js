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
    
    // 事前残高
    const freelancerBalanceBefore = await hre.ethers.provider.getBalance(freelancer.address);
    
    // ステップ1: 契約作成
    const createTx = await factory.connect(client).createContract(
        client.address,
        freelancer.address,
        paymentAmount,
        `Full Payment Test ${Date.now()}`
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
    
    // ステップ2: Freelancer認証
    const authTx = await contract.connect(freelancer).authenticate();
    await authTx.wait();
    
    // ステップ3: Freelancer納品
    const deliverTx = await contract.connect(freelancer).deliverWork(
        "https://example.com/work", "0x"
    );
    await deliverTx.wait();
    
    // ステップ4: Client直接支払い（ここで1 GOWEが移動）
    const paymentTx = await contract.connect(client).makeDirectPayment("0x", {
        value: paymentAmount
    });
    const paymentReceipt = await paymentTx.wait();
    
    // 事後残高
    const freelancerBalanceAfter = await hre.ethers.provider.getBalance(freelancer.address);
    const difference = freelancerBalanceAfter - freelancerBalanceBefore;
    
    console.log(JSON.stringify({
        success: true,
        contractAddress,
        paymentAmount: hre.ethers.formatEther(paymentAmount),
        freelancerBalanceBefore: hre.ethers.formatEther(freelancerBalanceBefore),
        freelancerBalanceAfter: hre.ethers.formatEther(freelancerBalanceAfter),
        difference: hre.ethers.formatEther(difference),
        paymentGas: paymentReceipt.gasUsed.toString()
    }));
}

main()
    .then(() => process.exit(0))
    .catch(e => { 
        console.error(JSON.stringify({ success: false, error: e.message })); 
        process.exit(1); 
    });

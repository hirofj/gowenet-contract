const hre = require("hardhat");

async function main() {
    const contractAddress = process.env.CONTRACT_ADDRESS;
    if (!contractAddress) {
        throw new Error("CONTRACT_ADDRESS environment variable required");
    }
    
    const [deployer, client, freelancer] = await hre.ethers.getSigners();
    const contract = await hre.ethers.getContractAt("FreelanceContract", contractAddress);
    
    // 事前残高確認
    const freelancerBalanceBefore = await hre.ethers.provider.getBalance(freelancer.address);
    
    const paymentAmount = hre.ethers.parseEther("1.0");
    const paymentTx = await contract.connect(client).makeDirectPayment("0x", {
        value: paymentAmount
    });
    const paymentReceipt = await paymentTx.wait();
    
    // 事後残高確認
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

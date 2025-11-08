const hre = require("hardhat");

async function main() {
    const contractAddress = process.env.CONTRACT_ADDRESS;
    if (!contractAddress) {
        throw new Error("CONTRACT_ADDRESS environment variable required");
    }
    
    const [deployer, client, freelancer] = await hre.ethers.getSigners();
    const contract = await hre.ethers.getContractAt("FreelanceContract", contractAddress);
    
    const deliverTx = await contract.connect(freelancer).deliverWork(
        `https://example.com/work-${Date.now()}`,
        "0x"
    );
    const deliverReceipt = await deliverTx.wait();
    
    console.log(JSON.stringify({
        success: true,
        contractAddress,
        deliverGas: deliverReceipt.gasUsed.toString()
    }));
}

main()
    .then(() => process.exit(0))
    .catch(e => { 
        console.error(JSON.stringify({ success: false, error: e.message })); 
        process.exit(1); 
    });

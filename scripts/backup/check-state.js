const hre = require("hardhat");

async function main() {
    const contractAddress = process.env.CONTRACT_ADDRESS;
    const [deployer, client, freelancer] = await hre.ethers.getSigners();
    
    const contract = await hre.ethers.getContractAt("FreelanceContract", contractAddress);
    
    const partyA = await contract.partyA();
    const partyB = await contract.partyB();
    const paymentAmount = await contract.paymentAmount();
    const state = await contract.getState();
    
    console.log(JSON.stringify({
        contractAddress,
        partyA,
        partyB,
        client: client.address,
        freelancer: freelancer.address,
        paymentAmount: hre.ethers.formatEther(paymentAmount),
        state: state.toString(),
        stateName: ["Created", "InProgress", "Delivered", "Approved", "Paid", "Completed", "Cancelled"][state]
    }, null, 2));
}

main().catch(e => { console.error(e); process.exit(1); });

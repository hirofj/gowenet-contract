const hre = require("hardhat");

async function main() {
    const contractAddress = process.env.CONTRACT_ADDRESS;
    const [deployer, client, freelancer] = await hre.ethers.getSigners();
    
    const contract = await hre.ethers.getContractAt("FreelanceContract", contractAddress);
    
    try {
        const state = await contract.getState();
        const workStatus = await contract.workStatus();
        const partyB = await contract.partyB();
        
        console.log(JSON.stringify({
            contractAddress,
            state: state.toString(),
            stateName: ["Created", "InProgress", "Delivered", "Approved", "Paid", "Completed", "Cancelled"][state],
            workStatus: workStatus.toString(),
            workStatusName: ["NotStarted", "Submitted", "Approved"][workStatus],
            partyB,
            freelancerAddress: freelancer.address,
            isPartyBMatch: partyB.toLowerCase() === freelancer.address.toLowerCase()
        }, null, 2));
    } catch (error) {
        console.log(JSON.stringify({ error: error.message }));
    }
}

main().catch(e => { console.error(e); process.exit(1); });

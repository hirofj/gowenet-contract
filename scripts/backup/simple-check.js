const hre = require("hardhat");

async function main() {
    const contractAddress = process.env.CONTRACT_ADDRESS;
    const contract = await hre.ethers.getContractAt("FreelanceContract", contractAddress);
    
    const workStatus = await contract.workStatus();
    console.log(`workStatus (raw): ${workStatus}`);
    console.log(`workStatus (number): ${Number(workStatus)}`);
}

main().catch(e => { console.error(e); process.exit(1); });

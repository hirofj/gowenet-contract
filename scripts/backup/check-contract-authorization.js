const hre = require("hardhat");
const fs = require('fs');

async function main() {
    const contractAddress = process.env.CONTRACT_ADDRESS;
    const deployInfo = JSON.parse(fs.readFileSync('deployment-info-oop.json', 'utf8'));
    
    const contractBase = await hre.ethers.getContractAt(
        "ContractBase",
        deployInfo.contracts.ContractBase
    );
    
    const isAuthorized = await contractBase.authorizedContracts(contractAddress);
    
    console.log(JSON.stringify({
        contractAddress,
        contractBaseAddress: deployInfo.contracts.ContractBase,
        isAuthorized,
        status: isAuthorized ? "✅ 認可済み" : "❌ 未認可"
    }, null, 2));
}

main().catch(e => { console.error(e); process.exit(1); });

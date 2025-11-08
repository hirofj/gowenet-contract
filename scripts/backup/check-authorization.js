const hre = require("hardhat");
const fs = require('fs');

async function main() {
    const contractAddress = process.env.CONTRACT_ADDRESS;
    const deployInfo = JSON.parse(fs.readFileSync('deployment-info-oop.json', 'utf8'));
    
    const paymentFlow = await hre.ethers.getContractAt(
        "PaymentFlow",
        deployInfo.contracts.PaymentFlow
    );
    
    const isAuthorized = await paymentFlow.authorizedContracts(contractAddress);
    
    console.log(JSON.stringify({
        contractAddress,
        paymentFlowAddress: deployInfo.contracts.PaymentFlow,
        isAuthorized
    }, null, 2));
}

main().catch(e => { console.error(e); process.exit(1); });

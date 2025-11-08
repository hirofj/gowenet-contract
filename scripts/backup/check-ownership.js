const hre = require("hardhat");
const fs = require('fs');

async function main() {
    const deployInfo = JSON.parse(fs.readFileSync('deployment-info-oop.json', 'utf8'));
    
    const contractBase = await hre.ethers.getContractAt("ContractBase", deployInfo.contracts.ContractBase);
    const paymentFlow = await hre.ethers.getContractAt("PaymentFlow", deployInfo.contracts.PaymentFlow);
    
    const cbOwner = await contractBase.owner();
    const pfOwner = await paymentFlow.owner();
    
    console.log(JSON.stringify({
        ContractBase: {
            address: deployInfo.contracts.ContractBase,
            owner: cbOwner,
            shouldBe: deployInfo.contracts.FreelanceContractFactory,
            isCorrect: cbOwner === deployInfo.contracts.FreelanceContractFactory
        },
        PaymentFlow: {
            address: deployInfo.contracts.PaymentFlow,
            owner: pfOwner,
            shouldBe: deployInfo.contracts.FreelanceContractFactory,
            isCorrect: pfOwner === deployInfo.contracts.FreelanceContractFactory
        }
    }, null, 2));
}

main().catch(e => { console.error(e); process.exit(1); });

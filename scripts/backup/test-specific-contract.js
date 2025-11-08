const hre = require("hardhat");

async function main() {
    const [deployer, user1, user2] = await hre.ethers.getSigners();
    const contractAddr = "0x3Ff8B284c711C2eB8D0fDe1dEd892eDe3997a8D9";
    
    console.log(`🔍 契約テスト: ${contractAddr}\n`);
    
    const contract = await hre.ethers.getContractAt("FreelanceContract", contractAddr);
    
    const state = await contract.getState();
    const partyB = await contract.partyB();
    
    console.log(`状態: ${state}`);
    console.log(`PartyB: ${partyB}`);
    console.log(`Freelancer: ${user2.address}\n`);
    
    console.log("📦 deliverWork実行:");
    const tx = await contract.connect(user2).deliverWork("https://load-test.com/1", "0x");
    const receipt = await tx.wait();
    console.log(`✅ 成功! Gas: ${receipt.gasUsed.toString()}`);
}

main().then(() => process.exit(0)).catch(e => { console.error(e); process.exit(1); });

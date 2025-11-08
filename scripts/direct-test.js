const hre = require("hardhat");

async function main() {
    const [deployer, user1, user2] = await hre.ethers.getSigners();
    
    const testContract = "0xB5950236B3A6e2289E9cb75c5D2bBCb448Eb8E6D";
    
    console.log(`🔍 契約テスト: ${testContract}\n`);
    
    const contract = await hre.ethers.getContractAt("FreelanceContract", testContract);
    
    const state = await contract.getState();
    const partyB = await contract.partyB();
    const workStatus = await contract.workStatus();
    
    console.log(`状態: ${state}`);
    console.log(`PartyB: ${partyB}`);
    console.log(`WorkStatus: ${workStatus}`);
    console.log(`Freelancer: ${user2.address}`);
    console.log(`一致: ${partyB.toLowerCase() === user2.address.toLowerCase()}\n`);
    
    console.log("📦 deliverWork実行:");
    try {
        const tx = await contract.connect(user2).deliverWork("https://test.com/x", "0x");
        const receipt = await tx.wait();
        console.log(`✅ 成功! Gas: ${receipt.gasUsed.toString()}`);
    } catch (error) {
        console.log(`❌ 失敗: ${error.shortMessage ||  error.message}`);
    }
}

main().then(() => process.exit(0)).catch(e => { console.error(e); process.exit(1); });

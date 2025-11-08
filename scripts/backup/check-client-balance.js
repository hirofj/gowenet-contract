const hre = require("hardhat");
async function main() {
    const [deployer, client, freelancer] = await hre.ethers.getSigners();
    const balance = await hre.ethers.provider.getBalance(client.address);
    console.log(`Client (user1) 残高: ${hre.ethers.formatEther(balance)} GOWE`);
}
main().catch(e => { console.error(e); process.exit(1); });

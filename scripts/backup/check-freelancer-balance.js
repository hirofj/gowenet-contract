const hre = require("hardhat");
async function main() {
    const [deployer, client, freelancer] = await hre.ethers.getSigners();
    const balance = await hre.ethers.provider.getBalance(freelancer.address);
    console.log(`Freelancer残高: ${hre.ethers.formatEther(balance)} GOWE`);
}
main().catch(e => { console.error(e); process.exit(1); });

require("@nomicfoundation/hardhat-ethers");

/** @type import('hardhat/config').HardhatUserConfig */
module.exports = {
  solidity: {
    version: "0.8.20",
    settings: {
      optimizer: {
        enabled: true,
        runs: 200
      }
    }
  },
  networks: {
    gowenet: {
      url: "http://192.168.3.86:9654/ext/bc/2tGwFCjwr3w6fW774ytz982h5Th9eiALrKFanmBKZjxQSqTBxW/rpc",
      chainId: 98888,
      accounts: [
        "4a87d4848db2b7386af1ff30e956bf6067d4e76a67bd4c9c210b9276aa49c8d6",  // gowenet-owner (deployer)
        "ea120f28ec08e4a82ebda891322202fc0466ee0d7e90e3c42cd07130f0477f75",  // gowenet-user1 (client)
        "dd72f362fc49ad457d6619c1a13cf67b3ed76e53efed94f822a3307e2bb0300f"   // gowenet-user2 (freelancer)
      ]
    },
    localhost: {
      url: "http://127.0.0.1:8545"
    }
  },
  paths: {
    sources: "./contracts",
    tests: "./test",
    cache: "./cache",
    artifacts: "./artifacts"
  }
};

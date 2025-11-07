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
      chainId: 1337,
      accounts: {
        mnemonic: "test test test test test test test test test test test junk"
      }
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

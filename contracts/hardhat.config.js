require("@nomicfoundation/hardhat-toolbox");
require("@openzeppelin/hardhat-upgrades");
require("dotenv").config();

const { RPC_URL, PRIVATE_KEY, CHAIN_ID } = process.env;

module.exports = {
  solidity: "0.8.22",
  networks: {
    BNB: {
      url: RPC_URL,
      chainId: parseInt(CHAIN_ID),
      accounts: [`0x${PRIVATE_KEY}`],
    },
       MON: {
      url: "https://monad-testnet.drpc.org/",
      chainId: parseInt(10143),
      accounts: [`0x${PRIVATE_KEY}`],
    },
  },
};

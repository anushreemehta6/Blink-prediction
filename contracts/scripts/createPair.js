const { ethers, upgrades } = require("hardhat");

async function main() {
  const Pair = await ethers.getContractFactory("MiniDexPairUpgradeable");

  // Replace this with your deployed proxy pair address if upgrading a single instance
  const proxyAddress = "0xA18938653750B70DCBbC0DF5a03D9F2e5958D8E8";

  // Or upgrade just the implementation logic used by factory (if factory clones that logic)
  const upgraded = await upgrades.upgradeProxy(proxyAddress, Pair);

  console.log("✅ Pair logic upgraded at proxy address:", await upgraded.getAddress());
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});

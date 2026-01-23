// scripts/upgradePair.js
const { ethers, upgrades } = require("hardhat");

async function main() {
  const proxyAddress = "0xa3804B7c2707eD42602b927EeB4697Eda8aA3F17"; // your PAIR proxy

  console.log("⏫ Upgrading MiniDexPairUpgradeable...");

  const Pair = await ethers.getContractFactory("MiniDexPairUpgradeable");
  const upgraded = await upgrades.upgradeProxy(proxyAddress, Pair, {
    kind: "uups",
  });

  console.log("✅ Pair upgrade complete! Proxy still at:", await upgraded.getAddress());
}

main().catch((err) => {
  console.error("❌ Upgrade failed:", err);
  process.exit(1);
});

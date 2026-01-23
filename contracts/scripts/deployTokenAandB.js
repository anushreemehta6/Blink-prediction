// scripts/deployTokenAandB.js
const hre = require("hardhat");

async function main() {
  const [deployer] = await hre.ethers.getSigners();
  console.log("Deploying with:", deployer.address);

  const Token = await hre.ethers.getContractFactory("ERC20Mock");

  const tokenA = await Token.deploy("Token_A", "TKA");
  await tokenA.waitForDeployment();
  console.log("Token A deployed at:", await tokenA.getAddress());

  const tokenB = await Token.deploy("Token_B", "TKB");
  await tokenB.waitForDeployment();
  console.log("Token B deployed at:", await tokenB.getAddress());
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});

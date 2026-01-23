const hre = require("hardhat");

async function main() {
  const [deployer] = await hre.ethers.getSigners();
  
  const USDC_ADDRESS = "0xc555Fe8af1913E6680119869E0ba37f2CA8D4148";
  const ENGINE_ADDRESS = "0x801E8d46Fe07Fc5488c6b5e1DE426ACf878d1A8B";
  
  const usdc = await hre.ethers.getContractAt("MockUSDC", USDC_ADDRESS);
  
  console.log("💰 Funding ThirtyEngine Contract...\n");
  
  // Check current balance
  const contractBalance = await usdc.balanceOf(ENGINE_ADDRESS);
  console.log("Current contract balance:", hre.ethers.formatUnits(contractBalance, 6), "USDC");
  
  // Mint 1000 USDC to contract
  console.log("\n📤 Minting 1000 USDC to contract...");
  const mintTx = await usdc.mint(ENGINE_ADDRESS, hre.ethers.parseUnits("1000", 6));
  await mintTx.wait();
  
  console.log("✅ Funded!");
  
  // Check new balance
  const newBalance = await usdc.balanceOf(ENGINE_ADDRESS);
  console.log("New contract balance:", hre.ethers.formatUnits(newBalance, 6), "USDC");
}

main().catch(console.error);
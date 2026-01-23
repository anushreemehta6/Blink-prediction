const hre = require("hardhat");

async function main() {
  console.log("🔧 Simple Resolve Test...\n");

  const ENGINE_ADDRESS = "0x801E8d46Fe07Fc5488c6b5e1DE426ACf878d1A8B";
  const engine = await hre.ethers.getContractAt("ThirtyEngine", ENGINE_ADDRESS);

  const round = await engine.getCurrentRound();
  
  console.log("Round Info:");
  console.log("Entry Price:", round.entryPrice?.toString());
  console.log("Total UP Amount:", hre.ethers.formatUnits(round.totalUpAmount, 6), "USDC");
  console.log("Total DOWN Amount:", hre.ethers.formatUnits(round.totalDownAmount, 6), "USDC");
  console.log("Resolved:", round.resolved);
  
  const totalVolume = round.totalUpAmount + round.totalDownAmount;
  console.log("\nTotal Volume:", hre.ethers.formatUnits(totalVolume, 6), "USDC");
  
  // Calculate house edge
  const houseEdge = (totalVolume * 750n) / 10000n;
  console.log("House Edge (7.5%):", hre.ethers.formatUnits(houseEdge, 6), "USDC");
  
  // Check contract USDC balance
  const usdc = await hre.ethers.getContractAt("MockUSDC", "0xc555Fe8af1913E6680119869E0ba37f2CA8D4148");
  const contractBalance = await usdc.balanceOf(ENGINE_ADDRESS);
  console.log("Contract USDC Balance:", hre.ethers.formatUnits(contractBalance, 6), "USDC");
  
  if (contractBalance < houseEdge) {
    console.log("\n❌ PROBLEM: Contract doesn't have enough USDC for house edge!");
    console.log("   This will cause the transaction to fail.");
  }
  
  // Try to estimate gas for resolve
  console.log("\n🔍 Testing resolve with manual price...");
  
  try {
    // Use a simple manual exit price for testing
    const manualExitPrice = round.entryPrice - 1000000000n; // Slightly lower
    
    // This won't actually work, but let's see what the issue is
    console.log("Manual exit price would be:", manualExitPrice.toString());
    
  } catch (error) {
    console.log("Error:", error.message);
  }
}

main().catch(console.error);
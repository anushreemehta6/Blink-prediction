const hre = require("hardhat");

async function main() {
  console.log("\n🚀 DEPLOYING 3HIRTY V3 - ONE TOUCH MARKET\n");
  console.log("=".repeat(70));

  const [deployer] = await hre.ethers.getSigners();
  console.log("Deploying with:", deployer.address);
  console.log("Balance:", (await hre.ethers.provider.getBalance(deployer.address)).toString(), "\n");

  // ========================================
  // 1️⃣  Existing USDC Address
  // ========================================
  const usdcAddress = "0xD9a4C52EfA4EfA8F698EC9941061c9ef3387DBc6";
  console.log("1️⃣  Using Existing USDC at:", usdcAddress);

  // ========================================
  // 2️⃣  Deploy ThirtyEngineV3
  // ========================================
  console.log("\n2️⃣  Deploying ThirtyEngineV3...");
  
  // Monad Testnet Pyth Address
  const PYTH_ADDRESS = "0x2880aB155794e7179c9eE2e38200202908C17B43";
  const TREASURY = deployer.address;
  
  const ThirtyEngineV3 = await hre.ethers.getContractFactory("ThirtyEngineV3");
  const engine = await ThirtyEngineV3.deploy(
    PYTH_ADDRESS,
    usdcAddress,
    TREASURY
  );
  
  await engine.waitForDeployment();
  const engineAddress = await engine.getAddress();
  console.log("✅ ThirtyEngineV3:", engineAddress);

  // ========================================
  // 3️⃣  Fund the Contract
  // ========================================
  console.log("\n3️⃣  Setting up Liquidity...");
  
  // Connect to the existing USDC contract
  const usdc = await hre.ethers.getContractAt("IERC20", usdcAddress);
  
  // Fund the Contract (The House Bankroll)
  // Ensure your deployer wallet has enough USDC balance before running this
  const fundAmount = hre.ethers.parseUnits("50", 6); // 50 USDC (assuming 6 decimals)
  
  try {
    console.log(`Attempting to transfer ${fundAmount.toString()} units to Engine...`);
    const tx = await usdc.transfer(engineAddress, fundAmount);
    await tx.wait();
    console.log("✅ Funded Contract (House Pool) with USDC");
  } catch (error) {
    console.log("⚠️ Funding failed. Check if deployer has enough USDC balance.");
    console.error(error.message);
  }

  // ========================================
  // 📋 Summary
  // ========================================
  console.log("\n" + "=".repeat(70));
  console.log("✅ DEPLOYMENT COMPLETE!");
  console.log("=".repeat(70));
  
  console.log("\n📋 Contract Addresses:");
  console.log("├─ ThirtyEngineV3:       ", engineAddress);
  console.log("├─ USDC (Existing):      ", usdcAddress);
  console.log("└─ Pyth Oracle:          ", PYTH_ADDRESS);
  
  console.log("\n" + "=".repeat(70));
  console.log("📝 UPDATE YOUR .ENV:");
  console.log("=".repeat(70));
  console.log(`THIRTY_ENGINE_ADDRESS="${engineAddress}"`);
  console.log(`NEXT_PUBLIC_THIRTY_ENGINE_ADDRESS="${engineAddress}"`);
  console.log(`USDC_ADDRESS="${usdcAddress}"`);
  console.log(`NEXT_PUBLIC_USDC_ADDRESS="${usdcAddress}"`);
  
  console.log("\n🚀 NEXT STEPS:");
  console.log("1. Copy addresses to .env");
  console.log("2. Restart your frontend");
  console.log("=".repeat(70) + "\n");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
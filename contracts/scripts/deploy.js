const hre = require("hardhat");

async function main() {
  console.log("\n🚀 DEPLOYING 3HIRTY V3 - RESERVE-BASED SYSTEM\n");
  console.log("=".repeat(70));

  const [deployer] = await hre.ethers.getSigners();
  console.log("Deploying with:", deployer.address);
  
  const balance = await hre.ethers.provider.getBalance(deployer.address);
  console.log("MON Balance:", hre.ethers.formatEther(balance), "MON\n");

  // ========================================
  // 1️⃣  Existing USDC Address
  // ========================================
  const usdcAddress = "0xD9a4C52EfA4EfA8F698EC9941061c9ef3387DBc6";
  console.log("1️⃣  Using Existing USDC at:", usdcAddress);
  
  // Check deployer's USDC balance
  const usdc = await hre.ethers.getContractAt("IERC20", usdcAddress);
  const usdcBalance = await usdc.balanceOf(deployer.address);
  console.log("   Deployer USDC Balance:", hre.ethers.formatUnits(usdcBalance, 6), "USDC");

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
  console.log("✅ ThirtyEngineV3 deployed at:", engineAddress);

  // ========================================
  // 3️⃣  Fund Contract Reserves
  // ========================================
  console.log("\n3️⃣  Funding Contract Reserves...");
  
  // Recommended: $10,000 for production, $50-100 for testing
  const fundAmount = hre.ethers.parseUnits("10000", 6); // 100 USDC for testing
  
  if (usdcBalance < fundAmount) {
    console.log("⚠️  WARNING: Deployer has insufficient USDC!");
    console.log(`   Need: ${hre.ethers.formatUnits(fundAmount, 6)} USDC`);
    console.log(`   Have: ${hre.ethers.formatUnits(usdcBalance, 6)} USDC`);
    console.log("   Skipping funding step. You'll need to fund manually later.");
  } else {
    try {
      console.log(`   Transferring ${hre.ethers.formatUnits(fundAmount, 6)} USDC to contract...`);
      const tx = await usdc.transfer(engineAddress, fundAmount);
      await tx.wait();
      
      // Verify the transfer
      const contractBalance = await usdc.balanceOf(engineAddress);
      console.log("✅ Contract funded successfully!");
      console.log(`   Contract USDC Balance: ${hre.ethers.formatUnits(contractBalance, 6)} USDC`);
    } catch (error) {
      console.log("❌ Funding failed!");
      console.error("   Error:", error.message);
      console.log("   You'll need to fund the contract manually.");
    }
  }

  // ========================================
  // 4️⃣  Configure Bot as Manager (Optional)
  // ========================================
  console.log("\n4️⃣  Setting up Bot Manager...");
  
  // Get bot address from env (if set)
  const botAddress = process.env.BOT_WALLET_ADDRESS;
  
  if (botAddress && hre.ethers.isAddress(botAddress)) {
    try {
      console.log(`   Setting ${botAddress} as manager...`);
      const tx = await engine.setManager(botAddress, true);
      await tx.wait();
      console.log("✅ Bot configured as manager");
    } catch (error) {
      console.log("⚠️  Could not set bot as manager. Set manually later.");
      console.error("   Error:", error.message);
    }
  } else {
    console.log("⚠️  BOT_WALLET_ADDRESS not set in .env");
    console.log("   You'll need to call setManager() manually after deployment");
    console.log(`   Run: await engine.setManager("YOUR_BOT_ADDRESS", true)`);
  }

  // ========================================
  // 5️⃣  Check Reserve Status
  // ========================================
  console.log("\n5️⃣  Checking Reserve Health...");
  
  try {
    const [totalBalance, pendingPayouts, availableBalance, minReserve, isHealthy] = 
      await engine.getReserveStatus();
    
    console.log("   📊 Reserve Status:");
    console.log(`   ├─ Total Balance:     $${hre.ethers.formatUnits(totalBalance, 6)}`);
    console.log(`   ├─ Pending Payouts:   $${hre.ethers.formatUnits(pendingPayouts, 6)}`);
    console.log(`   ├─ Available:         $${hre.ethers.formatUnits(availableBalance, 6)}`);
    console.log(`   ├─ Min Required:      $${hre.ethers.formatUnits(minReserve, 6)}`);
    console.log(`   └─ Health Status:     ${isHealthy ? '✅ HEALTHY' : '⚠️ NEEDS FUNDING'}`);
  } catch (error) {
    console.log("   ⚠️  Could not fetch reserve status");
  }

  // ========================================
  // 📋 Deployment Summary
  // ========================================
  console.log("\n" + "=".repeat(70));
  console.log("✅ DEPLOYMENT COMPLETE!");
  console.log("=".repeat(70));
  
  console.log("\n📋 Contract Addresses:");
  console.log("├─ ThirtyEngineV3:       ", engineAddress);
  console.log("├─ USDC (Existing):      ", usdcAddress);
  console.log("└─ Pyth Oracle:          ", PYTH_ADDRESS);
  
  console.log("\n" + "=".repeat(70));
  console.log("📝 UPDATE YOUR .ENV FILES:");
  console.log("=".repeat(70));
  
  console.log("\n# Main .env");
  console.log(`THIRTY_ENGINE_ADDRESS="${engineAddress}"`);
  console.log(`USDC_ADDRESS="${usdcAddress}"`);
  
  console.log("\n# Frontend .env.local");
  console.log(`NEXT_PUBLIC_THIRTY_ENGINE_ADDRESS="${engineAddress}"`);
  console.log(`NEXT_PUBLIC_USDC_ADDRESS="${usdcAddress}"`);
  console.log(`NEXT_PUBLIC_RPC_URL="https://monad-testnet.drpc.org/"`);
  
  console.log("\n# Bot .env");
  console.log(`THIRTY_ENGINE_ADDRESS="${engineAddress}"`);
  console.log(`BOT_PRIVATE_KEY="your_bot_private_key_here"`);
  console.log(`NEXT_PUBLIC_RPC_URL="https://monad-testnet.drpc.org/"`);
  
  console.log("\n" + "=".repeat(70));
  console.log("🚀 NEXT STEPS:");
  console.log("=".repeat(70));
  
  console.log("\n1. Copy addresses to your .env files");
  
  if (!botAddress) {
    console.log("\n2. Set bot as manager (if not done above):");
    console.log("   npx hardhat console --network monad");
    console.log(`   > const engine = await ethers.getContractAt("ThirtyEngineV3", "${engineAddress}")`);
    console.log('   > await engine.setManager("YOUR_BOT_ADDRESS", true)');
  }
  
  console.log("\n3. Ensure contract has sufficient reserves:");
  console.log("   - Minimum: $1,000 USDC (set in contract)");
  console.log("   - Recommended: $10,000+ USDC for production");
  console.log("   - Current balance shown above");
  
  console.log("\n4. Fund bot wallet with USDC:");
  console.log("   - Bot needs USDC to top up contract reserves");
  console.log("   - Recommended: $5,000+ in bot wallet");
  
  console.log("\n5. Start the bot:");
  console.log("   npm run bot");
  console.log("   (It will auto-check and fund reserves on startup)");
  
  console.log("\n6. Restart your frontend");
  
  console.log("\n" + "=".repeat(70));
  console.log("\n💡 TIPS:");
  console.log("   - Monitor reserve health regularly");
  console.log("   - Set up alerts for low reserves");
  console.log("   - Keep bot wallet funded");
  console.log("   - Check contract balance before heavy usage");
  
  console.log("\n" + "=".repeat(70) + "\n");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
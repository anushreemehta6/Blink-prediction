const hre = require("hardhat");
const axios = require("axios");

async function main() {
  console.log("🎯 Placing New Prediction with Price Bands...\n");

  const [user] = await hre.ethers.getSigners();
  console.log("User:", user.address);

  // Check balances
  const ethBalance = await user.provider.getBalance(user.address);
  console.log("ETH Balance:", hre.ethers.formatEther(ethBalance));

  // Contract addresses - UPDATE THESE AFTER DEPLOYMENT
  const USDC_ADDRESS = process.env.USDC_ADDRESS || "0xc555Fe8af1913E6680119869E0ba37f2CA8D4148";
  const ENGINE_ADDRESS = process.env.THIRTY_ENGINE_ADDRESS || "0x801E8d46Fe07Fc5488c6b5e1DE426ACf878d1A8B";
  const PYTH_ADDRESS = process.env.PYTH_ADDRESS || "0x2880aB155794e7179c9eE2e38200202908C17B43";
  const ETH_PRICE_ID = "0xff61491a931112ddf1bd8147cd1b641375f79f5825126d665480874634fd0ace";

  // Get contract instances
  const usdc = await hre.ethers.getContractAt("MockUSDC", USDC_ADDRESS);
  const engine = await hre.ethers.getContractAt("ThirtyEngine", ENGINE_ADDRESS);

  // 1. Check USDC balance
  const balance = await usdc.balanceOf(user.address);
  console.log("USDC Balance:", hre.ethers.formatUnits(balance, 6));

  if (balance < hre.ethers.parseUnits("0.1", 6)) {
    console.log("\n📥 Getting USDC from faucet...");
    const faucetTx = await usdc.faucet();
    await faucetTx.wait();
    console.log("✅ Got 100 USDC!");
  }

  // 2. Approve USDC
  console.log("\n💰 Approving USDC...");
  const approveTx = await usdc.approve(ENGINE_ADDRESS, hre.ethers.parseUnits("10", 6));
  await approveTx.wait();
  console.log("✅ USDC approved!");

  // 3. Get Pyth price update data
  console.log("\n📡 Fetching Pyth price data...");
  try {
    const response = await axios.get(
      `https://hermes.pyth.network/v2/updates/price/latest?ids[]=${ETH_PRICE_ID}`
    );
    
    const priceUpdateData = [`0x${response.data.binary.data[0]}`];
    console.log("✅ Got Pyth price data!");

    // Display current price
    const priceInfo = response.data.parsed[0];
    const currentPrice = Number(priceInfo.price.price) * Math.pow(10, priceInfo.price.expo);
    console.log(`💰 Current ETH Price: $${currentPrice.toFixed(2)}`);

    // 4. Check current round
    console.log("\n⏰ Checking current round...");
    const round = await engine.getCurrentRound();
    const timeLeft = await engine.getTimeRemaining();
    console.log("Time Remaining:", timeLeft.toString(), "seconds");

    // 5. Get oracle fee
    console.log("\n💸 Calculating oracle fee...");
    const pythContract = await hre.ethers.getContractAt(
      ["function getUpdateFee(bytes[] calldata updateData) external view returns (uint256)"],
      PYTH_ADDRESS
    );

    const oracleFee = await pythContract.getUpdateFee(priceUpdateData);
    console.log("Oracle Fee:", hre.ethers.formatEther(oracleFee), "ETH");

    // 6. Display available bands
    console.log("\n🎯 Available Price Bands:");
    console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
    console.log("📈 UP Bands:");
    console.log("  0. UP_TINY    (0-0.2%)   → 1.5x payout");
    console.log("  1. UP_SMALL   (0.2-0.5%) → 2.5x payout");
    console.log("  2. UP_MEDIUM  (0.5-1%)   → 4x payout");
    console.log("  3. UP_LARGE   (>1%)      → 8x payout");
    console.log("\n📉 DOWN Bands:");
    console.log("  4. DOWN_TINY   (0-0.2%)   → 1.5x payout");
    console.log("  5. DOWN_SMALL  (0.2-0.5%) → 2.5x payout");
    console.log("  6. DOWN_MEDIUM (0.5-1%)   → 4x payout");
    console.log("  7. DOWN_LARGE  (>1%)      → 8x payout");
    console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");

    // 7. Choose your band (CUSTOMIZE THIS!)
    const chosenBand = 1; // 👈 CHANGE THIS: 0-7
    
    const bandNames = [
      "UP_TINY (0-0.2%, 1.5x)",
      "UP_SMALL (0.2-0.5%, 2.5x)",
      "UP_MEDIUM (0.5-1%, 4x)",
      "UP_LARGE (>1%, 8x)",
      "DOWN_TINY (0-0.2%, 1.5x)",
      "DOWN_SMALL (0.2-0.5%, 2.5x)",
      "DOWN_MEDIUM (0.5-1%, 4x)",
      "DOWN_LARGE (>1%, 8x)"
    ];

    console.log("\n🎯 Placing prediction...");
    console.log("Selected Band:", bandNames[chosenBand]);
    console.log("Amount: $0.10 USDC");

    const tx = await engine.placePrediction(
      ETH_PRICE_ID,
      chosenBand, // PriceBand enum value (0-7)
      hre.ethers.parseUnits("0.1", 6), // $0.10
      priceUpdateData,
      { value: oracleFee }
    );

    console.log("Transaction hash:", tx.hash);
    console.log("⏳ Waiting for confirmation...");

    const receipt = await tx.wait();
    console.log("✅ Prediction placed successfully!");
    console.log("Block:", receipt.blockNumber);

    // 8. Check updated round
    console.log("\n📊 Round Info:");
    const newRound = await engine.getCurrentRound();
    console.log("Entry Price:", (Number(newRound.entryPrice) / 1e8).toFixed(2));
    console.log("Current Price:", currentPrice.toFixed(2));

    // Calculate what you need
    const entryPrice = Number(newRound.entryPrice) / 1e8;
    const priceMoves = {
      "UP_TINY": [entryPrice * 1.0001, entryPrice * 1.002],
      "UP_SMALL": [entryPrice * 1.002, entryPrice * 1.005],
      "UP_MEDIUM": [entryPrice * 1.005, entryPrice * 1.01],
      "UP_LARGE": [entryPrice * 1.01, Infinity],
      "DOWN_TINY": [entryPrice * 0.998, entryPrice * 0.9999],
      "DOWN_SMALL": [entryPrice * 0.995, entryPrice * 0.998],
      "DOWN_MEDIUM": [entryPrice * 0.99, entryPrice * 0.995],
      "DOWN_LARGE": [0, entryPrice * 0.99]
    };

    const bandName = bandNames[chosenBand].split(" ")[0];
    const targetRange = priceMoves[bandName];
    
    console.log("\n🎯 Target Price Range:");
    if (targetRange[1] === Infinity) {
      console.log(`   Above $${targetRange[0].toFixed(2)}`);
    } else if (targetRange[0] === 0) {
      console.log(`   Below $${targetRange[1].toFixed(2)}`);
    } else {
      console.log(`   $${targetRange[0].toFixed(2)} - $${targetRange[1].toFixed(2)}`);
    }

    console.log("\n⏰ Round will resolve in 30 seconds...");
    console.log("⏱️  Come back at:", new Date(Date.now() + 35000).toLocaleTimeString());
    console.log("\n💡 Then run:");
    console.log("   npx hardhat run scripts/smart-claim.js --network MON");

  } catch (error) {
    if (error.response) {
      console.error("❌ Pyth API Error:", error.response.data);
    } else {
      console.error("❌ Error:", error.message);
    }
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
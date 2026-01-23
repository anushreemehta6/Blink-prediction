const hre = require("hardhat");

async function main() {
  const [user] = await hre.ethers.getSigners();
  const engine = await hre.ethers.getContractAt(
    "ThirtyEngine",
    "0x801E8d46Fe07Fc5488c6b5e1DE426ACf878d1A8B"
  );
  
  console.log("🔍 Finding your active rounds...\n");
  
  // Get all rounds you participated in
  const userRounds = await engine.getUserRounds(user.address);
  console.log("You have", userRounds.length, "rounds total");
  console.log("Round IDs:", userRounds.map(r => r.toString()).join(", "));
  
  // Check each round
  for (let i = 0; i < userRounds.length; i++) {
    const roundId = userRounds[i];
    const round = await engine.rounds(roundId);
    const prediction = await engine.getUserPrediction(user.address, roundId);
    
    console.log(`\n📊 Round ${roundId}:`);
    console.log("  Start Time:", round.startTime.toString());
    console.log("  End Time:", round.endTime.toString());
    console.log("  Entry Price:", round.entryPrice.toString());
    console.log("  Resolved:", round.resolved);
    console.log("  Your Bet:", prediction.isUp ? "UP ⬆️" : "DOWN ⬇️");
    console.log("  Your Amount:", hre.ethers.formatUnits(prediction.amount, 6), "USDC");
    console.log("  Claimed:", prediction.claimed);
    
    // Check if ready to resolve
    const currentTime = Math.floor(Date.now() / 1000);
    const endTime = Number(round.endTime);
    
    if (!round.resolved && currentTime >= endTime) {
      console.log("  ✅ THIS ROUND IS READY TO RESOLVE!");
      console.log(`  💡 Use roundId = ${roundId}n in your claim script`);
    }
  }
  
  // Also check current round ID from contract
  const currentRoundId = await engine.currentRoundId();
  console.log("\n📌 Contract's current round ID:", currentRoundId.toString());
}

main().catch(console.error);
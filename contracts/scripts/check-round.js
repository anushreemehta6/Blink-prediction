const hre = require("hardhat");
const axios = require("axios");

async function main() {
  console.log("🎯 Smart Claim V2 - With Price Bands!\n");

  const [user] = await hre.ethers.getSigners();
  
  const ENGINE_ADDRESS = process.env.THIRTY_ENGINE_ADDRESS || "0x801E8d46Fe07Fc5488c6b5e1DE426ACf878d1A8B";
  const PYTH_ADDRESS = process.env.PYTH_ADDRESS || "0x2880aB155794e7179c9eE2e38200202908C17B43";
  const USDC_ADDRESS = process.env.USDC_ADDRESS || "0xc555Fe8af1913E6680119869E0ba37f2CA8D4148";
  const ETH_PRICE_ID = "0xff61491a931112ddf1bd8147cd1b641375f79f5825126d665480874634fd0ace";
  
  const engine = await hre.ethers.getContractAt("ThirtyEngine", ENGINE_ADDRESS);
  const usdc = await hre.ethers.getContractAt("MockUSDC", USDC_ADDRESS);

  // Band names
  const bandNames = [
    "UP_TINY (0-0.2%)",
    "UP_SMALL (0.2-0.5%)",
    "UP_MEDIUM (0.5-1%)",
    "UP_LARGE (>1%)",
    "DOWN_TINY (0-0.2%)",
    "DOWN_SMALL (0.2-0.5%)",
    "DOWN_MEDIUM (0.5-1%)",
    "DOWN_LARGE (>1%)"
  ];

  const multipliers = [1.5, 2.5, 4, 8, 1.5, 2.5, 4, 8];

  // Get all user rounds
  const userRounds = await engine.getUserRounds(user.address);
  console.log(`📊 Found ${userRounds.length} rounds you participated in\n`);

  if (userRounds.length === 0) {
    console.log("❌ No rounds found. Place a prediction first!");
    return;
  }

  let totalWins = 0;
  let totalLosses = 0;
  let totalClaimedAmount = 0;
  let totalUnclaimedAmount = 0;
  let roundsToResolve = [];
  let roundsToClaim = [];

  // Analyze all rounds
  for (let i = 0; i < userRounds.length; i++) {
    const roundId = userRounds[i];
    const round = await engine.rounds(roundId);
    const prediction = await engine.getUserPrediction(user.address, roundId);

    const entryPrice = Number(round.entryPrice) / 1e8;
    const exitPrice = Number(round.exitPrice) / 1e8;
    const betAmount = Number(hre.ethers.formatUnits(prediction.amount, 6));

    console.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
    console.log(`📊 Round ${roundId}`);
    console.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
    console.log(`Entry Price: $${entryPrice.toFixed(2)}`);
    
    if (round.resolved) {
      console.log(`Exit Price:  $${exitPrice.toFixed(2)}`);
      
      const percentChange = ((exitPrice - entryPrice) / entryPrice * 100).toFixed(2);
      console.log(`Price Change: ${percentChange}%`);

      const winningBand = Number(round.winningBand);
      const userBand = Number(prediction.band);

      console.log(`Your Band:    ${bandNames[userBand]}`);
      console.log(`Winning Band: ${bandNames[winningBand]}`);

      const userWon = userBand === winningBand;
      console.log(`Result:       ${userWon ? "WON 🎉" : "LOST 😢"}`);

      if (userWon) {
        totalWins++;
        const payout = betAmount * multipliers[userBand] * 0.925; // After 7.5% house edge
        
        if (prediction.claimed) {
          console.log(`Status:       ✅ Already claimed`);
          console.log(`Payout:       $${payout.toFixed(3)}`);
          totalClaimedAmount += payout;
        } else {
          console.log(`Status:       💰 Ready to claim!`);
          console.log(`Payout:       $${payout.toFixed(3)}`);
          totalUnclaimedAmount += payout;
          roundsToClaim.push(roundId);
        }
      } else {
        totalLosses++;
        console.log(`Status:       Nothing to claim`);
      }
    } else {
      console.log(`Status:       ⏳ Not resolved yet`);
      console.log(`Your Band:    ${bandNames[Number(prediction.band)]}`);
      
      // Check if ready to resolve
      const currentTime = Math.floor(Date.now() / 1000);
      const endTime = Number(round.endTime);
      
      if (currentTime >= endTime) {
        console.log(`              ✅ Ready to resolve!`);
        roundsToResolve.push(roundId);
      } else {
        const timeLeft = endTime - currentTime;
        console.log(`              ⏰ Wait ${timeLeft}s`);
      }
    }
  }

  // Summary
  console.log(`\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
  console.log(`📈 SUMMARY`);
  console.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
  console.log(`Total Rounds:     ${userRounds.length}`);
  console.log(`Wins:             ${totalWins} ✅`);
  console.log(`Losses:           ${totalLosses} ❌`);
  console.log(`Win Rate:         ${totalWins > 0 ? ((totalWins / (totalWins + totalLosses)) * 100).toFixed(1) : 0}%`);
  console.log(`Already Claimed:  $${totalClaimedAmount.toFixed(3)}`);
  console.log(`Ready to Claim:   $${totalUnclaimedAmount.toFixed(3)}`);
  const totalBet = (totalWins + totalLosses) * 0.1;
  console.log(`Net Profit:       $${(totalClaimedAmount + totalUnclaimedAmount - totalBet).toFixed(3)}`);

  // Resolve pending rounds
  if (roundsToResolve.length > 0) {
    console.log(`\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
    console.log(`🔄 RESOLVING ${roundsToResolve.length} ROUND(S)`);
    console.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);

    const pythContract = await hre.ethers.getContractAt(
      ["function getUpdateFee(bytes[] calldata) external view returns (uint256)"],
      PYTH_ADDRESS
    );

    for (let i = 0; i < roundsToResolve.length; i++) {
      const roundId = roundsToResolve[i];
      console.log(`\n🔄 Resolving Round ${roundId}...`);

      try {
        const response = await axios.get(
          `https://hermes.pyth.network/v2/updates/price/latest?ids[]=${ETH_PRICE_ID}`
        );
        
        const priceUpdateData = [`0x${response.data.binary.data[0]}`];
        const oracleFee = await pythContract.getUpdateFee(priceUpdateData);
        
        const resolveTx = await engine.resolveRound(roundId, priceUpdateData, { 
          value: oracleFee
        });
        
        console.log(`   Tx: ${resolveTx.hash}`);
        await resolveTx.wait(1, 120000);
        console.log(`   ✅ Resolved!`);

        // Check if we won
        const round = await engine.rounds(roundId);
        const prediction = await engine.getUserPrediction(user.address, roundId);
        
        const winningBand = Number(round.winningBand);
        const userBand = Number(prediction.band);
        const userWon = userBand === winningBand;

        if (userWon && !prediction.claimed) {
          roundsToClaim.push(roundId);
          const payout = 0.1 * multipliers[userBand] * 0.925;
          totalUnclaimedAmount += payout;
        }

      } catch (error) {
        console.log(`   ❌ Error: ${error.message}`);
      }
    }
  }

  // Claim winnings
  if (roundsToClaim.length > 0) {
    console.log(`\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
    console.log(`💰 CLAIMING ${roundsToClaim.length} ROUND(S)`);
    console.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);

    const balanceBefore = await usdc.balanceOf(user.address);
    let successfulClaims = 0;

    for (let i = 0; i < roundsToClaim.length; i++) {
      const roundId = roundsToClaim[i];
      console.log(`\n💰 Claiming Round ${roundId}...`);

      try {
        const claimTx = await engine.claimReward(roundId, {
          gasLimit: 300000n
        });
        
        console.log(`   Tx: ${claimTx.hash}`);
        await claimTx.wait(1, 120000);
        console.log(`   ✅ Claimed!`);
        successfulClaims++;

      } catch (error) {
        console.log(`   ❌ Error: ${error.message}`);
      }
    }

    const balanceAfter = await usdc.balanceOf(user.address);
    const totalClaimed = balanceAfter - balanceBefore;

    console.log(`\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
    console.log(`🎉 CLAIMED ${successfulClaims} ROUND(S)!`);
    console.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
    console.log(`Total Claimed:   $${hre.ethers.formatUnits(totalClaimed, 6)}`);
    console.log(`New Balance:     ${hre.ethers.formatUnits(balanceAfter, 6)} USDC`);

  } else {
    console.log(`\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
    console.log(`✅ Nothing to claim right now!`);
    console.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
  }

  console.log(`\n🎮 Want to play again?`);
  console.log(`   npx hardhat run scripts/test-prediction.js --network MON\n`);
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
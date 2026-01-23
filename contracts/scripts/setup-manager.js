const hre = require("hardhat");

async function main() {
  const engineAddress = "0x0c786Fb8D6e050d8854d0fAa6D97d8Bf317E3630"; // From your .env
  const botAddress = "0x6b4abD80E900F70DFbe9Cf0aA8706EF7C72099b3"; // The address for BOT_PRIVATE_KEY

  const [deployer] = await hre.ethers.getSigners();
  console.log("Authorizing bot with deployer:", deployer.address);

  // Attach to the existing contract
  const ThirtyEngineV3 = await hre.ethers.getContractFactory("ThirtyEngineV3");
  const engine = ThirtyEngineV3.attach(engineAddress);

  // Call setManager to authorize your bot
  console.log(`Setting manager status for ${botAddress}...`);
  const tx = await engine.setManager(botAddress, true);
  await tx.wait();

  console.log("✅ Bot authorized as Manager!");
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
const { ethers } = require("hardhat");
require("dotenv").config();

async function main() {
  const signer = (await ethers.getSigners())[0];
  const backendAddress = signer.address; // or hardcode your backend wallet address

  const FACTORY_PROXY = "0x258b0F112b1d476542bC61f133C93C2aF0057E5A"; // your deployed factory proxy

  const Factory = await ethers.getContractFactory("MiniDexFactoryUpgradeable");
  const factory = await Factory.attach(FACTORY_PROXY);

  const tx = await factory.setTrustedUpdater(backendAddress, true);
  await tx.wait();

  console.log(`✅ ${backendAddress} is now a trusted updater`);
}

main().catch((err) => {
  console.error("❌ Error setting trusted updater:", err);
  process.exit(1);
});

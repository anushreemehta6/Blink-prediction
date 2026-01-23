import { privateKeyToAccount } from "viem/accounts";
import { toMetaMaskSmartAccount, Implementation } from "@metamask/smart-accounts-kit";
import { publicClient } from "./bundler";
import dbConnect from "@/lib/db/connect";
import Session from "@/lib/db/models/Session";
import { type Address } from "viem";

/**
 * Creates MetaMask Smart Account from stored session
 * Looks up session by SMART ACCOUNT address and uses stored private key
 * 
 * This matches the MetaCow implementation exactly
 */
export async function createSessionAccountFromAddress(smartAccountAddress: string) {
  await dbConnect();
  
  console.log(`\n🔍 Looking up session by smart account: ${smartAccountAddress}`);
  
  // Look up session by smart account address
  const session = await Session.findOne({
    smartAccountAddress: smartAccountAddress.toLowerCase(),
  });

  if (!session) {
    console.error(`❌ Session not found!`);
    console.error(`   Searched for: ${smartAccountAddress.toLowerCase()}`);
    
    // Debug: Show all sessions in database
    const allSessions = await Session.find({}).select('smartAccountAddress userWallet');
    console.error(`   📋 Available sessions in DB:`);
    allSessions.forEach((s, i) => {
      console.error(`      ${i + 1}. Smart: ${s.smartAccountAddress} | User: ${s.userWallet}`);
    });
    
    throw new Error(`Session not found for smart account: ${smartAccountAddress}`);
  }

  if (!session.privateKey) {
    throw new Error(`Session found but missing private key`);
  }

  console.log(`✅ Session found:`);
  console.log(`   Smart Account: ${session.smartAccountAddress}`);
  console.log(`   EOA: ${session.eoaAddress}`);
  console.log(`   User: ${session.userWallet}`);

  // Create signer from private key
  const signer = privateKeyToAccount(session.privateKey as `0x${string}`);

  // Recreate the same MetaMask Smart Account
  const sessionAccount = await toMetaMaskSmartAccount({
    client: publicClient,
    implementation: Implementation.Hybrid,
    deployParams: [signer.address, [], [], []],
    deploySalt: "0x",
    signer: { account: signer },
  });

  console.log(`✅ Recreated smart account: ${sessionAccount.address}`);

  // Verify addresses match
  if (sessionAccount.address.toLowerCase() !== session.smartAccountAddress.toLowerCase()) {
    console.error(`❌ Address mismatch!`);
    console.error(`   Expected: ${session.smartAccountAddress}`);
    console.error(`   Got: ${sessionAccount.address}`);
    throw new Error(
      `Smart account address mismatch! ` +
      `Expected: ${session.smartAccountAddress}, ` +
      `Got: ${sessionAccount.address}`
    );
  }

  return {
    account: sessionAccount,
    address: sessionAccount.address,
    signer,
  };
}

/**
 * Create a NEW session account with a fresh private key
 * This is called when setting up auto-trade for the first time
 */
export async function createNewSessionAccount(userWallet: string) {
  const { generatePrivateKey } = await import("viem/accounts");
  
  // Generate a fresh private key for this session
  const privateKey = generatePrivateKey();
  const signer = privateKeyToAccount(privateKey);

  // Calculate the future Smart Account address
  const sessionAccount = await toMetaMaskSmartAccount({
    client: publicClient,
    implementation: Implementation.Hybrid,
    deployParams: [signer.address, [], [], []],
    deploySalt: "0x",
    signer: { account: signer },
  });

  console.log(`🆕 Created NEW session account:`);
  console.log(`   EOA: ${signer.address}`);
  console.log(`   Smart Account: ${sessionAccount.address}`);

  return {
    smartAccountAddress: sessionAccount.address,
    eoaAddress: signer.address,
    privateKey,
  };
}
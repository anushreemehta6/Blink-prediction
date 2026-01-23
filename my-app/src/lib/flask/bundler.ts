import * as dotenv from 'dotenv';
import * as path from 'path';

// Load environment variables FIRST
dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });
dotenv.config({ path: path.resolve(process.cwd(), '.env') });

import { createPublicClient, http } from "viem";
import { createBundlerClient } from "viem/account-abstraction";
import { monadTestnet } from "@/lib/chains";
import { erc7710BundlerActions } from "@metamask/smart-accounts-kit/actions";

// Get bundler URL with validation
const bundlerUrl = process.env.BUNDLER_RPC || process.env.NEXT_PUBLIC_BUNDLER_URL;

if (!bundlerUrl) {
  console.warn(
    "⚠️ BUNDLER_RPC environment variable not set. " +
    "Bundler client will be unavailable for delegated operations."
  );
}

console.log(`🔗 Using Bundler: ${bundlerUrl?.substring(0, 40)}...`);

/**
 * Public client for reading blockchain state
 */
export const publicClient = createPublicClient({
  chain: monadTestnet,
  transport: http(
    process.env.NEXT_PUBLIC_RPC_URL || 
    process.env.MONAD_TESTNET_RPC || 
    "https://monad-testnet.drpc.org/"
  ),
});

/**
 * Bundler client for executing user operations with Advanced Permissions
 * This extends the standard bundler client with ERC-7710 delegation actions
 * 
 * NOTE: erc7710BundlerActions is a function that returns an extension function
 */
export const bundlerClient = bundlerUrl 
  ? createBundlerClient({
      client: publicClient,
      transport: http(bundlerUrl),
      paymaster: true, // Enable paymaster for gasless transactions
    }).extend(erc7710BundlerActions()) // ✅ Must call the function!
  : null;

/**
 * Get bundler client with error handling
 */
export function getBundlerClient() {
  if (!bundlerClient) {
    throw new Error(
      "Bundler client not initialized. " +
      "Please set BUNDLER_RPC or NEXT_PUBLIC_BUNDLER_URL environment variable."
    );
  }
  return bundlerClient;
}
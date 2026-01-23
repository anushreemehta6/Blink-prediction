/**
 * Contract Addresses and Configuration
 */

import { type Address } from 'viem';

// Network configuration
export const CHAIN_ID = parseInt(process.env.NEXT_PUBLIC_CHAIN_ID || '10143');
export const RPC_URL = process.env.NEXT_PUBLIC_RPC_URL || 'https://monad-testnet.drpc.org/';

// Addresses
export const THIRTY_ENGINE_ADDRESS = (
  process.env.NEXT_PUBLIC_THIRTY_ENGINE_ADDRESS || 
  process.env.THIRTY_ENGINE_ADDRESS || ''
) as Address;

export const USDC_ADDRESS = (
  process.env.NEXT_PUBLIC_USDC_ADDRESS || 
  process.env.USDC_ADDRESS || ''
) as Address;

export const PYTH_ADDRESS = (
  process.env.NEXT_PUBLIC_PYTH_ADDRESS || 
  process.env.PYTH_ADDRESS || ''
) as Address;

// Validation
if (!THIRTY_ENGINE_ADDRESS) console.warn('⚠️ THIRTY_ENGINE_ADDRESS not set');

// ✅ ONE-TOUCH CONFIGURATION
export const GAME_CONFIG = {
  duration: 30, // seconds
  minMultiplier: 1.1,
  maxMultiplier: 50.0,
  houseEdge: 0.0, // Edge is built into the difficulty now
  minBet: 0.1,
  maxBet: 100,
} as const;

// Helper: Calculate potential payout based on multiplier
export function calculatePayout(amount: number, multiplier: number): number {
  return amount * multiplier;
}

export const NETWORK_INFO = {
  chainId: CHAIN_ID,
  name: 'Monad Testnet',
  rpcUrl: RPC_URL,
  blockExplorer: 'https://explorer.testnet.monad.xyz',
  nativeCurrency: { name: 'MON', symbol: 'MON', decimals: 18 },
} as const;
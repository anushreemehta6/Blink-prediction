// lib/constants.ts
import { type Address } from 'viem';

// Official Pyth Price IDs (Remove 0x for API compatibility)
export const PYTH_PRICE_IDS = {
  ETH: "ff61491a931112ddf1bd8147cd1b641375f79f5825126d665480874634fd0ace",
  BTC: "e62df6c8b4a85fe1a67db44dc12de5db330f7ac66b72dc658afedf0f4a415b43",
SOL: "ef0d8b6fda2ceba41da15d4095d1da392a0d2f8ed0c6c7bc0f4cfac8c280b56d",
  BNB: "2f95862b045670cd22bee3114c39763a4a08beeb663b145d283c31d7d1101c4f",
} as const;

export const MONAD_CONFIG = {
  CHAIN_NAME: 'Monad Testnet',
  CONTRACT_ADDRESS: '0x2880aB155794e7179c9eE2e38200202908C17B43' as Address,
  // Stable Hermes V2 Endpoint
  HERMES_ENDPOINT: 'https://hermes.pyth.network/v2/updates/price/latest',
} as const;

export type AssetSymbol = keyof typeof PYTH_PRICE_IDS;

// Helper to get ID with 0x prefix for Smart Contracts
export const getPriceId = (symbol: AssetSymbol): `0x${string}` => {
  return `0x${PYTH_PRICE_IDS[symbol]}` as `0x${string}`;
};

export const ASSET_METADATA: Record<AssetSymbol, { name: string; color: string }> = {
  ETH: { name: 'Ethereum', color: '#0A696C' },
  BTC: { name: 'Bitcoin', color: '#F7931A' },
  SOL: { name: 'Solana', color: '#14F195' },
  BNB: { name: 'BNB', color: '#F3BA2F' },
};
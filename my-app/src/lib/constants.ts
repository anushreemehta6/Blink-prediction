import { type Address } from 'viem';

// Official Pyth Price IDs (Standard for Hermes V2)
export const PYTH_PRICE_IDS = {
  ETH: "ff61491a931112ddf1bd8147cd1b641375f79f5825126d665480874634fd0ace",
  BTC: "e62df6c8b4a941d4d872153919f0485733924556a046f0b21ea70b03610c093c",
  SOL: "ef0d8b6fda2ce353c7d57646d3f2c97a53071859cf9d2939a98f02ca3938d17a",
  BNB: "2f95862b045670cd22bee3114c39763a4a08beeb663b145d283c31d7d1101c4f",
} as const;

export type AssetSymbol = keyof typeof PYTH_PRICE_IDS;

export const MONAD_CONFIG = {
  CHAIN_NAME: 'Monad Testnet',
  CONTRACT_ADDRESS: '0x2880aB155794e7179c9eE2e38200202908C17B43' as Address,
  HERMES_ENDPOINT: 'https://hermes.pyth.network/v2/updates/price/latest',
} as const;

// Helper: Adds 0x for Contract Calls (Write)
export const getPriceId = (symbol: AssetSymbol): `0x${string}` => {
  return `0x${PYTH_PRICE_IDS[symbol]}` as `0x${string}`;
};

// Helper: Raw ID for API Calls (Read)
export const getPythId = (symbol: AssetSymbol): string => {
  return PYTH_PRICE_IDS[symbol];
};

// 🎨 Centralized Metadata
export const ASSET_METADATA: Record<AssetSymbol, { 
  name: string; 
  color: string; 
  gradient: string;
  symbol: string;
}> = {
  ETH: { 
    name: 'Ethereum', 
    color: '#627EEA',
    gradient: 'linear-gradient(135deg, #627EEA 0%, #4E5FD1 100%)',
    symbol: 'Ξ'
  },
  BTC: { 
    name: 'Bitcoin', 
    color: '#F7931A',
    gradient: 'linear-gradient(135deg, #F7931A 0%, #E07D0A 100%)',
    symbol: '₿'
  },
  SOL: { 
    name: 'Solana', 
    color: '#14F195',
    gradient: 'linear-gradient(135deg, #14F195 0%, #0AC57D 100%)',
    symbol: '◎'
  },
  BNB: { 
    name: 'BNB', 
    color: '#F3BA2F',
    gradient: 'linear-gradient(135deg, #F3BA2F 0%, #D9A51F 100%)',
    symbol: 'B'
  },
};
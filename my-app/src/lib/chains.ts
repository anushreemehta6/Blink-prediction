import { type Chain } from 'viem';

export const monadTestnet = {
  id: 10143,
  name: 'Monad Testnet',
  nativeCurrency: {
    decimals: 18,
    name: 'MON',
    symbol: 'MON',
  },
  rpcUrls: {
    default: { 
      http: ['https://monad-testnet.drpc.org/'] 
    },
    public: { 
      http: ['https://monad-testnet.drpc.org/'] 
    },
  },
  blockExplorers: {
    default: { 
      name: 'Monad Explorer', 
      url: 'https://explorer.testnet.monad.xyz' 
    },
  },
  testnet: true,
} as const satisfies Chain;
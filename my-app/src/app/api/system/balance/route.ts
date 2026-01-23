// src/app/api/system/balance/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { createPublicClient, http, formatUnits } from 'viem';
import { THIRTY_ENGINE_ADDRESS, USDC_ADDRESS, RPC_URL, CHAIN_ID } from '@/lib/contracts/addresses';

// Force dynamic to prevent 405 on some static hosting setups
export const dynamic = 'force-dynamic'; 

const ERC20_ABI = [
  {
    name: 'balanceOf',
    type: 'function',
    stateMutability: 'view',
    inputs: [{ name: 'account', type: 'address' }],
    outputs: [{ name: '', type: 'uint256' }],
  },
] as const;

export async function GET(req: NextRequest) { // <--- Must be GET
  try {
    const publicClient = createPublicClient({
      chain: {
        id: CHAIN_ID,
        name: 'Monad Testnet',
        nativeCurrency: { name: 'MON', symbol: 'MON', decimals: 18 },
        rpcUrls: { default: { http: [RPC_URL] } },
      },
      transport: http(RPC_URL),
    });

    const balance = await publicClient.readContract({
      address: USDC_ADDRESS,
      abi: ERC20_ABI,
      functionName: 'balanceOf',
      args: [THIRTY_ENGINE_ADDRESS],
    });

    return NextResponse.json({
      houseBalance: formatUnits(balance, 6),
      status: balance > 0n ? 'SOLVENT' : 'INSOLVENT'
    });
  } catch (error: any) {
    console.error("Balance Fetch Error:", error);
    return NextResponse.json({ error: 'Failed to fetch liquidity' }, { status: 500 });
  }
}
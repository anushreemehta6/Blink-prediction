// scripts/diagnose-state.ts
import * as dotenv from 'dotenv';
import * as path from 'path';
dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

import { createPublicClient, http, formatUnits, defineChain } from 'viem';
import { V3_ABI } from '../src/services/abi'; 

// CONFIG
const THIRTY_ENGINE_ADDRESS = "0x1cd9BFfEbEB084925FB043f0b70eC5Fa1D1D48B4";
const POSITION_ID = 1769237350173n;
const RPC_URL = "https://testnet-rpc.monad.xyz/";
const monadTestnet = defineChain({
  id: 10143,
  name: 'Monad Testnet',
  nativeCurrency: { name: 'MON', symbol: 'MON', decimals: 18 },
  rpcUrls: { default: { http: [RPC_URL] } },
});

const publicClient = createPublicClient({ chain: monadTestnet, transport: http(RPC_URL) });

async function diagnose() {
    console.log(`\n🏥 CHECKING CONTRACT INTERNAL HEALTH...`);

    // 1. Get Global Pending Payouts
    const pendingTotal = await publicClient.readContract({
        address: THIRTY_ENGINE_ADDRESS, abi: V3_ABI,
        functionName: 'totalPendingPayouts'
    }) as bigint;

    // 2. Get This Position's Payout
    const pos = await publicClient.readContract({
        address: THIRTY_ENGINE_ADDRESS, abi: V3_ABI,
        functionName: 'positions', args: [POSITION_ID]
    }) as any;
    
    const amount = pos[7];
    const multiplier = pos[8];
    const myPayout = (amount * multiplier) / 100n;

    console.log(`\n📊 STATE ANALYSIS:`);
    console.log(`   Global Pending Payouts: $${formatUnits(pendingTotal, 6)}`);
    console.log(`   Your Trade Payout:      $${formatUnits(myPayout, 6)}`);

    console.log(`\n🩺 DIAGNOSIS:`);
    if (pendingTotal < myPayout) {
        console.log(`   ❌ CRITICAL FAILURE FOUND!`);
        console.log(`   The contract thinks it only owes $${formatUnits(pendingTotal, 6)},`);
        console.log(`   but you are trying to claim $${formatUnits(myPayout, 6)}.`);
        console.log(`   Result: "totalPendingPayouts -= maxPayout" causes UNDERFLOW REVERT.`);
    } else {
        console.log(`   ✅ State looks healthy. (Underflow is not the issue)`);
    }
}

diagnose();
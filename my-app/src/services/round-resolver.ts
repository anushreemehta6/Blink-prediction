/* ============================================================
   3HIRTY V3 BOT - MANAGER EDITION (Stable Auto-Settlement)
   ============================================================ */

import * as dotenv from 'dotenv';
import * as path from 'path';

dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });
dotenv.config({ path: path.resolve(process.cwd(), '.env') });

import { createPublicClient, createWalletClient, http, type Address, parseEther, defineChain } from 'viem';
import { privateKeyToAccount } from 'viem/accounts';
import axios from 'axios';
import { V3_ABI } from './abi'; 

const THIRTY_ENGINE_ADDRESS = process.env.THIRTY_ENGINE_ADDRESS as Address;
const RPC_URL = process.env.NEXT_PUBLIC_RPC_URL || 'https://monad-testnet.drpc.org/';
const PRIVATE_KEY = process.env.BOT_PRIVATE_KEY as `0x${string}`;
const ETH_PRICE_ID = '0xff61491a931112ddf1bd8147cd1b641375f79f5825126d665480874634fd0ace';
const APP_API_BASE = 'http://127.0.0.1:3000/api'; 

const monadTestnet = defineChain({
  id: 10143,
  name: 'Monad Testnet',
  nativeCurrency: { name: 'MON', symbol: 'MON', decimals: 18 },
  rpcUrls: {
    default: { http: [RPC_URL] },
    public: { http: [RPC_URL] },
  },
});

const account = privateKeyToAccount(PRIVATE_KEY);
const publicClient = createPublicClient({ chain: monadTestnet, transport: http(RPC_URL) });
const walletClient = createWalletClient({ account, chain: monadTestnet, transport: http(RPC_URL) });

console.log('🤖 3HIRTY BOT STARTED [STABLE AUTO-SETTLE]');
console.log(`   Bot Address: ${account.address}`);

/* ============================================================
   STATE TRACKING
   ============================================================ */
let activePositions: Map<bigint, any> = new Map();
let registeredOnChain: Set<bigint> = new Set(); 
let resolvingPositions: Set<bigint> = new Set(); // ✅ Prevents spamming failed TXs

/* ============================================================
   HELPERS
   ============================================================ */

async function getPythUpdateData(): Promise<`0x${string}`[]> {
    try {
        const res = await axios.get(`https://hermes.pyth.network/v2/updates/price/latest?ids[]=${ETH_PRICE_ID}`);
        return res.data.binary.data.map((d: string) => `0x${d}` as `0x${string}`);
    } catch (e) { return []; }
}

async function getCurrentPrice(): Promise<bigint> {
    try {
        const res = await axios.get(`https://hermes.pyth.network/v2/updates/price/latest?ids[]=${ETH_PRICE_ID}`);
        return BigInt(res.data.parsed[0].price.price);
    } catch (e) { return 0n; }
}

async function syncAutoTradesFromDB() {
    try {
        console.log(`🔍 [${new Date().toLocaleTimeString()}] Polling for active trades...`);
        const res = await axios.get(`${APP_API_BASE}/predictions/history?limit=50`);
        const predictions = res.data.predictions || [];

        for (const pos of predictions) {
            const id = BigInt(pos.positionId);
            if (pos.status === 'OPEN' && !activePositions.has(id)) {
                activePositions.set(id, pos);
                
                // Sessions/Auto-Trades need on-chain registration
                if (pos.isAutoTrade && !registeredOnChain.has(id)) {
                    await registerOnChain(pos);
                }
            }
        }
    } catch (error: any) { console.error("   ⚠️ DB Poll Error:", error.message); }
}

async function registerOnChain(dbPos: any) {
    const id = BigInt(dbPos.positionId);
    try {
        console.log(`⛓️  Registering #${id} on-chain...`);
        const targetPriceInt = BigInt(Math.floor(parseFloat(dbPos.targetPrice) * 1e8));
        const entryPriceInt = BigInt(Math.floor(parseFloat(dbPos.entryPrice || dbPos.targetPrice) * 1e8));
        const amountUSDC = BigInt(Math.floor(parseFloat(dbPos.amount) * 1e6)); 

        await walletClient.writeContract({
            address: THIRTY_ENGINE_ADDRESS,
            abi: V3_ABI,
            functionName: 'registerTransferPosition',
            args: [dbPos.userWallet as Address, targetPriceInt, amountUSDC, entryPriceInt, id]
        });
        registeredOnChain.add(id);
    } catch (err: any) { console.error(`   ❌ Registration Failed #${id}`); }
}

async function resolveOnChain(id: bigint) {
    try {
        console.log(`💰 [ON-CHAIN] Settling Position #${id}...`);
        const pythUpdate = await getPythUpdateData();
        
        const hash = await walletClient.writeContract({
            address: THIRTY_ENGINE_ADDRESS,
            abi: V3_ABI,
            functionName: 'resolvePosition',
            args: [id, pythUpdate],
            value: parseEther('0.02') // Bot covers oracle fee
        });
        console.log(`   ✅ Settle TX Sent: ${hash}`);
    } catch (e: any) {
        console.error(`   ❌ On-Chain Settlement Failed for #${id}:`, e.shortMessage || e.message);
    }
}

async function updateDB(id: bigint, won: boolean, payout: number) {
    try {
        await axios.post(`${APP_API_BASE}/predictions/update`, {
            positionId: id.toString(),
            isWon: won,
            payout: payout.toString()
        });
        console.log(`   💾 DB Updated: #${id} -> ${won ? 'WON' : 'LOST'}`);
    } catch (e) { console.error(`❌ DB Update Failed for #${id}`); }
}

/* ============================================================
   ENGINE LOOP
   ============================================================ */

async function checkPositions() {
    if (activePositions.size === 0) return;

    try {
        const currentPrice = await getCurrentPrice();
        const now = BigInt(Math.floor(Date.now() / 1000));
        if (currentPrice === 0n) return;

        for (const [id, dbPos] of activePositions.entries()) {
            // ✅ SKIP if already in process of resolving
            if (resolvingPositions.has(id)) continue;

            const startTime = id / 1000n;
            const expiry = startTime + 30n;
            const target = BigInt(Math.floor(parseFloat(dbPos.targetPrice) * 1e8));
            
            let hit = dbPos.isUpward ? currentPrice >= target : currentPrice <= target;

            if (hit || now > expiry) {
                resolvingPositions.add(id); // Lock the position
                
                console.log(`\n🎯 #${id} Triggered | Result: ${hit ? 'WIN' : 'LOSS'}`);
                
                try {
                    const payout = hit ? parseFloat(dbPos.amount) * parseFloat(dbPos.multiplier) : 0;
                    
                    // 1. Update DB
                    await updateDB(id, hit, payout);
                    
                    // 2. If it's a WIN, settle on-chain
                    if (hit) {
                        // Wait for on-chain Oracle to catch up to Bot's faster API
                        await new Promise(r => setTimeout(r, 1500)); 
                        await resolveOnChain(id);
                    }
                    
                    activePositions.delete(id);
                } catch (err) {
                    console.error(`⚠️ Error resolving #${id}, retry next loop.`);
                } finally {
                    resolvingPositions.delete(id); // Unlock for next attempt if needed
                }
            }
        }
    } catch (e) { console.error("Loop Error:", e); }
}

/* ============================================================
   RUN
   ============================================================ */
setInterval(syncAutoTradesFromDB, 5000);
setInterval(checkPositions, 2000);

console.log('🚀 BOT ACTIVE: Monitoring DB and Auto-Settling Wins...');
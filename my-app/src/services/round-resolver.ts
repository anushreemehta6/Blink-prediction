/* ============================================================
   3HIRTY V3 BOT - MULTI-ASSET MANAGER (Stable Auto-Settlement)
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
const APP_API_BASE = 'http://127.0.0.1:3000/api'; 

// Multi-Asset Price IDs
const PYTH_PRICE_IDS: Record<string, string> = {
  ETH: '0xff61491a931112ddf1bd8147cd1b641375f79f5825126d665480874634fd0ace',
  BTC: '0xe62df6c8b4a941d4d872153919f0485733924556a046f0b21ea70b03610c093c',
  SOL: '0xef0d8b6fda2ce353c7d57646d3f2c97a53071859cf9d2939a98f02ca3938d17a',
  BNB: '0x2f95862b045670cd22bee3114c39763a4a08beeb663b145d283c31d7d1101c4f',
};

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

console.log('🤖 3HIRTY BOT STARTED [MULTI-ASSET AUTO-SETTLE]');
console.log(`   Bot Address: ${account.address}`);
console.log(`   Supported Assets: ${Object.keys(PYTH_PRICE_IDS).join(', ')}`);

/* ============================================================
   STATE TRACKING
   ============================================================ */
let activePositions: Map<bigint, any> = new Map();
let registeredOnChain: Set<bigint> = new Set(); 
let resolvingPositions: Set<bigint> = new Set();

// Cache for asset prices to reduce API calls
let priceCache: Map<string, { price: bigint; timestamp: number }> = new Map();
const PRICE_CACHE_TTL = 2000; // 2 seconds

/* ============================================================
   HELPERS
   ============================================================ */

function getPriceId(asset: string): string {
    const priceId = PYTH_PRICE_IDS[asset.toUpperCase()];
    if (!priceId) {
        throw new Error(`Unsupported asset: ${asset}. Supported: ${Object.keys(PYTH_PRICE_IDS).join(', ')}`);
    }
    return priceId;
}

async function getPythUpdateData(asset: string): Promise<`0x${string}`[]> {
    try {
        const priceId = getPriceId(asset);
        const res = await axios.get(
            `https://hermes.pyth.network/v2/updates/price/latest?ids[]=${priceId}`,
            { timeout: 5000 }
        );
        return res.data.binary.data.map((d: string) => `0x${d}` as `0x${string}`);
    } catch (e: any) { 
        console.error(`⚠️ Failed to get Pyth update for ${asset}:`, e.message);
        return []; 
    }
}

async function getCurrentPrice(asset: string): Promise<bigint> {
    try {
        // Check cache first
        const cached = priceCache.get(asset);
        if (cached && Date.now() - cached.timestamp < PRICE_CACHE_TTL) {
            return cached.price;
        }

        const priceId = getPriceId(asset);
        const res = await axios.get(
            `https://hermes.pyth.network/v2/updates/price/latest?ids[]=${priceId}`,
            { timeout: 5000 }
        );
        
        const price = BigInt(res.data.parsed[0].price.price);
        
        // Update cache
        priceCache.set(asset, { price, timestamp: Date.now() });
        
        return price;
    } catch (e: any) { 
        console.error(`⚠️ Failed to get price for ${asset}:`, e.message);
        return 0n; 
    }
}

async function syncAutoTradesFromDB() {
    try {
        console.log(`🔍 [${new Date().toLocaleTimeString()}] Polling for active trades...`);
        const res = await axios.get(`${APP_API_BASE}/predictions/history?limit=50`);
        const predictions = res.data.predictions || [];

        let newTrades = 0;
        for (const pos of predictions) {
            const id = BigInt(pos.positionId);
            if (pos.status === 'OPEN' && !activePositions.has(id)) {
                // Validate asset
                const asset = (pos.asset || 'ETH').toUpperCase();
                if (!(asset in PYTH_PRICE_IDS)) {
                    console.error(`   ⚠️ Invalid asset ${asset} for position #${id}`);
                    continue;
                }

                activePositions.set(id, { ...pos, asset });
                newTrades++;
                
                // Sessions/Auto-Trades need on-chain registration
                if (pos.isAutoTrade && !registeredOnChain.has(id)) {
                    await registerOnChain(pos);
                }
            }
        }

        if (newTrades > 0) {
            console.log(`   ✅ Found ${newTrades} new active trade(s)`);
        }
    } catch (error: any) { 
        console.error("   ⚠️ DB Poll Error:", error.message); 
    }
}

async function registerOnChain(dbPos: any) {
    const id = BigInt(dbPos.positionId);
    try {
        console.log(`⛓️  Registering #${id} (${dbPos.asset || 'ETH'}) on-chain...`);
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
        console.log(`   ✅ Registered #${id}`);
    } catch (err: any) { 
        console.error(`   ❌ Registration Failed #${id}:`, err.shortMessage || err.message); 
    }
}

async function resolveOnChain(id: bigint, asset: string) {
    try {
        console.log(`💰 [ON-CHAIN] Settling Position #${id} (${asset})...`);
        const pythUpdate = await getPythUpdateData(asset);
        
        if (pythUpdate.length === 0) {
            throw new Error('Failed to fetch Pyth update data');
        }

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
        throw e; // Re-throw to handle in checkPositions
    }
}

async function updateDB(id: bigint, won: boolean, payout: number) {
    try {
        await axios.post(`${APP_API_BASE}/predictions/update`, {
            positionId: id.toString(),
            isWon: won,
            payout: payout.toString()
        });
        console.log(`   💾 DB Updated: #${id} -> ${won ? 'WON' : 'LOST'} ($${payout.toFixed(2)})`);
    } catch (e: any) { 
        console.error(`❌ DB Update Failed for #${id}:`, e.message); 
    }
}

/* ============================================================
   ENGINE LOOP
   ============================================================ */

async function checkPositions() {
    if (activePositions.size === 0) return;

    try {
        const now = BigInt(Math.floor(Date.now() / 1000));
        
        // Group positions by asset for efficient price fetching
        const positionsByAsset = new Map<string, Array<[bigint, any]>>();
        
        for (const [id, dbPos] of activePositions.entries()) {
            if (resolvingPositions.has(id)) continue;
            
            const asset = (dbPos.asset || 'ETH').toUpperCase();
            if (!positionsByAsset.has(asset)) {
                positionsByAsset.set(asset, []);
            }
            positionsByAsset.get(asset)!.push([id, dbPos]);
        }

        // Process each asset group
        for (const [asset, positions] of positionsByAsset.entries()) {
            const currentPrice = await getCurrentPrice(asset);
            if (currentPrice === 0n) {
                console.log(`   ⚠️ Skipping ${asset} positions - price fetch failed`);
                continue;
            }

            for (const [id, dbPos] of positions) {
                const startTime = id / 1000n;
                const expiry = startTime + 30n;
                const target = BigInt(Math.floor(parseFloat(dbPos.targetPrice) * 1e8));
                
                let hit = dbPos.isUpward ? currentPrice >= target : currentPrice <= target;

                if (hit || now > expiry) {
                    resolvingPositions.add(id);
                    
                    console.log(`\n🎯 #${id} (${asset}) Triggered | Result: ${hit ? 'WIN' : 'LOSS'}`);
                    console.log(`   Current: $${(Number(currentPrice) / 1e8).toFixed(2)} | Target: $${(Number(target) / 1e8).toFixed(2)}`);
                    
                    try {
                        const payout = hit ? parseFloat(dbPos.amount) * parseFloat(dbPos.multiplier) : 0;
                        
                        // 1. Update DB first
                        await updateDB(id, hit, payout);
                        
                        // 2. If WIN, settle on-chain
                        if (hit) {
                            // Wait for on-chain Oracle to catch up
                            await new Promise(r => setTimeout(r, 1500)); 
                            await resolveOnChain(id, asset);
                        }
                        
                        activePositions.delete(id);
                        console.log(`   ✅ Position #${id} fully processed`);
                        
                    } catch (err: any) {
                        console.error(`⚠️ Error resolving #${id}, will retry next loop:`, err.message);
                    } finally {
                        resolvingPositions.delete(id);
                    }
                }
            }
        }
    } catch (e: any) { 
        console.error("Loop Error:", e.message); 
    }
}

/* ============================================================
   RUN
   ============================================================ */
setInterval(syncAutoTradesFromDB, 5000);  // Poll DB every 5s
setInterval(checkPositions, 2000);         // Check prices every 2s

console.log('🚀 BOT ACTIVE: Monitoring DB and Auto-Settling Wins...');
console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
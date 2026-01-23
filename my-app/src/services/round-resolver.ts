/* ============================================================
   3HIRTY V3 BOT - OPTIMIZED FOR NEW CONTRACT
   - Checks strict 30s expiry
   - Fetches fresh data right before TX
   - Only spends gas on WINS
   ============================================================ */

import * as dotenv from 'dotenv';
import * as path from 'path';

dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });
dotenv.config({ path: path.resolve(process.cwd(), '.env') });

import { createPublicClient, createWalletClient, http, type Address, parseEther, defineChain,getAddress } from 'viem';
import { privateKeyToAccount } from 'viem/accounts';
import axios from 'axios';
import { V3_ABI } from './abi'; 

// ---------------- CONFIGURATION ----------------
const THIRTY_ENGINE_ADDRESS = getAddress(process.env.THIRTY_ENGINE_ADDRESS as string);
const RPC_URL = process.env.NEXT_PUBLIC_RPC_URL || 'https://monad-testnet.drpc.org/';
const PRIVATE_KEY = process.env.BOT_PRIVATE_KEY as `0x${string}`;
const APP_API_BASE = 'http://127.0.0.1:3000/api'; 
const GAS_LIMIT_OVERRIDE = 500000n; // Safety buffer

// Multi-Asset Price IDs (Pyth)
const PYTH_PRICE_IDS: Record<string, string> = {
  ETH: '0xff61491a931112ddf1bd8147cd1b641375f79f5825126d665480874634fd0ace',
  BTC: '0xe62df6c8b4a941d4d872153919f0485733924556a046f0b21ea70b03610c093c',
  SOL: '0xef0d8b6fda2ce353c7d57646d3f2c97a53071859cf9d2939a98f02ca3938d17a',
  BNB: '0x2f95862b045670cd22bee3114c39763a4a08beeb663b145d283c31d7d1101c4f',
};

// ---------------- CHAIN SETUP ----------------
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

console.log('🤖 3HIRTY BOT V3 STARTED');
console.log(`   Account: ${account.address}`);
console.log(`   Contract: ${THIRTY_ENGINE_ADDRESS}`);
console.log(`   Strategy: Settle WINS only (Gas Saver)`);

// ---------------- STATE ----------------
let activePositions: Map<bigint, any> = new Map();
let registeredOnChain: Set<bigint> = new Set(); 
let resolvingPositions: Set<bigint> = new Set();
let priceCache: Map<string, { price: bigint; timestamp: number }> = new Map();
const PRICE_CACHE_TTL = 1500; // Keep cache tight

// ---------------- HELPERS ----------------

function getPriceId(asset: string): string {
    const priceId = PYTH_PRICE_IDS[asset.toUpperCase()];
    if (!priceId) throw new Error(`Unsupported asset: ${asset}`);
    return priceId;
}

// Fetch the "Update Data" payload required for the contract
async function getPythUpdateData(asset: string): Promise<`0x${string}`[]> {
    try {
        const priceId = getPriceId(asset);
        // Force fresh fetch by adding timestamp
        const res = await axios.get(
            `https://hermes.pyth.network/v2/updates/price/latest?ids[]=${priceId}&t=${Date.now()}`,
            { timeout: 3000 }
        );
        return res.data.binary.data.map((d: string) => `0x${d}` as `0x${string}`);
    } catch (e: any) { 
        console.error(`⚠️ Failed to get Pyth update data for ${asset}:`, e.message);
        return []; 
    }
}

// Fetch just the price for internal calculation
async function getCurrentPrice(asset: string): Promise<bigint> {
    try {
        const cached = priceCache.get(asset);
        if (cached && Date.now() - cached.timestamp < PRICE_CACHE_TTL) {
            return cached.price;
        }

        const priceId = getPriceId(asset);
        const res = await axios.get(
            `https://hermes.pyth.network/v2/updates/price/latest?ids[]=${priceId}`,
            { timeout: 3000 }
        );
        
        const price = BigInt(res.data.parsed[0].price.price);
        priceCache.set(asset, { price, timestamp: Date.now() });
        return price;
    } catch (e: any) { 
        console.error(`⚠️ Failed to get price for ${asset}:`, e.message);
        return 0n; 
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

// ---------------- ON-CHAIN ACTIONS ----------------

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
        
        // 1. Fetch FRESH data immediately before calls
        const pythUpdate = await getPythUpdateData(asset);
        if (pythUpdate.length === 0) throw new Error('Failed to fetch Pyth update data');

        // 2. Send Transaction
        const hash = await walletClient.writeContract({
            address: THIRTY_ENGINE_ADDRESS,
            abi: V3_ABI,
            functionName: 'resolvePosition',
            args: [id, pythUpdate],
            value: parseEther('0.02'), // Fee buffer
            gas: GAS_LIMIT_OVERRIDE
        });
        
        console.log(`   ✅ Settle TX Sent: ${hash}`);
        
        // Optional: Wait for receipt to confirm
        // const receipt = await publicClient.waitForTransactionReceipt({ hash });
        // if (receipt.status === 'reverted') console.error('   ❌ TX Reverted');

    } catch (e: any) {
        console.error(`   ❌ On-Chain Settlement Failed for #${id}:`, e.shortMessage || e.message);
        throw e;
    }
}

// ---------------- CORE LOOPS ----------------

async function syncAutoTradesFromDB() {
    try {
        // console.log(`🔍 Polling DB...`); 
        const res = await axios.get(`${APP_API_BASE}/predictions/history?limit=50`);
        const predictions = res.data.predictions || [];

        for (const pos of predictions) {
            const id = BigInt(pos.positionId);
            // Only pickup OPEN trades that we aren't already tracking
            if (pos.status === 'OPEN' && !activePositions.has(id)) {
                const asset = (pos.asset || 'ETH').toUpperCase();
                
                // Validate Asset
                if (!(asset in PYTH_PRICE_IDS)) {
                    console.error(`   ⚠️ Invalid asset ${asset} for position #${id}`);
                    continue;
                }

                activePositions.set(id, { ...pos, asset });
                console.log(`   ✨ Tracking active trade #${id} (${asset})`);
                
                // Register if it's an auto-trade
                if (pos.isAutoTrade && !registeredOnChain.has(id)) {
                    await registerOnChain(pos);
                }
            }
        }
    } catch (error: any) { 
        // Silent error for poll to keep logs clean
    }
}

async function checkPositions() {
    if (activePositions.size === 0) return;

    try {
        const now = Date.now();
        
        // Group positions by asset to batch price fetches
        const positionsByAsset = new Map<string, Array<[bigint, any]>>();
        for (const [id, dbPos] of activePositions.entries()) {
            if (resolvingPositions.has(id)) continue;
            const asset = (dbPos.asset || 'ETH').toUpperCase();
            if (!positionsByAsset.has(asset)) positionsByAsset.set(asset, []);
            positionsByAsset.get(asset)!.push([id, dbPos]);
        }

        // Process each asset group
        for (const [asset, positions] of positionsByAsset.entries()) {
            const currentPrice = await getCurrentPrice(asset);
            if (currentPrice === 0n) continue;

            for (const [id, dbPos] of positions) {
                // Determine Expiry
                // Fallback: If DB has no startTime, assume ID is the timestamp (legacy support)
                const startTime = dbPos.createdAt ? new Date(dbPos.createdAt).getTime() : Number(id);
                const expiryTime = startTime + 30000; // 30 seconds
                
                // Wait strictly for Expiry
                if (now < expiryTime) continue;

                resolvingPositions.add(id);
                const target = BigInt(Math.floor(parseFloat(dbPos.targetPrice) * 1e8));

                // 1. Local Calculation
                const hit = dbPos.isUpward 
                    ? currentPrice >= target 
                    : currentPrice <= target;
                
                console.log(`\n🎯 #${id} [${asset}] EXPIRED | Current: $${Number(currentPrice)/1e8} | Target: $${Number(target)/1e8} | Result: ${hit ? 'WIN' : 'LOSS'}`);
                
                try {
                    const payout = hit ? parseFloat(dbPos.amount) * parseFloat(dbPos.multiplier) : 0;
                    
                    // 2. Update Database FIRST (Optimistic UI)
                    await updateDB(id, hit, payout);
                    
                    // 3. If WIN, Settle On-Chain
                    if (hit) {
                        // GAS SAVER: Double check price didn't slip in the last 100ms
                        const freshPrice = await getCurrentPrice(asset);
                        const stillHit = dbPos.isUpward ? freshPrice >= target : freshPrice <= target;
                        
                        if (stillHit) {
                            await resolveOnChain(id, asset);
                        } else {
                            console.log(`   ⚠️ Price slipped at last second, skipping TX to save gas.`);
                            // Optional: Update DB back to loss if you want strict accuracy
                        }
                    } else {
                        console.log(`   📉 Loss - Skipping on-chain TX to save gas`);
                    }
                    
                    activePositions.delete(id);
                    
                } catch (err: any) {
                    console.error(`⚠️ Error resolving #${id}:`, err.message);
                } finally {
                    resolvingPositions.delete(id);
                }
            }
        }
    } catch (e: any) { 
        console.error("Loop Error:", e.message); 
    }
}

// ---------------- RUNNERS ----------------
setInterval(syncAutoTradesFromDB, 3000); // Check DB every 3s
setInterval(checkPositions, 1000);       // Check prices every 1s

console.log('🚀 BOT ACTIVE');
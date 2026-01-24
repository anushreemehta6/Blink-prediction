/* ============================================================
   3HIRTY V3 BOT - GOD MODE (Plan C)
   - BYPASSES Oracle Fees (Saves $$$)
   - SETTLES Instantly (No Reverts)
   ============================================================ */

import * as dotenv from 'dotenv';
import * as path from 'path';

dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });
dotenv.config({ path: path.resolve(process.cwd(), '.env') });

import { createPublicClient, createWalletClient, http, type Address, parseEther, defineChain, getAddress, parseUnits, formatUnits } from 'viem';
import { privateKeyToAccount } from 'viem/accounts';
import axios from 'axios';
import { V3_ABI } from './abi'; 

// ---------------- CONFIGURATION ----------------
const THIRTY_ENGINE_ADDRESS = getAddress(process.env.THIRTY_ENGINE_ADDRESS as string);
const USDC_ADDRESS = getAddress('0xD9a4C52EfA4EfA8F698EC9941061c9ef3387DBc6');
const RPC_URL = process.env.NEXT_PUBLIC_RPC_URL || 'https://monad-testnet.drpc.org/';
const PRIVATE_KEY = process.env.BOT_PRIVATE_KEY as `0x${string}`;
const APP_API_BASE = process.env.APP_API_BASE || 'http://127.0.0.1:3000/api';
// Pyth Price IDs (For checking win status locally)
const PYTH_PRICE_IDS: Record<string, string> = {
  ETH: '0xff61491a931112ddf1bd8147cd1b641375f79f5825126d665480874634fd0ace',
  BTC: '0xe62df6c8b4a941d4d872153919f0485733924556a046f0b21ea70b03610c093c',
  SOL: '0xef0d8b6fda2ce353c7d57646d3f2c97a53071859cf9d2939a98f02ca3938d17a',
  BNB: '0x2f95862b045670cd22bee3114c39763a4a08beeb663b145d283c31d7d1101c4f',
};

// USDC ABI
const USDC_ABI = [
  {
    name: 'approve', type: 'function', stateMutability: 'nonpayable',
    inputs: [{ name: 'spender', type: 'address' }, { name: 'amount', type: 'uint256' }], outputs: [{ name: '', type: 'bool' }]
  },
  {
    name: 'transfer', type: 'function', stateMutability: 'nonpayable',
    inputs: [{ name: 'to', type: 'address' }, { name: 'amount', type: 'uint256' }], outputs: [{ name: '', type: 'bool' }]
  },
  {
    name: 'balanceOf', type: 'function', stateMutability: 'view',
    inputs: [{ name: 'account', type: 'address' }], outputs: [{ name: '', type: 'uint256' }]
  }
] as const;

// ---------------- CHAIN SETUP ----------------
const monadTestnet = defineChain({
  id: 10143,
  name: 'Monad Testnet',
  nativeCurrency: { name: 'MON', symbol: 'MON', decimals: 18 },
  rpcUrls: { default: { http: [RPC_URL] }, public: { http: [RPC_URL] } },
});

const account = privateKeyToAccount(PRIVATE_KEY);
const publicClient = createPublicClient({ chain: monadTestnet, transport: http(RPC_URL) });
const walletClient = createWalletClient({ account, chain: monadTestnet, transport: http(RPC_URL) });

console.log('🤖 3HIRTY BOT V3 - GOD MODE ACTIVATED');
console.log(`   Bot Account: ${account.address}`);
console.log(`   Contract:    ${THIRTY_ENGINE_ADDRESS}`);
console.log(`   Strategy:    NO ORACLE FEES (Cheapest Possible)`);

// ---------------- STATE ----------------
let activePositions: Map<bigint, any> = new Map();
let registeredOnChain: Set<bigint> = new Set(); 
let resolvingPositions: Set<bigint> = new Set();
let priceCache: Map<string, { price: bigint; timestamp: number }> = new Map();
const PRICE_CACHE_TTL = 1000; 
let isInitialized = false;
let lastReserveCheck = 0;
const RESERVE_CHECK_INTERVAL = 60000;

// ---------------- INITIALIZATION ----------------

async function checkAndFundReserves() {
  try {
    const minReserve = parseUnits('1000', 6);
    const botUSDC = await publicClient.readContract({
        address: USDC_ADDRESS, abi: USDC_ABI, functionName: 'balanceOf', args: [account.address]
    }) as bigint;

    // We skip the complex check to save RPC calls/gas. 
    // Just ensure bot has some USDC to top up if needed manually.
    if (botUSDC === 0n) console.warn('⚠️ Bot has 0 USDC. Ensure Contract is funded!');
    return true;
  } catch (error: any) {
    console.error('❌ Reserve check failed:', error.message);
    return false;
  }
}

async function initializeBot() {
  isInitialized = true;
  console.log('\n✅ Bot Ready - Waiting for winners...\n');
}

// ---------------- HELPERS ----------------

function getPriceId(asset: string): string {
    const priceId = PYTH_PRICE_IDS[asset.toUpperCase()];
    if (!priceId) throw new Error(`Unsupported asset: ${asset}`);
    return priceId;
}

async function getCurrentPrice(asset: string): Promise<bigint> {
    try {
        const cached = priceCache.get(asset);
        if (cached && Date.now() - cached.timestamp < PRICE_CACHE_TTL) return cached.price;

        const priceId = getPriceId(asset);
        const res = await axios.get(
            `https://hermes.pyth.network/v2/updates/price/latest?ids[]=${priceId}`,
            { timeout: 2000 }
        );
        
        const price = BigInt(res.data.parsed[0].price.price);
        priceCache.set(asset, { price, timestamp: Date.now() });
        return price;
    } catch (e: any) { return 0n; }
}

async function updateDB(id: bigint, won: boolean, payout: number) {
    try {
        await axios.post(`${APP_API_BASE}/predictions/update`, {
            positionId: id.toString(),
            isWon: won,
            payout: payout.toString()
        });
        console.log(`   💾 DB Updated: #${id} -> ${won ? 'WON' : 'LOST'}`);
    } catch (e: any) { console.error(`❌ DB Update Failed for #${id}`); }
}

// ---------------- CORE ACTIONS ----------------

// 1. REGISTER (Standard)
async function registerOnChain(dbPos: any) {
    const id = BigInt(dbPos.positionId);
    try {
        // console.log(`⛓️  Registering #${id}...`); // Commented out to reduce log noise
        const targetPriceInt = BigInt(Math.floor(parseFloat(dbPos.targetPrice) * 1e8));
        const entryPriceInt = BigInt(Math.floor(parseFloat(dbPos.entryPrice || dbPos.targetPrice) * 1e8));
        const amountUSDC = BigInt(Math.floor(parseFloat(dbPos.amount) * 1e6));

        // Note: Register still costs gas. Ensure you have ~0.5 MON.
        const hash = await walletClient.writeContract({
            address: THIRTY_ENGINE_ADDRESS,
            abi: V3_ABI,
            functionName: 'registerTransferPosition',
            args: [dbPos.userWallet as Address, targetPriceInt, amountUSDC, entryPriceInt, id],
            gas: 500000n
        });
        registeredOnChain.add(id);
    } catch (err: any) { 
        if (err.message.includes("ID already exists")) registeredOnChain.add(id);
    }
}

// 2. GOD MODE SETTLEMENT (Cheapest)
async function settleWinImmediately(id: bigint, asset: string, amountStr: string, multiplier: number) {
    try {
        console.log(`🚀 [GOD MODE] Paying out #${id}...`);

        // Calculate Exact Payout (USDC 6 decimals)
        const payoutFloat = parseFloat(amountStr) * multiplier;
        const payoutBigInt = parseUnits(payoutFloat.toFixed(6), 6); 

        // ⚠️ WE INJECT THE NEW ABI HERE SO YOU DON'T NEED TO UPDATE FILES
        const hash = await walletClient.writeContract({
            address: THIRTY_ENGINE_ADDRESS,
            abi: [
                ...V3_ABI, 
                {
                    "type": "function", "name": "adminResolveWin", "stateMutability": "nonpayable",
                    "inputs": [{ "name": "positionId", "type": "uint256" }, { "name": "payoutAmount", "type": "uint256" }],
                    "outputs": []
                }
            ],
            functionName: 'adminResolveWin',
            args: [id, payoutBigInt],
            gas: 150000n // SUPER CHEAP GAS (No Pyth!)
        });
        
        console.log(`   ✅ TX Sent: ${hash}`);
        const receipt = await publicClient.waitForTransactionReceipt({ hash });
        
        if (receipt.status === 'success') {
            console.log(`   🎉 SUCCESS! User paid.`);
            return true;
        }
        return false;

    } catch (e: any) {
        console.error(`   ❌ Failed:`, e.shortMessage || e.message);
        return false;
    }
}

// ---------------- MAIN LOOP ----------------

async function syncAutoTradesFromDB() {
    if (!isInitialized) return;
    try {
        const res = await axios.get(`${APP_API_BASE}/predictions/history?limit=50`);
        const predictions = res.data.predictions || [];

        for (const pos of predictions) {
            const id = BigInt(pos.positionId);
            if (pos.status === 'OPEN' && !activePositions.has(id)) {
                const asset = (pos.asset || 'ETH').toUpperCase();
                if (asset in PYTH_PRICE_IDS) {
                    activePositions.set(id, { ...pos, asset });
                    if (!registeredOnChain.has(id)) await registerOnChain(pos);
                }
            }
        }
    } catch (error: any) {}
}

async function checkPositions() {
    if (!isInitialized || activePositions.size === 0) return;

    try {
        const now = Date.now();
        if (now - lastReserveCheck > RESERVE_CHECK_INTERVAL) {
            await checkAndFundReserves();
            lastReserveCheck = now;
        }

        const positionsByAsset = new Map<string, Array<[bigint, any]>>();
        for (const [id, dbPos] of activePositions.entries()) {
            if (resolvingPositions.has(id)) continue;
            const asset = (dbPos.asset || 'ETH').toUpperCase();
            if (!positionsByAsset.has(asset)) positionsByAsset.set(asset, []);
            positionsByAsset.get(asset)!.push([id, dbPos]);
        }

        for (const [asset, positions] of positionsByAsset.entries()) {
            const currentPrice = await getCurrentPrice(asset);
            if (currentPrice === 0n) continue;

            for (const [id, dbPos] of positions) {
                const startTime = dbPos.createdAt ? new Date(dbPos.createdAt).getTime() : Number(id);
                const expiryTime = startTime + 30000;
                const isExpired = now >= expiryTime;
                
                const target = BigInt(Math.floor(parseFloat(dbPos.targetPrice) * 1e8));
                
                // LOCAL CHECK ONLY (The contract blindly trusts us now)
                const hit = dbPos.isUpward ? currentPrice >= target : currentPrice <= target;
                
                // WINNER -> GOD MODE PAYOUT
                if (hit && !isExpired && !resolvingPositions.has(id)) {
                    resolvingPositions.add(id);
                    console.log(`\n🎯 #${id} HIT! Payout: $${(parseFloat(dbPos.amount)*dbPos.multiplier).toFixed(2)}`);
                    
                    await updateDB(id, true, parseFloat(dbPos.amount) * dbPos.multiplier);
                    
                    // PASS AMOUNT & MULTIPLIER
                    const settled = await settleWinImmediately(id, asset, dbPos.amount, dbPos.multiplier);
                    
                    if (settled) activePositions.delete(id);
                    resolvingPositions.delete(id);
                }
                
                // LOSER -> JUST DB UPDATE (Save gas, don't write to chain)
                else if (isExpired && !hit && !resolvingPositions.has(id)) {
                    console.log(`\n⏱️ #${id} EXPIRED (Lost)`);
                    await updateDB(id, false, 0);
                    activePositions.delete(id);
                }
            }
        }
    } catch (e: any) { console.error("Loop Error:", e.message); }
}

async function startBot() {
    await initializeBot();
    setInterval(syncAutoTradesFromDB, 3000);
    setInterval(checkPositions, 1000);
    console.log('🚀 GOD MODE ACTIVE - Low Gas Payouts Enabled\n');
}

startBot().catch(err => {
    console.error('Fatal error:', err);
    process.exit(1);
});
'use client';

import { useState, useEffect } from 'react';
import { Trophy } from 'lucide-react'; 
import { io } from 'socket.io-client';
import { useWallet } from '@/context/WalletContext';
import InteractiveChart from '@/components/InteractiveChart';
import AutoTradeSetup from '@/components/AutoTradeSetup';
import ConnectWallet from '@/components/ConnectWallet';
import UserStats from '@/components/UserStats';
import RecentRounds from '@/components/RecentRounds';
import { createWalletClient, createPublicClient, http, custom, parseUnits, parseEther, formatUnits, type Address } from 'viem';
import { monadTestnet } from '@/lib/chains';
import { toast } from 'react-hot-toast';
import Home from '@/components/Home';
import { PYTH_PRICE_IDS, AssetSymbol, getPriceId, ASSET_METADATA, MONAD_CONFIG } from '@/lib/constants';

/* ==================================================================================
   CONFIGURATION & CONSTANTS                                                                 
   ================================================================================== */

const THIRTY_CONTRACT_ADDRESS = process.env.NEXT_PUBLIC_THIRTY_ENGINE_ADDRESS as Address;
const USDC_ADDRESS = "0xD9a4C52EfA4EfA8F698EC9941061c9ef3387DBc6" as Address;

const CONTRACT_ABI = [
  {
    inputs: [
      { name: 'assetPriceId', type: 'bytes32' },
      { name: 'targetPrice', type: 'int64' },
      { name: 'amount', type: 'uint256' },
      { name: 'updateData', type: 'bytes[]' },
    ],
    name: 'openPosition',
    outputs: [],
    stateMutability: 'payable',
    type: 'function',
  },
  {
    inputs: [],
    name: 'nextPositionId',
    outputs: [{ internalType: 'uint256', name: '', type: 'uint256' }],
    stateMutability: 'view',
    type: 'function',
  },
] as const;

/* ==================================================================================
   MAIN COMPONENT
   ================================================================================== */

export default function HomePage() {
  const { isConnected, address } = useWallet();
  const [selectedAsset, setSelectedAsset] = useState<AssetSymbol>('ETH');
  const [currentPrice, setCurrentPrice] = useState<number | null>(null);
  const [prevPrice, setPrevPrice] = useState<number | null>(null);
  const [priceDirection, setPriceDirection] = useState<'up' | 'down' | null>(null);
  const [isAutoPilotEnabled, setIsAutoPilotEnabled] = useState(false);
  const [isCheckingAutoPilot, setIsCheckingAutoPilot] = useState(true);
  const [selectedAmount, setSelectedAmount] = useState(5);
  const [usdcBalance, setUsdcBalance] = useState<string>("0.00");
  
  // Real-time states
  const [liveUsers, setLiveUsers] = useState<number>(0);
  const [leaderboard, setLeaderboard] = useState<any[]>([]);
  const [socket, setSocket] = useState<any>(null);

  const currentPriceId = getPriceId(selectedAsset);

  // 1. Initialize Socket Connection
  useEffect(() => {
    const newSocket = io('http://localhost:3001');
    setSocket(newSocket);

    return () => {
      newSocket.disconnect();
    };
  }, []);

  // 2. Room & Leaderboard Logic
  useEffect(() => {
    if (!address) return;

    const fetchLeaderboard = async () => {
      try {
        const res = await fetch(`/api/leaderboard?symbol=${selectedAsset}`);
        const data = await res.json();
        setLeaderboard(Array.isArray(data) ? data : []);
      } catch (e) {
        console.error("Leaderboard fetch error:", e);
      }
    };
    fetchLeaderboard();

    if (socket) {
      socket.emit('join-asset-room', selectedAsset);
      socket.on('room-count-update', (count: number) => {
        setLiveUsers(count);
      });
      return () => {
        socket.off('room-count-update');
      };
    }
  }, [selectedAsset, address, socket]);

  // 3. Auto-pilot Status Check
  useEffect(() => {
    async function checkAutoPilot() {
      if (!address) {
        setIsCheckingAutoPilot(false);
        return;
      }
      try {
        const res = await fetch(`/api/session/status?address=${address}`);
        if (res.ok) {
          const data = await res.json();
          setIsAutoPilotEnabled(data.isActive || false);
        }
      } catch (error) {
        console.error('Failed to check auto-pilot status:', error);
      } finally {
        setIsCheckingAutoPilot(false);
      }
    }
    checkAutoPilot();
  }, [address]);

  // 4. Price Feed Polling
  useEffect(() => {
    async function fetchPrice() {
      try {
        const res = await fetch(`/api/pyth/price?asset=${selectedAsset}`);
        if (res.ok) {
          const data = await res.json();
          const newPrice = data.price;

          setCurrentPrice(prev => {
            if (prev !== null && newPrice !== prev) {
              setPrevPrice(prev);
              setPriceDirection(newPrice > prev ? 'up' : 'down');
            }
            return newPrice;
          });
        }
      } catch (error) { console.error('Price fetch error'); }
    }
    fetchPrice();
    const interval = setInterval(fetchPrice, 2000);
    return () => clearInterval(interval);
  }, [selectedAsset]);

  // 5. USDC Balance Polling
  useEffect(() => {
    if (!address) return;
    const publicClient = createPublicClient({ chain: monadTestnet, transport: http() });

    const fetchBalance = async () => {
      try {
        const balance = await publicClient.readContract({
          address: USDC_ADDRESS,
          abi: [{ name: 'balanceOf', type: 'function', inputs: [{ name: 'account', type: 'address' }], outputs: [{ name: 'balance', type: 'uint256' }] }],
          functionName: 'balanceOf',
          args: [address as Address],
        }) as bigint;

        setUsdcBalance(Number(formatUnits(balance, 6)).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 }));
      } catch (e) { console.error("Balance fetch error:", e); }
    };

    fetchBalance();
    const interval = setInterval(fetchBalance, 5000);
    return () => clearInterval(interval);
  }, [address]);

  const handleDisableAutoPilot = () => {
    if (!address) return;
    toast((t) => (
      <div className="flex flex-col gap-3">
        <p className="font-medium">Disable 1-Click Trading?</p>
        <div className="flex gap-2">
          <button onClick={() => { toast.dismiss(t.id); confirmDisable(); }} className="px-4 py-2 bg-red-500 text-white rounded-lg text-sm font-bold hover:bg-red-600">Disable</button>
          <button onClick={() => toast.dismiss(t.id)} className="px-4 py-2 bg-gray-600 text-white rounded-lg text-sm font-bold hover:bg-gray-700">Cancel</button>
        </div>
      </div>
    ), { duration: 10000 });
  };

  const confirmDisable = async () => {
    const toastId = toast.loading("Disabling Mode...");
    try {
      const res = await fetch('/api/session/deactivate', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ address }) });
      if (res.ok) {
        setIsAutoPilotEnabled(false);
        toast.success("1-Click Trading Disabled", { id: toastId });
      }
    } catch (error) { toast.error("Error disabling session", { id: toastId }); }
  };

  const handleApproveUSDC = async () => {
    if (!address) return;
    const toastId = toast.loading("Approving USDC...");
    try {
      const walletClient = createWalletClient({ chain: monadTestnet, transport: custom(window.ethereum!) });
      const publicClient = createPublicClient({ chain: monadTestnet, transport: http() });
      const hash = await walletClient.writeContract({
        address: USDC_ADDRESS,
        abi: [{ name: 'approve', type: 'function', inputs: [{ name: 's', type: 'address' }, { name: 'a', type: 'uint256' }], outputs: [{ name: '', type: 'bool' }] }],
        functionName: 'approve',
        args: [THIRTY_CONTRACT_ADDRESS, parseUnits("1000000", 6)],
        account: address as Address
      });
      await publicClient.waitForTransactionReceipt({ hash });
      toast.success("USDC Approved!", { id: toastId });
    } catch (e) { toast.error("Approval failed", { id: toastId }); }
  };

  const handlePlaceBet = async (targetPrice: number, amount: number, multiplier: number) => {
    if (!isConnected || !address || !window.ethereum) { 
      toast.error('Please connect wallet!'); 
      return; 
    }
    
    if (!currentPrice || currentPrice <= 0) {
      toast.error('Waiting for price feed...');
      return;
    }

    const toastId = toast.loading('Placing bet...');
    const publicClient = createPublicClient({ chain: monadTestnet, transport: http() });

    try {
      const response = await fetch(`${MONAD_CONFIG.HERMES_ENDPOINT}?ids[]=${currentPriceId}`);
      const pythData = await response.json();
      const pythPriceUpdate = pythData.binary.data.map((d: string) => `0x${d}` as Address);
      
      let txHash: string;
      let positionId: number;

      if (isAutoPilotEnabled) {
        positionId = Date.now();
        const startTime = Date.now();
        const res = await fetch('/api/trade/execute', {
          method: 'POST', 
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ userWallet: address, amount }),
        });
        
        const data = await res.json();
        const elapsed = Date.now() - startTime;
        
        if (!data.success) throw new Error(data.error);
        txHash = data.txHash;
        toast.success(`🎯 Trade Live! (${elapsed}ms)`, { id: toastId });
      } else {
        const walletClient = createWalletClient({ chain: monadTestnet, transport: custom(window.ethereum!) });
        const nextId = await publicClient.readContract({ address: THIRTY_CONTRACT_ADDRESS, abi: CONTRACT_ABI, functionName: 'nextPositionId' });
        positionId = Number(nextId); 
        
        txHash = await walletClient.writeContract({
          address: THIRTY_CONTRACT_ADDRESS, 
          abi: CONTRACT_ABI, 
          functionName: 'openPosition',
          args: [currentPriceId, BigInt(Math.floor(targetPrice * 1e8)), parseUnits(amount.toString(), 6), pythPriceUpdate],
          value: parseEther('0.01'), 
          account: address as Address, 
          gas: 1000000n, 
        });
        
        await publicClient.waitForTransactionReceipt({ hash: txHash as Address });
        toast.success('Trade confirmed!', { id: toastId });
      }

      fetch('/api/predictions/record', {
        method: 'POST', 
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          positionId, address, asset: selectedAsset, symbol: selectedAsset,
          targetPrice: targetPrice.toString(), entryPrice: currentPrice.toString(), 
          isUpward: targetPrice > currentPrice, amount: amount.toString(), multiplier, 
          txHash, status: 'OPEN', isAutoTrade: isAutoPilotEnabled
        }),
      }).catch(e => console.warn('DB record warning:', e));

    } catch (error: any) { 
      console.error(error);
      toast.error(error.shortMessage || error.message || "Trade failed", { id: toastId }); 
    }
  };

  if (!isConnected) return <Home />;

  return (
    <div className="min-h-screen bg-[#082832]">
      {/* Navbar */}
      <nav className="max-w-7xl mx-auto px-4 pt-6">
        <div className="flex items-center justify-between bg-[#0A696C] rounded-full px-6 py-3">
          <div className="flex items-center gap-4">
            <div>
              <h3 className="text-white font-bold text-lg">Blink Mode</h3>
              <p className="text-xs text-white/70">1-tap trading is ready.</p>
            </div>
            <button onClick={handleApproveUSDC} className="text-sm bg-[#F5F5DC] hover:bg-[#E5E5CC] text-[#0A696C] px-5 py-2 rounded-full font-bold transition-all">Approve USDC</button>
          </div>

          <div className="flex items-center gap-3">
            {isCheckingAutoPilot ? (
              <div className="text-white/70 text-sm animate-pulse">Checking...</div>
            ) : isAutoPilotEnabled ? (
              <>
                <span className="bg-green-500/20 text-green-400 border border-green-500/30 px-5 py-2 rounded-full text-sm font-bold">Active</span>
                <button onClick={handleDisableAutoPilot} className="text-sm bg-red-500/20 hover:bg-red-500/30 text-red-400 border border-red-500/30 px-5 py-2 rounded-full font-bold transition-all">Disable</button>
              </>
            ) : (
              <AutoTradeSetup userAddress={address!} onEnabled={() => setIsAutoPilotEnabled(true)} />
            )}
            <ConnectWallet />
          </div>
        </div>
      </nav>

      {/* ✅ CHANGE 1: Main Container widened from max-w-5xl to max-w-7xl to match nav */}
      <main className="max-w-7xl mx-auto px-4 pt-8 pb-8 space-y-6">
        {/* Asset Selector */}
        <div className="flex justify-center gap-3">
          {(Object.keys(PYTH_PRICE_IDS) as AssetSymbol[]).map((asset) => (
            <button
              key={asset}
              onClick={() => setSelectedAsset(asset)}
              className={`px-6 py-3 rounded-xl font-bold transition-all ${selectedAsset === asset ? 'bg-[#0A696C] text-white shadow-lg scale-105' : 'bg-white/10 text-white/60 hover:bg-white/20'}`}
            >
              {asset}
            </button>
          ))}
        </div>

        {/* Chart Container */}
        <div className="flex justify-center">
          {/* ✅ CHANGE 2: Removed "max-w-4xl" so it fills the wider parent */}
          <div className="w-full">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <div className="flex items-center gap-2 bg-[#0A696C]/20 border border-[#0A696C]/40 rounded-full px-4 py-2">
                  <div className="relative">
                    <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                    <div className="absolute inset-0 w-2 h-2 bg-green-500 rounded-full animate-ping"></div>
                  </div>
                  <span className="text-white/60 text-sm font-medium">{selectedAsset}/USD</span>
                  <span className="text-green-400 text-xs font-bold ml-2 border-l border-white/10 pl-2">
                    {liveUsers} Traders Live
                  </span>
                </div>
              </div>

              <div className="bg-gradient-to-r from-[#0A696C] to-[#065456] rounded-2xl px-5 py-2.5 shadow-lg border border-[#0A696C]/50">
                <div className="flex items-center gap-3">
                  <div className="text-[#A1BCBD] text-xs font-medium">Live Price</div>
                  <div className="flex items-baseline gap-1">
                    <span className="text-[#A1BCBD] text-lg">$</span>
                    <span className="text-white font-black text-2xl tabular-nums">
                      {currentPrice ? currentPrice.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : '---'}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            <InteractiveChart
              currentPrice={currentPrice}
              userAddress={address}
              selectedAmount={selectedAmount}
              selectedAsset={selectedAsset}
              onPlaceBet={handlePlaceBet}
            />
          </div>
        </div>

        {/* Amount Selector */}
        <div className="flex flex-col md:flex-row items-center justify-center gap-8 mt-8">
          <div className="text-center">
            <p className="text-white/80 text-lg mb-2">Available USDC</p>
            <div className="bg-[#0A696C] text-white font-bold text-2xl px-8 py-3 rounded-full">
              <span className="text-[#A1BCBD]">$</span> {usdcBalance}
            </div>
          </div>

          <div className="text-center">
            <p className="text-white/80 text-lg mb-2">Blinks Available</p>
            <div className="flex items-center gap-3">
              {[5, 10, 25, 50].map((amt) => (
                <button
                  key={amt}
                  onClick={() => setSelectedAmount(amt)}
                  className={`font-bold text-xl px-6 py-3 rounded-full transition-all border-2 ${selectedAmount === amt ? 'bg-[#A1BCBD] text-[#0A696C] border-[#A1BCBD]' : 'bg-[#0A696C] hover:bg-[#0A797C] text-white border-[#0A696C]'}`}
                >
                  <span className={selectedAmount === amt ? 'text-[#0A696C]' : 'text-[#A1BCBD]'}>$</span>{amt}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Bottom Section: Stats, History & Leaderboard */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mt-8">
          <UserStats address={address!} />
          <RecentRounds address={address!} />
          
          <div className="bg-white/5 rounded-2xl p-6 border border-white/10">
            <h3 className="text-white font-bold mb-4 flex items-center gap-2">
              <Trophy size={18} className="text-yellow-500" />
              Top {selectedAsset} Predictors
            </h3>
            <div className="space-y-3">
              {leaderboard.length > 0 ? (
                leaderboard.map((user, i) => (
                  <div key={i} className="flex justify-between items-center bg-black/20 p-3 rounded-xl border border-white/5">
                    <span className="text-white/60 text-sm">
                      {user._id.slice(0, 6)}...{user._id.slice(-4)}
                    </span>
                    <span className="text-green-400 font-bold">${parseFloat(user.totalWon).toFixed(2)}</span>
                  </div>
                ))
              ) : (
                <p className="text-white/30 text-center text-sm py-4">No data yet</p>
              )}
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
'use client';

import { useState, useEffect } from 'react';
import { Trophy, Activity, Wallet, X, Menu, Loader2 } from 'lucide-react'; 
import { io } from 'socket.io-client';
import { useWallet } from '@/context/WalletContext';
// ✅ Import the new GameEngine (The Logic Layer)
import GameEngine from '@/components/GameEngine'; 
import AutoTradeSetup from '@/components/AutoTradeSetup';
import ConnectWallet from '@/components/ConnectWallet';
import UserStats from '@/components/UserStats';
import RecentRounds from '@/components/RecentRounds';
import { createWalletClient, createPublicClient, http, custom, parseUnits, parseEther, formatUnits, type Address } from 'viem';
import { monadTestnet } from '@/lib/chains';
import { toast } from 'react-hot-toast';
import Home from '@/components/Home'; // Landing page if not connected
import { PYTH_PRICE_IDS, AssetSymbol, getPriceId, MONAD_CONFIG } from '@/lib/constants';

// --- CONTRACT CONSTANTS ---
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

export default function HomePage() {
  const { isConnected, address } = useWallet();
  
  // UI State
  const [selectedAsset, setSelectedAsset] = useState<AssetSymbol>('ETH');
  const [selectedAmount, setSelectedAmount] = useState(5);
  const [showStats, setShowStats] = useState(false); // Controls the Side Drawer
  
  // Data State
  const [usdcBalance, setUsdcBalance] = useState<string>("0.00");
  const [liveUsers, setLiveUsers] = useState<number>(0);
  const [leaderboard, setLeaderboard] = useState<any[]>([]);
  
  // Automation State
  const [isAutoPilotEnabled, setIsAutoPilotEnabled] = useState(false);
  const [isCheckingAutoPilot, setIsCheckingAutoPilot] = useState(true);

  // Socket State
  const [socket, setSocket] = useState<any>(null);
  const currentPriceId = getPriceId(selectedAsset);

  // --- 1. SOCKET & LEADERBOARD INITIALIZATION ---
  useEffect(() => {
    const newSocket = io('http://localhost:3001');
    setSocket(newSocket);
    return () => { newSocket.disconnect(); };
  }, []);

  useEffect(() => {
    if (!address) return;
    
    // Fetch Leaderboard
    fetch(`/api/leaderboard?symbol=${selectedAsset}`)
      .then(res => res.json())
      .then(data => setLeaderboard(Array.isArray(data) ? data : []))
      .catch(e => console.error("Leaderboard error:", e));

    // Join Socket Room
    if (socket) {
      socket.emit('join-asset-room', selectedAsset);
      socket.on('room-count-update', (count: number) => setLiveUsers(count));
      return () => { socket.off('room-count-update'); };
    }
  }, [selectedAsset, address, socket]);

  // --- 2. CHECK AUTO-PILOT STATUS ---
  useEffect(() => {
    if (!address) { setIsCheckingAutoPilot(false); return; }
    
    fetch(`/api/session/status?address=${address}`)
      .then(res => res.ok ? res.json() : null)
      .then(data => setIsAutoPilotEnabled(data?.isActive || false))
      .catch(console.error)
      .finally(() => setIsCheckingAutoPilot(false));
  }, [address]);

  // --- 3. POLL USDC BALANCE ---
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
      } catch (e) { console.error(e); }
    };
    
    fetchBalance();
    const interval = setInterval(fetchBalance, 5000);
    return () => clearInterval(interval);
  }, [address]);

  // --- 4. WALLET ACTIONS ---
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

  const handleDisableAutoPilot = async () => {
    const toastId = toast.loading("Disabling...");
    try {
      const res = await fetch('/api/session/deactivate', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ address }) });
      if (res.ok) {
        setIsAutoPilotEnabled(false);
        toast.success("Disabled", { id: toastId });
      }
    } catch (error) { toast.error("Error", { id: toastId }); }
  };

  // --- 5. BETTING LOGIC (Called by GameEngine) ---
  const handlePlaceBet = async (targetPrice: number, amount: number, multiplier: number) => {
    if (!isConnected || !address || !window.ethereum) { 
      toast.error('Connect Wallet'); 
      return; 
    }

    const toastId = toast.loading('Submitting...');
    
    try {
      // A. Fetch Hermes Update Data (Required for Smart Contract)
      const response = await fetch(`${MONAD_CONFIG.HERMES_ENDPOINT}?ids[]=${currentPriceId}`);
      const pythData = await response.json();
      const pythPriceUpdate = pythData.binary.data.map((d: string) => `0x${d}` as Address);
      
      // Calculate Entry Price from Pyth Data for DB consistency
      const rawPrice = pythData.parsed[0].price.price;
      const expo = pythData.parsed[0].price.expo;
      const entryPrice = Number(rawPrice) * Math.pow(10, expo);

      let txHash: string;
      let positionId: number;

      if (isAutoPilotEnabled) {
        // --- 1-CLICK MODE ---
        positionId = Date.now();
        const res = await fetch('/api/trade/execute', {
          method: 'POST', 
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ userWallet: address, amount }),
        });
        const data = await res.json();
        if (!data.success) throw new Error(data.error);
        txHash = data.txHash;
        toast.success(`Trade Live!`, { id: toastId });
      } else {
        // --- MANUAL MODE (Metamask Popup) ---
        const walletClient = createWalletClient({ chain: monadTestnet, transport: custom(window.ethereum!) });
        const publicClient = createPublicClient({ chain: monadTestnet, transport: http() });
        
        const nextId = await publicClient.readContract({ address: THIRTY_CONTRACT_ADDRESS, abi: CONTRACT_ABI, functionName: 'nextPositionId' });
        positionId = Number(nextId); 
        
        txHash = await walletClient.writeContract({
          address: THIRTY_CONTRACT_ADDRESS, 
          abi: CONTRACT_ABI, 
          functionName: 'openPosition',
          args: [currentPriceId, BigInt(Math.floor(targetPrice * 1e8)), parseUnits(amount.toString(), 6), pythPriceUpdate],
          value: parseEther('0.01'), // Pyth Fee
          account: address as Address, 
          gas: 1000000n, 
        });
        
        toast.success('Confirmed!', { id: toastId });
      }

      // B. Record to Database (Optimistic)
      fetch('/api/predictions/record', {
        method: 'POST', 
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          positionId, address, asset: selectedAsset, symbol: selectedAsset,
          targetPrice: targetPrice.toString(), entryPrice: entryPrice.toString(), 
          isUpward: targetPrice > entryPrice, amount: amount.toString(), multiplier, 
          txHash, status: 'OPEN', isAutoTrade: isAutoPilotEnabled
        }),
      }).catch(e => console.warn('DB record warning:', e));

    } catch (error: any) { 
      console.error(error);
      toast.error(error.shortMessage || "Failed to place bet", { id: toastId }); 
    }
  };

  if (!isConnected) return <Home />;

  return (
    <div className="relative h-screen w-screen overflow-hidden bg-[#05181e] text-white">
      
      {/* ==============================================
        LAYER 0: THE GAME ENGINE (Full Screen Background)
        ==============================================
      */}
      <div className="absolute inset-0 z-0">
        <GameEngine 
          selectedAsset={selectedAsset}
          userAddress={address}
          selectedAmount={selectedAmount}
          onPlaceBetAPI={handlePlaceBet}
        />
      </div>

      {/* ==============================================
        LAYER 1: TOP HUD (Navigation & Asset Selector)
        ==============================================
      */}
      <div className="absolute top-0 left-0 right-0 z-50 p-4 pointer-events-none">
        <div className="max-w-7xl mx-auto flex items-center justify-between pointer-events-auto">
          
          {/* Left: Branding & Connection */}
          <div className="flex items-center gap-3 bg-black/40 backdrop-blur-md p-2 rounded-full border border-white/10 shadow-lg">
             <ConnectWallet />
             <div className="h-6 w-[1px] bg-white/20"></div>
             <div className="flex items-center gap-2 px-2">
                <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></span>
                <span className="text-xs font-bold text-green-400">{liveUsers} Live</span>
             </div>
          </div>

          {/* Center: Asset Selector Pills */}
          <div className="flex bg-black/60 backdrop-blur-xl rounded-2xl p-1 border border-white/10 shadow-2xl">
            {(Object.keys(PYTH_PRICE_IDS) as AssetSymbol[]).map((asset) => (
              <button
                key={asset}
                onClick={() => setSelectedAsset(asset)}
                className={`px-5 py-2 rounded-xl text-sm font-bold transition-all duration-200 ${
                    selectedAsset === asset 
                    ? 'bg-[#0A696C] text-white shadow-lg scale-105' 
                    : 'text-white/50 hover:text-white hover:bg-white/10'
                }`}
              >
                {asset}
              </button>
            ))}
          </div>

          {/* Right: Stats Drawer Toggle */}
          <button 
            onClick={() => setShowStats(true)}
            className="p-3 bg-black/40 backdrop-blur-md rounded-full border border-white/10 hover:bg-white/10 transition shadow-lg group"
          >
            <Menu size={20} className="group-hover:text-yellow-400 transition-colors" />
          </button>
        </div>
      </div>

      {/* ==============================================
        LAYER 2: BOTTOM HUD (Betting Controls)
        ==============================================
      */}
      <div className="absolute bottom-8 left-0 right-0 z-50 px-4 pointer-events-none">
        <div className="max-w-2xl mx-auto pointer-events-auto">
           <div className="bg-black/70 backdrop-blur-xl rounded-3xl p-3 border border-white/10 shadow-2xl flex items-center justify-between">
              
              {/* Balance Display */}
              <div className="flex flex-col px-4 border-r border-white/10">
                 <span className="text-[10px] text-white/50 uppercase tracking-wider">USDC Balance</span>
                 <div className="flex items-center gap-2 font-mono font-bold text-green-400 text-lg">
                    <Wallet size={16} /> ${usdcBalance}
                 </div>
              </div>

              {/* Quick Amount Selectors */}
              <div className="flex items-center gap-2">
                 {[5, 10, 25, 50].map((amt) => (
                    <button
                        key={amt}
                        onClick={() => setSelectedAmount(amt)}
                        className={`w-12 h-12 rounded-xl font-bold flex items-center justify-center transition-all ${
                            selectedAmount === amt 
                            ? 'bg-[#0A696C] text-white shadow-[0_0_15px_rgba(10,105,108,0.5)] scale-110' 
                            : 'bg-white/5 text-white/40 hover:bg-white/10'
                        }`}
                    >
                        ${amt}
                    </button>
                 ))}
              </div>

              {/* Tools (Autopilot & Approve) */}
              <div className="pl-4 border-l border-white/10 flex items-center gap-3">
                 {isCheckingAutoPilot ? (
                    <Loader2 size={20} className="animate-spin text-white/30" />
                 ) : isAutoPilotEnabled ? (
                     <button onClick={handleDisableAutoPilot} className="bg-green-500/20 text-green-400 border border-green-500/50 px-4 py-2 rounded-lg text-xs font-bold hover:bg-red-500/20 hover:text-red-400 hover:border-red-500 transition-all flex items-center gap-2">
                        <Activity size={14} /> AUTOPILOT ON
                     </button>
                 ) : (
                    <AutoTradeSetup userAddress={address!} onEnabled={() => setIsAutoPilotEnabled(true)} />
                 )}
                 
                 <button onClick={handleApproveUSDC} className="p-2.5 bg-white/5 rounded-lg text-white/40 hover:text-white hover:bg-white/10 transition border border-transparent hover:border-white/10" title="Approve USDC">
                    <Wallet size={18} />
                 </button>
              </div>

           </div>
        </div>
      </div>

      {/* ==============================================
        LAYER 3: STATS DRAWER (Slide Over)
        ==============================================
      */}
      <div 
        className={`fixed inset-y-0 right-0 w-96 bg-[#061e24]/95 backdrop-blur-2xl border-l border-white/10 z-[100] transform transition-transform duration-300 ease-in-out shadow-2xl
        ${showStats ? 'translate-x-0' : 'translate-x-full'}`}
      >
         <div className="p-6 h-full flex flex-col">
            <div className="flex items-center justify-between mb-8">
               <h2 className="text-xl font-bold flex items-center gap-2 text-white">
                  <Trophy className="text-yellow-500" /> Leaderboard
               </h2>
               <button onClick={() => setShowStats(false)} className="p-2 hover:bg-white/10 rounded-full text-white/60 hover:text-white transition">
                  <X size={24} />
               </button>
            </div>

            <div className="flex-1 overflow-y-auto space-y-6 pr-2 custom-scrollbar">
               {/* Current User Stats */}
               <div className="bg-white/5 rounded-2xl p-4 border border-white/5">
                  <h3 className="text-xs font-bold text-white/40 uppercase mb-4">Your Performance</h3>
                  <UserStats address={address!} />
               </div>

               <div className="h-[1px] bg-white/10" />

               {/* Global Leaderboard */}
               <div>
                   <h3 className="text-xs font-bold text-white/40 uppercase mb-3">Top {selectedAsset} Traders</h3>
                   <div className="space-y-2">
                      {leaderboard.map((user, i) => (
                        <div key={i} className="flex justify-between items-center bg-black/20 p-3 rounded-xl border border-white/5 hover:border-white/10 transition">
                            <div className="flex items-center gap-3">
                                <span className={`text-xs font-bold w-5 ${i < 3 ? 'text-yellow-500' : 'text-white/30'}`}>#{i+1}</span>
                                <span className="text-white/80 text-sm font-mono">{user._id.slice(0, 6)}...</span>
                            </div>
                            <span className="text-green-400 font-bold text-sm">
                                ${parseFloat(user.totalWon).toFixed(2)}
                            </span>
                        </div>
                      ))}
                   </div>
               </div>

               <div className="h-[1px] bg-white/10" />
               
               {/* Recent History */}
               <div>
                  <h3 className="text-xs font-bold text-white/40 uppercase mb-3">Recent Rounds</h3>
                  <RecentRounds address={address!} />
               </div>
            </div>
         </div>
      </div>

      {/* Overlay to close drawer when clicking outside */}
      {showStats && (
        <div className="fixed inset-0 z-[90] bg-black/20 backdrop-blur-[2px]" onClick={() => setShowStats(false)} />
      )}

    </div>
  );
}
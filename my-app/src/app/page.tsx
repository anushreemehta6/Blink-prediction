'use client';

import { useState, useEffect } from 'react';
import { Trophy, Activity, Wallet, X, ChevronRight, Zap, Target, Crown, Star, BarChart3 } from 'lucide-react';
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
  const [selectedAsset, setSelectedAsset] = useState<AssetSymbol>(() => {
    if (typeof window === 'undefined') return 'ETH';
  
    const stored = sessionStorage.getItem('selectedAsset');
    return (stored as AssetSymbol) || 'ETH';
  });
  
  const [selectedAmount, setSelectedAmount] = useState(5);
  const [showStats, setShowStats] = useState(false); // Controls the Side Drawer

  // Data State
  const [usdcBalance, setUsdcBalance] = useState<string>("0.00");
  const [liveUsers, setLiveUsers] = useState<number>(0);
  const [leaderboard, setLeaderboard] = useState<any[]>([]);
  const [currentPrice, setCurrentPrice] = useState<number | null>(null);

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

  useEffect(() => {
    if (typeof window === 'undefined') return;
    sessionStorage.setItem('selectedAsset', selectedAsset);
  }, [selectedAsset]);
  

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

  // Asset-specific colors for gamified feel
  const assetColors: Record<AssetSymbol, { primary: string; glow: string; bg: string }> = {
    ETH: { primary: '#627EEA', glow: 'rgba(98, 126, 234, 0.5)', bg: 'rgba(98, 126, 234, 0.1)' },
    BTC: { primary: '#F7931A', glow: 'rgba(247, 147, 26, 0.5)', bg: 'rgba(247, 147, 26, 0.1)' },
    SOL: { primary: '#9945FF', glow: 'rgba(153, 69, 255, 0.5)', bg: 'rgba(153, 69, 255, 0.1)' },
    BNB: { primary: '#F0B90B', glow: 'rgba(240, 185, 11, 0.5)', bg: 'rgba(240, 185, 11, 0.1)' },
  };

  const currentColor = assetColors[selectedAsset];

  return (
    <div className="relative h-screen w-screen overflow-hidden bg-[var(--bg-deep)] text-[var(--text-primary)]">

      {/* Subtle ambient glow (no graph/canvas change) */}
      <div
        className="absolute inset-0 opacity-25 transition-all duration-1000 pointer-events-none"
        style={{
          background: `radial-gradient(ellipse at 50% 0%, ${currentColor.bg} 0%, transparent 50%),
                       radial-gradient(ellipse at 100% 100%, var(--accent-green-dim) 0%, transparent 40%)`
        }}
      />

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
          onPriceUpdate={setCurrentPrice}
        />
      </div>

      {/* ==============================================
        LAYER 1: TOP HUD - TRADING TERMINAL
        ==============================================
      */}
      <div className="absolute top-0 left-0 right-0 z-50 pointer-events-none">
        <div className="p-3 sm:p-4">
          <div className="max-w-7xl mx-auto flex items-center justify-between pointer-events-auto gap-4">

            {/* Left: Live price + Live badge */}
            <div className="flex items-center gap-2 sm:gap-3">
              <div className="flex items-center gap-2 bg-[var(--bg-panel)] border border-[var(--border-subtle)] rounded-lg px-3 py-2 font-[family-name:var(--font-mono)]">
                <span className="relative flex h-2 w-2 flex-shrink-0">
                  <span className="absolute inline-flex h-full w-full rounded-full bg-[var(--accent-green)] animate-ping opacity-60" />
                  <span className="relative inline-flex h-2 w-2 rounded-full bg-[var(--accent-green)]" />
                </span>
                <span className="text-[10px] text-[var(--text-dim)] uppercase tracking-wider">{selectedAsset}</span>
                <span className="text-sm font-bold text-[var(--text-primary)]">
                  {currentPrice != null ? `$${currentPrice.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` : '—'}
                </span>
              </div>
              <div className="flex items-center gap-2 bg-[var(--accent-green-dim)] border border-[var(--accent-green)]/30 px-2.5 py-1.5 rounded-lg font-[family-name:var(--font-mono)]">
                <span className="relative flex h-2 w-2">
                  <span className="absolute inline-flex h-full w-full rounded-full bg-[var(--accent-green)] animate-ping opacity-60" />
                  <span className="relative inline-flex h-2 w-2 rounded-full bg-[var(--accent-green)]" />
                </span>
                <span className="text-[11px] font-bold text-[var(--accent-green)] uppercase tracking-wider">{liveUsers} live</span>
              </div>
            </div>

            {/* Center: Asset Selector */}
            <div className="flex items-center gap-0.5 bg-[var(--bg-panel)]/95 backdrop-blur-xl rounded-lg p-1 border border-[var(--border-subtle)]">
              {(Object.keys(PYTH_PRICE_IDS) as AssetSymbol[]).map((asset) => {
                const isSelected = selectedAsset === asset;
                const colors = assetColors[asset];
                return (
                  <button
                    key={asset}
                    onClick={() => setSelectedAsset(asset)}

                    className={`relative px-4 py-2 rounded-md text-sm font-bold font-[family-name:var(--font-mono)] transition-all duration-200 ${isSelected ? 'text-white' : 'text-[var(--text-dim)] hover:text-[var(--text-muted)]'
                      }`}
                    style={isSelected ? {
                      background: `linear-gradient(135deg, ${colors.primary}28, ${colors.primary}12)`,
                      boxShadow: `0 0 16px ${colors.glow}`,
                      border: `1px solid ${colors.primary}50`
                    } : {}}
                  >
                    <span className="relative z-10">{asset}</span>
                  </button>
                );
              })}
            </div>

            {/* Right: Leaderboard */}
            <div className="flex items-center gap-2">
              <button
                onClick={() => setShowStats(true)}
                className="group relative p-2.5 sm:p-3 bg-[var(--bg-panel)] border border-[var(--border-subtle)] rounded-lg hover:border-[var(--accent-amber)]/50 transition-all duration-200"
              >
                <BarChart3 size={18} className="text-[var(--text-muted)] group-hover:text-[var(--accent-amber)] transition-colors" />
                <span className="absolute -top-0.5 -right-0.5 w-2 h-2 bg-[var(--accent-amber)] rounded-full" />
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* ==============================================
        LAYER 2: BOTTOM HUD - BETTING CONTROLS
        ==============================================
      */}
      <div className="absolute bottom-0 left-0 right-0 z-50 pointer-events-none">
        <div className="h-28 bg-gradient-to-t from-[var(--bg-deep)] via-[var(--bg-deep)]/90 to-transparent" />
        <div className="bg-[var(--bg-deep)] pb-5 px-4 -mt-6">
          <div className="max-w-7xl mx-auto pointer-events-auto">
            <div
              className="relative rounded-xl overflow-visible border border-[var(--border-subtle)]"
              style={{ boxShadow: `0 -8px 32px -8px ${currentColor.glow}` }}
            >
              <div
                className="absolute top-0 left-1/4 right-1/4 h-px opacity-60"
                style={{ background: `linear-gradient(90deg, transparent, ${currentColor.primary}, transparent)` }}
              />
              <div className="bg-[var(--bg-panel)]/95 backdrop-blur-xl rounded-xl p-3 sm:p-4 flex flex-rows flex-wrap items-center justify-center sm:justify-between gap-3 sm:gap-4">
                <div>
                  {/* Balance */}
                  <div className="flex flex-col min-w-[120px]">
                    <span className="text-[10px] font-[family-name:var(--font-mono)] uppercase tracking-wider text-[var(--text-dim)] mb-0.5">Balance</span>
                    <div className="flex items-baseline gap-1.5">
                      <span className="text-xl sm:text-2xl font-bold font-[family-name:var(--font-mono)] text-[var(--text-primary)]">${usdcBalance}</span>
                      <span className="text-[10px] text-[var(--text-dim)]">USDC</span>
                    </div>
                  </div>

                  {/* <div className="w-px h-10 bg-[var(--border-subtle)] hidden sm:block" /> */}
                </div>

                <div>
                  {/* Amount Chips */}
                  <div className="flex items-center gap-1.5">
                    {[5, 10, 25, 50].map((amt) => {
                      const isSelected = selectedAmount === amt;
                      return (
                        <button
                          key={amt}
                          onClick={() => setSelectedAmount(amt)}
                          className={`relative w-12 h-12 sm:w-14 sm:h-14 rounded-lg font-bold text-base font-[family-name:var(--font-mono)] transition-all duration-200 ${isSelected
                              ? 'text-[var(--bg-deep)] scale-105'
                              : 'bg-[var(--bg-elevated)] text-[var(--text-dim)] hover:text-[var(--text-muted)] hover:border-[var(--border-strong)] border border-transparent'
                            }`}
                          style={isSelected ? {
                            background: `linear-gradient(135deg, ${currentColor.primary}, ${currentColor.primary}aa)`,
                            boxShadow: `0 0 20px ${currentColor.glow}`,
                          } : {}}
                        >
                          <span className="relative">${amt}</span>
                        </button>
                      );
                    })}
                  </div>

                  {/* <div className="w-px h-10 bg-[var(--border-subtle)] hidden sm:block" /> */}


                </div>

                {/* Actions + Wallet */}
                <div className="flex items-center gap-2 flex-shrink-0 overflow-visible">
                  {isCheckingAutoPilot ? (
                    <div className="w-10 h-10 rounded-lg bg-[var(--bg-elevated)] flex items-center justify-center">
                      <div className="w-4 h-4 border-2 border-[var(--border-strong)] border-t-[var(--accent-green)] rounded-full animate-spin" />
                    </div>
                  ) : isAutoPilotEnabled ? (
                    <button
                      onClick={handleDisableAutoPilot}
                      className="group relative flex items-center gap-2 px-3 py-2.5 rounded-lg font-bold text-xs font-[family-name:var(--font-mono)] border transition-all duration-200 bg-[var(--accent-green-dim)] border-[var(--accent-green)]/40 hover:bg-[var(--accent-red-dim)] hover:border-[var(--accent-red)]/40"
                    >
                      <Zap size={14} className="text-[var(--accent-green)] group-hover:text-[var(--accent-red)]" />
                      <span className="text-[var(--accent-green)] group-hover:text-[var(--accent-red)]">AUTO</span>
                      <span className="w-1.5 h-1.5 bg-[var(--accent-green)] rounded-full animate-pulse" />
                    </button>
                  ) : (
                    <AutoTradeSetup userAddress={address!} onEnabled={() => setIsAutoPilotEnabled(true)} />
                  )}
                  <button
                    onClick={handleApproveUSDC}
                    className="w-10 h-10 sm:w-12 sm:h-12 rounded-lg bg-[var(--bg-elevated)] border border-[var(--border-subtle)] flex items-center justify-center text-[var(--text-dim)] hover:text-[var(--text-primary)] hover:border-[var(--border-strong)] transition-all duration-200"
                    title="Approve USDC"
                  >
                    <Wallet size={18} />
                  </button>
                  <div className="w-px h-10 bg-[var(--border-subtle)] hidden sm:block" />
                  <div className="flex-shrink-0">
                    <ConnectWallet dropdownUpward />
                  </div>
                </div>
              </div>
            </div>
            {/* <div className="flex items-center justify-center gap-2 mt-2.5 text-[var(--text-dim)] text-[11px] font-[family-name:var(--font-mono)]">
              <Target size={12} />
              <span>Click chart to place prediction</span>
              <ChevronRight size={12} />
            </div> */}
          </div>
        </div>
      </div>

      {/* ==============================================
        LAYER 3: STATS DRAWER - TRADING TERMINAL
        ==============================================
      */}
      <div
        className={`fixed inset-y-0 right-0 w-full sm:w-[400px] z-[100] transform transition-transform duration-300 ease-out
        ${showStats ? 'translate-x-0' : 'translate-x-full'}`}
      >
        <div
          className="absolute inset-0 opacity-30"
          style={{ background: `linear-gradient(135deg, ${currentColor.bg}, transparent 50%)` }}
        />
        <div className="relative h-full bg-[var(--bg-panel)]/98 backdrop-blur-2xl border-l border-[var(--border-subtle)]">
          <div className="p-5 border-b border-[var(--border-subtle)]">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div
                  className="w-10 h-10 rounded-lg flex items-center justify-center"
                  style={{
                    background: `linear-gradient(135deg, ${currentColor.primary}25, ${currentColor.primary}0d)`,
                    border: `1px solid ${currentColor.primary}40`
                  }}
                >
                  <Trophy size={18} style={{ color: currentColor.primary }} />
                </div>
                <div>
                  <h2 className="text-base font-bold font-[family-name:var(--font-display)] text-[var(--text-primary)]" style={{ fontFamily: 'var(--font-display)' }}>Leaderboard</h2>
                  <p className="text-[11px] font-[family-name:var(--font-mono)] text-[var(--text-dim)]">Top {selectedAsset} traders</p>
                </div>
              </div>
              <button
                onClick={() => setShowStats(false)}
                className="w-9 h-9 rounded-lg bg-[var(--bg-elevated)] border border-[var(--border-subtle)] flex items-center justify-center text-[var(--text-dim)] hover:text-[var(--text-primary)] hover:border-[var(--border-strong)] transition-all"
              >
                <X size={18} />
              </button>
            </div>
          </div>

          <div className="p-5 h-[calc(100%-73px)] overflow-y-auto custom-scrollbar space-y-5">
            <div
              className="rounded-xl p-4 border"
              style={{
                background: `linear-gradient(135deg, ${currentColor.bg}, transparent)`,
                borderColor: `${currentColor.primary}30`
              }}
            >
              <div className="flex items-center gap-2 mb-3">
                <Star size={12} style={{ color: currentColor.primary }} />
                <span className="text-[10px] font-bold font-[family-name:var(--font-mono)] text-[var(--text-dim)] uppercase tracking-wider">Your Stats</span>
              </div>
              <UserStats address={address!} />
            </div>

            <div>
              <div className="flex items-center gap-2 mb-3">
                <Crown size={12} className="text-[var(--accent-amber)]" />
                <span className="text-[10px] font-bold font-[family-name:var(--font-mono)] text-[var(--text-dim)] uppercase tracking-wider">Rankings</span>
              </div>
              <div className="space-y-1.5">
                {leaderboard.map((user, i) => {
                  const isTop3 = i < 3;
                  const medals = ['#f59e0b', '#94a3b8', '#b45309'];
                  return (
                    <div
                      key={i}
                      className={`flex items-center justify-between p-2.5 rounded-lg border transition-all hover:bg-[var(--bg-elevated)] ${isTop3
                          ? 'bg-[var(--accent-amber-dim)] border-[var(--accent-amber)]/30'
                          : 'bg-[var(--bg-elevated)]/50 border-[var(--border-subtle)]'
                        }`}
                    >
                      <div className="flex items-center gap-2.5">
                        <div
                          className={`w-7 h-7 rounded-md flex items-center justify-center font-bold text-xs font-[family-name:var(--font-mono)] ${isTop3 ? 'text-[var(--bg-deep)]' : 'bg-[var(--bg-panel)] text-[var(--text-dim)]'
                            }`}
                          style={isTop3 ? { background: medals[i] } : {}}
                        >
                          {i + 1}
                        </div>
                        <div>
                          <span className="text-[var(--text-primary)] text-xs font-[family-name:var(--font-mono)]">{user._id.slice(0, 6)}…{user._id.slice(-4)}</span>
                          <div className="flex items-center gap-1 mt-0.5">
                            <span className="w-1 h-1 rounded-full bg-[var(--accent-green)]" />
                            <span className="text-[10px] text-[var(--text-dim)]">{user.totalBets || 0} trades</span>
                          </div>
                        </div>
                      </div>
                      <span className="text-[var(--accent-green)] font-bold text-sm font-[family-name:var(--font-mono)]">+${parseFloat(user.totalWon).toFixed(2)}</span>
                    </div>
                  );
                })}
                {leaderboard.length === 0 && (
                  <div className="text-center py-10 text-[var(--text-dim)]">
                    <Trophy size={28} className="mx-auto mb-2 opacity-40" />
                    <p className="text-sm font-[family-name:var(--font-mono)]">No traders yet</p>
                  </div>
                )}
              </div>
            </div>

            <div className="h-px bg-gradient-to-r from-transparent via-[var(--border-subtle)] to-transparent" />

            <div>
              <div className="flex items-center gap-2 mb-3">
                <Activity size={12} className="text-[var(--accent-green)]" />
                <span className="text-[10px] font-bold font-[family-name:var(--font-mono)] text-[var(--text-dim)] uppercase tracking-wider">Recent Rounds</span>
              </div>
              <RecentRounds address={address!} />
            </div>
          </div>
        </div>
      </div>

      {showStats && (
        <div
          className="fixed inset-0 z-[90] bg-[var(--bg-deep)]/60 backdrop-blur-sm"
          onClick={() => setShowStats(false)}
        />
      )}
    </div>
  );
}
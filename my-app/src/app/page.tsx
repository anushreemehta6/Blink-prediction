'use client';

import { useState, useEffect } from 'react';
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

  // Get current asset's price ID
  const currentPriceId = getPriceId(selectedAsset);
  const currentAssetMeta = ASSET_METADATA[selectedAsset];

  // Check if auto-pilot is already enabled on mount
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

  // Fetch current price for selected asset
  useEffect(() => {
    async function fetchPrice() {
      try {
        const res = await fetch(`/api/pyth/price?asset=${selectedAsset}`);
        if (res.ok) {
          const data = await res.json();
          const newPrice = data.price;

          // Track price direction
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

  // Fetch USDC balance
  useEffect(() => {
    if (!address) return;

    const publicClient = createPublicClient({
      chain: monadTestnet,
      transport: http()
    });

    const fetchBalance = async () => {
      try {
        const balance = await publicClient.readContract({
          address: USDC_ADDRESS as Address,
          abi: [{
            name: 'balanceOf',
            type: 'function',
            inputs: [{ name: 'account', type: 'address' }],
            outputs: [{ name: 'balance', type: 'uint256' }]
          }],
          functionName: 'balanceOf',
          args: [address as Address],
        }) as bigint;

        const formatted = formatUnits(balance, 6);
        setUsdcBalance(Number(formatted).toLocaleString(undefined, {
          minimumFractionDigits: 2,
          maximumFractionDigits: 2
        }));
      } catch (e) {
        console.error("Balance fetch error:", e);
      }
    };

    fetchBalance();
    const interval = setInterval(fetchBalance, 5000);
    return () => clearInterval(interval);
  }, [address]);

  // Permanent Deactivate Logic
  const handleDisableAutoPilot = () => {
    if (!address) return;

    toast((t) => (
      <div className="flex flex-col gap-3">
        <p className="font-medium">Disable 1-Click Trading?</p>
        <p className="text-sm text-gray-400">You can re-enable it anytime.</p>
        <div className="flex gap-2">
          <button
            onClick={() => {
              toast.dismiss(t.id);
              confirmDisable();
            }}
            className="px-4 py-2 bg-red-500 text-white rounded-lg text-sm font-bold hover:bg-red-600 transition-all"
          >
            Disable
          </button>
          <button
            onClick={() => toast.dismiss(t.id)}
            className="px-4 py-2 bg-gray-600 text-white rounded-lg text-sm font-bold hover:bg-gray-700 transition-all"
          >
            Cancel
          </button>
        </div>
      </div>
    ), { duration: 10000 });
  };

  const confirmDisable = async () => {
    if (!address) return;
    const toastId = toast.loading("Disabling Mode...");
    try {
      const res = await fetch('/api/session/deactivate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ address }),
      });
      if (res.ok) {
        setIsAutoPilotEnabled(false);
        toast.success("1-Click Trading Disabled", { id: toastId });
      } else {
        toast.error("Failed to disable", { id: toastId });
      }
    } catch (error) {
      toast.error("Error disabling session", { id: toastId });
    }
  };

  // Approve USDC for Manual Trading
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
    } catch (e) { 
        console.error(e);
        toast.error("Approval failed", { id: toastId }); 
    }
  };

  // Handle placing bet
  const handlePlaceBet = async (targetPrice: number, amount: number, multiplier: number) => {
    if (!isConnected || !address || !window.ethereum) {
      toast.error('Please connect your wallet!');
      return;
    }

    const toastId = toast.loading('Preparing transaction...');
    const publicClient = createPublicClient({ chain: monadTestnet, transport: http() });
    let positionId: number; 

    try {
      // Check USDC Balance
      const balance = await publicClient.readContract({
        address: USDC_ADDRESS,
        abi: [{ 
          name: 'balanceOf', 
          type: 'function', 
          inputs: [{ name: 'owner', type: 'address' }], 
          outputs: [{ name: 'balance', type: 'uint256' }] 
        }],
        functionName: 'balanceOf',
        args: [address as Address],
      }) as bigint;

      const requiredAmount = parseUnits(amount.toString(), 6);
      if (balance < requiredAmount) {
        throw new Error(`Insufficient USDC balance. You need ${amount} USDC.`);
      }

      // Get Pyth Oracle Update Data for selected asset
      const response = await fetch(`${MONAD_CONFIG.HERMES_ENDPOINT}?ids[]=${currentPriceId}`);
      const pythData = await response.json();
      const pythPriceUpdate = pythData.binary.data.map((d: string) => `0x${d}` as Address);

      let txHash: string;

      if (isAutoPilotEnabled) {
        positionId = Date.now();
        const res = await fetch('/api/trade/execute', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ 
            userWallet: address, 
            targetPrice, 
            amount, 
            pythUpdate: pythPriceUpdate, 
            positionId,
            assetPriceId: currentPriceId 
          }),
        });
        const data = await res.json();
        if (!data.success) throw new Error(data.error);
        txHash = data.txHash;
      } else {
        const walletClient = createWalletClient({ 
          chain: monadTestnet, 
          transport: custom(window.ethereum!) 
        });

        // Get actual on-chain ID
        const nextId = await publicClient.readContract({ 
          address: THIRTY_CONTRACT_ADDRESS, 
          abi: CONTRACT_ABI, 
          functionName: 'nextPositionId' 
        });
        positionId = Number(nextId); 

        const targetPriceScaled = BigInt(Math.floor(targetPrice * 1e8));

        toast.loading(`Signing for Position #${positionId}...`, { id: toastId });

        txHash = await walletClient.writeContract({
          address: THIRTY_CONTRACT_ADDRESS,
          abi: CONTRACT_ABI,
          functionName: 'openPosition',
          args: [
            currentPriceId,
            targetPriceScaled, 
            requiredAmount, 
            pythPriceUpdate
          ],
          value: parseEther('0.01'), 
          account: address as Address,
          gas: 1000000n, 
        });
      }

      toast.loading(`Confirming on-chain...`, { id: toastId });
      const receipt = await publicClient.waitForTransactionReceipt({ hash: txHash as Address });

      if (receipt.status === 'reverted') {
        throw new Error("Transaction reverted on-chain. Please check if you have enough USDC and MON for fees.");
      }

      // Save to DB only after success
      await fetch('/api/predictions/record', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          positionId,
          address,
          asset: selectedAsset,
          targetPrice: targetPrice.toString(),
          entryPrice: currentPrice?.toString() || "0",
          isUpward: targetPrice > (currentPrice || 0),
          amount: amount.toString(),
          multiplier,
          txHash,
          status: 'OPEN'
        }),
      });

      toast.success(`Trade Live! ID: #${positionId}`, { id: toastId });
    } catch (error: any) {
      console.error(error);
      toast.error(error.shortMessage || error.message || "Trade failed", { id: toastId });
    }
  };

  // Show Home landing page when wallet is not connected
  if (!isConnected) {
    return <Home />;
  }

  // Show main trading interface when wallet is connected
  return (
    <div className="min-h-screen bg-[#082832]">
      {/* Navbar */}
      <nav className="max-w-7xl mx-auto px-4 pt-6">
        <div className="flex items-center justify-between bg-[#0A696C] rounded-full px-6 py-3">
          {/* Left - Blink Mode Info */}
          <div className="flex items-center gap-4">
            <div>
              <h3 className="text-white font-bold text-lg">Blink Mode</h3>
              <p className="text-xs text-white/70">1-tap trading is ready. No extra approvals.</p>
            </div>

            {/* Approve USDC Button */}
            <button
              onClick={handleApproveUSDC}
              className="text-sm bg-[#F5F5DC] hover:bg-[#E5E5CC] text-[#0A696C] px-5 py-2 rounded-full font-bold transition-all"
            >
              Approve USDC
            </button>
          </div>

          {/* Right - Status + Actions + Wallet */}
          <div className="flex items-center gap-3">
            {isCheckingAutoPilot ? (
              <div className="text-white/70 text-sm animate-pulse">Checking...</div>
            ) : isAutoPilotEnabled ? (
              <>
                <span className="bg-green-500/20 text-green-400 border border-green-500/30 px-5 py-2 rounded-full text-sm font-bold">
                  Active
                </span>
                <button
                  onClick={handleDisableAutoPilot}
                  className="text-sm bg-red-500/20 hover:bg-red-500/30 text-red-400 border border-red-500/30 px-5 py-2 rounded-full font-bold transition-all"
                >
                  Disable
                </button>
              </>
            ) : (
              <AutoTradeSetup userAddress={address!} onEnabled={() => setIsAutoPilotEnabled(true)} />
            )}

            <ConnectWallet />
          </div>
        </div>
      </nav>

      <main className="max-w-5xl mx-auto px-4 pt-8 pb-8 space-y-6">
        {/* Asset Selector */}
        <div className="flex justify-center gap-3">
          {(Object.keys(PYTH_PRICE_IDS) as AssetSymbol[]).map((asset) => (
            <button
              key={asset}
              onClick={() => setSelectedAsset(asset)}
              className={`px-6 py-3 rounded-xl font-bold transition-all ${
                selectedAsset === asset
                  ? 'bg-[#0A696C] text-white shadow-lg scale-105'
                  : 'bg-white/10 text-white/60 hover:bg-white/20'
              }`}
            >
              {asset}
            </button>
          ))}
        </div>

        {/* Chart Container */}
        <div className="flex justify-center">
          <div className="w-full max-w-4xl">
            {/* Live Price Badge */}
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <div className="flex items-center gap-2 bg-[#0A696C]/20 border border-[#0A696C]/40 rounded-full px-4 py-2">
                  <div className="relative">
                    <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                    <div className="absolute inset-0 w-2 h-2 bg-green-500 rounded-full animate-ping"></div>
                  </div>
                  <span className="text-white/60 text-sm font-medium">{selectedAsset}/USD</span>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <div className="bg-gradient-to-r from-[#0A696C] to-[#065456] rounded-2xl px-5 py-2.5 shadow-lg border border-[#0A696C]/50">
                  <div className="flex items-center gap-3">
                    <div className="text-[#A1BCBD] text-xs font-medium">Live Price</div>
                    <div className="flex items-baseline gap-1">
                      <span className="text-[#A1BCBD] text-lg">$</span>
                      <span className="text-white font-black text-2xl tabular-nums">
                        {currentPrice ? currentPrice.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : '---'}
                      </span>
                    </div>
                    {currentPrice && priceDirection && (
                      <div className={`flex items-center gap-0.5 px-2 py-0.5 rounded-full text-xs font-bold transition-all duration-300 ${
                        priceDirection === 'up' ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'
                      }`}>
                        <svg
                          className={`w-3 h-3 transition-transform duration-300 ${priceDirection === 'down' ? 'rotate-180' : ''}`}
                          fill="none"
                          viewBox="0 0 24 24"
                          stroke="currentColor"
                        >
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 10l7-7m0 0l7 7m-7-7v18" />
                        </svg>
                      </div>
                    )}
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

        {/* Bottom Section - Available USDC and Blinks */}
        <div className="flex flex-col md:flex-row items-center justify-center gap-8 mt-8">
          {/* Available USDC */}
          <div className="text-center">
            <p className="text-white/80 text-lg mb-2">Available USDC</p>
            <div className="bg-[#0A696C] text-white font-bold text-2xl px-8 py-3 rounded-full">
              <span className="text-[#A1BCBD]">$</span> {usdcBalance}
            </div>
          </div>

          {/* Blinks Available */}
          <div className="text-center">
            <p className="text-white/80 text-lg mb-2">Blinks Available</p>
            <div className="flex items-center gap-3">
              {[5, 10, 25, 50].map((amt) => (
                <button
                  key={amt}
                  onClick={() => setSelectedAmount(amt)}
                  className={`font-bold text-xl px-6 py-3 rounded-full transition-all border-2 ${
                    selectedAmount === amt
                      ? 'bg-[#A1BCBD] text-[#0A696C] border-[#A1BCBD]'
                      : 'bg-[#0A696C] hover:bg-[#0A797C] text-white border-[#0A696C] hover:border-[#A1BCBD]'
                  }`}
                >
                  <span className={selectedAmount === amt ? 'text-[#0A696C]' : 'text-[#A1BCBD]'}>$</span>{amt}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Stats and History Section */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-8">
          <UserStats address={address!} />
          <RecentRounds address={address!} />
        </div>
      </main>
    </div>
  );
}
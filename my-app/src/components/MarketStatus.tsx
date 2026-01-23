'use client';

import { useEffect, useState } from 'react';
import { Activity, Zap, Wifi, Server, Wallet, ShieldCheck } from 'lucide-react';

export default function MarketStatus() {
  const [pulse, setPulse] = useState(0);
  const [houseBalance, setHouseBalance] = useState<string | null>(null);

  // 1. Simulated Oracle Heartbeat
  useEffect(() => {
    const interval = setInterval(() => {
      setPulse((prev) => (prev + 1) % 5);
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  // 2. ✅ Fetch House Liquidity
  useEffect(() => {
    async function fetchLiquidity() {
      try {
        const res = await fetch('/api/system/balance');
        if (res.ok) {
          const data = await res.json();
          setHouseBalance(data.houseBalance);
        }
      } catch (e) {
        console.error('Failed to fetch liquidity');
      }
    }
    
    fetchLiquidity();
    // Refresh every 30s
    const interval = setInterval(fetchLiquidity, 30000); 
    return () => clearInterval(interval);
  }, []);

  const percentage = (pulse / 5) * 100;
  const formattedBalance = houseBalance 
    ? Number(houseBalance).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })
    : '---';

  return (
    <div className="card">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Activity className="text-green-500" size={20} />
          <h3 className="text-lg font-bold text-white">Market Status</h3>
        </div>
        <div className="flex items-center gap-1.5 px-2 py-1 rounded bg-green-500/10 border border-green-500/20">
          <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500"></span>
          </span>
          <span className="text-[10px] font-bold text-green-500 tracking-wider">ONLINE</span>
        </div>
      </div>

      {/* ✅ NEW: House Liquidity Box */}
      <div className="mb-6 bg-gray-800/50 rounded-xl p-3 border border-gray-700">
        <div className="flex items-center justify-between mb-1">
            <span className="text-xs text-gray-400 flex items-center gap-1.5">
                <Wallet size={12} className="text-blue-400"/> House Liquidity
            </span>
            <span className="text-[10px] text-green-500 flex items-center gap-1">
                <ShieldCheck size={10} /> Solvent
            </span>
        </div>
        <div className="text-2xl font-mono font-bold text-white tracking-tight">
            ${formattedBalance} <span className="text-sm text-gray-500 font-sans">USDC</span>
        </div>
      </div>

      {/* Trading Mode Badge */}
      <div className="mb-6 px-4 py-3 rounded-xl border-2 border-purple-500/20 bg-purple-500/5">
        <div className="flex items-center justify-center gap-2 mb-1">
          <Zap className="text-purple-400" size={18} fill="currentColor" />
          <div className="text-sm font-bold text-purple-400 text-center">ONE-TOUCH TRADING</div>
        </div>
        <div className="text-xs text-gray-400 text-center">
          Instant Execution • Dynamic Odds
        </div>
      </div>

      {/* Heartbeat Circle */}
      <div className="flex flex-col items-center py-4">
        <div className="relative">
          <svg className="w-24 h-24 transform -rotate-90">
            <circle cx="48" cy="48" r="40" stroke="rgba(31, 41, 55, 0.5)" strokeWidth="4" fill="none" />
            <circle
              cx="48"
              cy="48"
              r="40"
              stroke="#A855F7"
              strokeWidth="4"
              fill="none"
              strokeDasharray={`${2 * Math.PI * 40}`}
              strokeDashoffset={`${2 * Math.PI * 40 * (1 - percentage / 100)}`}
              strokeLinecap="round"
              className="transition-all duration-1000 ease-linear"
            />
          </svg>
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <div className="text-2xl font-bold text-white font-mono">
              {5 - pulse}s
            </div>
            <div className="text-[8px] text-gray-500 uppercase tracking-widest mt-0.5">
              Oracle Sync
            </div>
          </div>
        </div>
      </div>

      {/* Network Stats Grid */}
      <div className="grid grid-cols-2 gap-2 mt-4 pt-4 border-t border-gray-800">
        <div className="p-2 rounded-lg bg-gray-800/50 flex flex-col items-center">
          <div className="flex items-center gap-1.5 text-gray-400 mb-1">
            <Wifi size={12} />
            <span className="text-[10px] uppercase">Latency</span>
          </div>
          <span className="text-sm font-bold text-green-400">~45ms</span>
        </div>
        
        <div className="p-2 rounded-lg bg-gray-800/50 flex flex-col items-center">
          <div className="flex items-center gap-1.5 text-gray-400 mb-1">
            <Server size={12} />
            <span className="text-[10px] uppercase">Network</span>
          </div>
          <span className="text-sm font-bold text-purple-400">Monad</span>
        </div>
      </div>
    </div>
  );
}
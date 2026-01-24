'use client';

import { useEffect, useState, useRef } from 'react';
import { Trophy, TrendingUp, TrendingDown, Flame, Zap, Target } from 'lucide-react';
import { type Address } from 'viem';
import { PieChart, Pie, Cell, ResponsiveContainer } from 'recharts';
import { motion, AnimatePresence } from 'framer-motion';

interface UserStatsProps {
  address: Address;
}

interface Stats {
  totalPredictions: number;
  wins: number;
  losses: number;
  winRate: string;
  netProfit: string;
  currentStreak: number;
}

export default function UserStats({ address }: UserStatsProps) {
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);
  const [winFlash, setWinFlash] = useState(false);
  const [lossFlash, setLossFlash] = useState(false);
  const prevStatsRef = useRef<Stats | null>(null);

  useEffect(() => {
    async function fetchStats() {
      try {
        const res = await fetch(`/api/stats?address=${address}`);
        if (res.ok) {
          const data = await res.json();

          // Check for win/loss changes
          if (prevStatsRef.current) {
            if (data.wins > prevStatsRef.current.wins) {
              setWinFlash(true);
              setTimeout(() => setWinFlash(false), 2000);
            }
            if (data.losses > prevStatsRef.current.losses) {
              setLossFlash(true);
              setTimeout(() => setLossFlash(false), 2000);
            }
          }

          prevStatsRef.current = data;
          setStats(data);
        }
      } catch (error) {
        console.error('Failed to fetch stats:', error);
      } finally {
        setLoading(false);
      }
    }

    if (address) {
      fetchStats();
      const interval = setInterval(fetchStats, 30000);
      return () => clearInterval(interval);
    }
  }, [address]);

  if (loading) {
    return (
      <div className="bg-[var(--bg-panel)] border border-[var(--border-subtle)] rounded-xl p-6 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-32 h-32 bg-[var(--accent-green)]/5 rounded-full -translate-y-1/2 translate-x-1/2" />
        <div className="relative z-10">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-10 h-10 bg-[var(--bg-elevated)] rounded-lg animate-pulse" />
            <div className="w-28 h-4 bg-[var(--bg-elevated)] rounded animate-pulse" />
          </div>
          <div className="flex justify-center mb-6">
            <div className="w-32 h-32 bg-[var(--bg-elevated)] rounded-full animate-pulse" />
          </div>
          <div className="grid grid-cols-2 gap-2">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="h-16 bg-[var(--bg-elevated)] rounded-lg animate-pulse" />
            ))}
          </div>
        </div>
      </div>
    );
  }

  const defaultStats: Stats = {
    totalPredictions: 0,
    wins: 0,
    losses: 0,
    winRate: '0',
    netProfit: '0.00',
    currentStreak: 0,
  };

  const userStats = stats || defaultStats;
  const isProfit = parseFloat(userStats.netProfit) >= 0;
  const winRateNum = parseFloat(userStats.winRate);

  // Pie chart data
  const pieData = [
    { name: 'Wins', value: userStats.wins, color: '#00d26a' },
    { name: 'Losses', value: userStats.losses, color: '#ff4757' },
  ];
  const filteredPieData = pieData.filter(item => item.value > 0);
  const hasData = filteredPieData.length > 0;

  return (
    <motion.div
      className="bg-[var(--bg-panel)] border border-[var(--border-subtle)] rounded-xl p-6 relative overflow-hidden"
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35 }}
    >
      {/* Win Flash Overlay */}
      <AnimatePresence>
        {winFlash && (
          <motion.div
            className="absolute inset-0 z-20 pointer-events-none"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.3 }}
          >
            <div className="absolute inset-0 bg-green-500/20" />
            <motion.div
              className="absolute inset-0 border-4 border-green-400 rounded-3xl"
              initial={{ scale: 1.1, opacity: 0 }}
              animate={{ scale: 1, opacity: [0, 1, 1, 0] }}
              transition={{ duration: 1.5, times: [0, 0.1, 0.7, 1] }}
            />
            {/* Floating particles */}
            {[...Array(8)].map((_, i) => (
              <motion.div
                key={i}
                className="absolute w-2 h-2 bg-green-400 rounded-full"
                initial={{
                  x: '50%',
                  y: '50%',
                  scale: 0
                }}
                animate={{
                  x: `${20 + Math.random() * 60}%`,
                  y: `${Math.random() * 100}%`,
                  scale: [0, 1, 0],
                  opacity: [0, 1, 0]
                }}
                transition={{
                  duration: 1.5,
                  delay: i * 0.1,
                  ease: "easeOut"
                }}
              />
            ))}
            {/* WIN text */}
            <motion.div
              className="absolute inset-0 flex items-center justify-center"
              initial={{ scale: 0, rotate: -10 }}
              animate={{ scale: [0, 1.2, 1], rotate: [-10, 5, 0] }}
              exit={{ scale: 0, opacity: 0 }}
              transition={{ duration: 0.5 }}
            >
              <div className="bg-green-500 text-white px-6 py-3 rounded-2xl font-black text-2xl shadow-lg shadow-green-500/50">
                WIN! 🎉
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Loss Flash Overlay */}
      <AnimatePresence>
        {lossFlash && (
          <motion.div
            className="absolute inset-0 z-20 pointer-events-none"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.3 }}
          >
            <motion.div
              className="absolute inset-0 bg-red-500/20"
              animate={{ opacity: [0.3, 0.1, 0.3, 0.1] }}
              transition={{ duration: 0.5, repeat: 2 }}
            />
            <motion.div
              className="absolute inset-0 border-4 border-red-400 rounded-3xl"
              initial={{ opacity: 0 }}
              animate={{ opacity: [0, 1, 0] }}
              transition={{ duration: 1, repeat: 1 }}
            />
            {/* Shake effect handled by parent */}
            <motion.div
              className="absolute inset-0 flex items-center justify-center"
              initial={{ scale: 0 }}
              animate={{ scale: [0, 1.1, 1], x: [0, -5, 5, -5, 5, 0] }}
              exit={{ scale: 0, opacity: 0 }}
              transition={{ duration: 0.6 }}
            >
              <div className="bg-red-500 text-white px-6 py-3 rounded-2xl font-black text-2xl shadow-lg shadow-red-500/50">
                LOSS 💔
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="absolute top-0 right-0 w-32 h-32 bg-[var(--accent-green)]/5 rounded-full -translate-y-1/2 translate-x-1/2" />

      <div className="relative z-10">
        <div className="flex items-center justify-between mb-5">
          <div className="flex items-center gap-3">
            <motion.div
              className="p-2.5 bg-[var(--accent-green)]/15 rounded-lg"
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
            >
              <Trophy className="text-[var(--accent-green)]" size={20} />
            </motion.div>
            <div>
              <h3 className="text-base font-bold text-[var(--text-primary)] font-[family-name:var(--font-display)]" style={{ fontFamily: 'var(--font-display)' }}>Your Stats</h3>
              <p className="text-[11px] text-[var(--text-dim)] font-[family-name:var(--font-mono)]">Performance</p>
            </div>
          </div>
          <AnimatePresence>
            {userStats.currentStreak > 0 && (
              <motion.div
                className="flex items-center gap-1.5 px-2.5 py-1 bg-[var(--accent-amber)] text-[var(--bg-deep)] rounded-lg font-[family-name:var(--font-mono)] font-bold text-xs"
                initial={{ scale: 0, rotate: -180 }}
                animate={{ scale: 1, rotate: 0 }}
                exit={{ scale: 0 }}
                transition={{ type: "spring", stiffness: 500, damping: 25 }}
              >
                <motion.div animate={{ scale: [1, 1.15, 1] }} transition={{ duration: 0.5, repeat: Infinity, repeatDelay: 1 }}>
                  <Flame size={14} className="text-[var(--bg-deep)]" />
                </motion.div>
                <span>{userStats.currentStreak}</span>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Main Pie Chart with Center Stats */}
        <div className="flex justify-center mb-6">
          <div className="relative w-44 h-44">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={hasData ? filteredPieData : [{ name: 'No Data', value: 1, color: 'rgba(255,255,255,0.1)' }]}
                  cx="50%"
                  cy="50%"
                  innerRadius={55}
                  outerRadius={75}
                  paddingAngle={hasData && filteredPieData.length > 1 ? 5 : 0}
                  dataKey="value"
                  stroke="none"
                  startAngle={90}
                  endAngle={-270}
                >
                  {(hasData ? filteredPieData : [{ name: 'No Data', value: 1, color: 'rgba(255,255,255,0.1)' }]).map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
              </PieChart>
            </ResponsiveContainer>
            {/* Center content */}
            <motion.div
              className="absolute inset-0 flex flex-col items-center justify-center"
              key={userStats.winRate}
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ type: "spring", stiffness: 300, damping: 20 }}
            >
              <span className="text-2xl font-black font-[family-name:var(--font-mono)] text-[var(--text-primary)]" style={{ fontFamily: 'var(--font-mono)' }}>{userStats.winRate}%</span>
              <span className="text-[11px] text-[var(--text-dim)] font-[family-name:var(--font-mono)]">Win Rate</span>
            </motion.div>
          </div>
        </div>

        <div className="flex justify-center gap-6 mb-5">
          <motion.div className="flex items-center gap-2" animate={winFlash ? { scale: [1, 1.1, 1] } : {}} transition={{ duration: 0.3 }}>
            <motion.div
              className="w-2.5 h-2.5 rounded-full bg-[var(--accent-green)]"
              animate={winFlash ? { scale: [1, 1.4, 1], boxShadow: ['0 0 0 var(--accent-green)', '0 0 12px var(--accent-green)', '0 0 0 var(--accent-green)'] } : {}}
            />
            <span className="text-xs text-[var(--text-muted)] font-[family-name:var(--font-mono)]">Wins</span>
            <motion.span className="text-xs font-bold text-[var(--accent-green)] font-[family-name:var(--font-mono)]" key={userStats.wins} initial={{ scale: 1.3 }} animate={{ scale: 1 }} transition={{ duration: 0.4 }}>
              {userStats.wins}
            </motion.span>
          </motion.div>
          <motion.div className="flex items-center gap-2" animate={lossFlash ? { scale: [1, 1.1, 1] } : {}} transition={{ duration: 0.3 }}>
            <motion.div
              className="w-2.5 h-2.5 rounded-full bg-[var(--accent-red)]"
              animate={lossFlash ? { scale: [1, 1.4, 1], boxShadow: ['0 0 0 var(--accent-red)', '0 0 12px var(--accent-red)', '0 0 0 var(--accent-red)'] } : {}}
            />
            <span className="text-xs text-[var(--text-muted)] font-[family-name:var(--font-mono)]">Losses</span>
            <motion.span className="text-xs font-bold text-[var(--accent-red)] font-[family-name:var(--font-mono)]" key={userStats.losses} initial={{ scale: 1.3 }} animate={{ scale: 1 }} transition={{ duration: 0.4 }}>
              {userStats.losses}
            </motion.span>
          </motion.div>
        </div>

        <div className="grid grid-cols-2 gap-2">
          <motion.div
            className="bg-[var(--bg-elevated)] rounded-lg p-3 border border-[var(--border-subtle)]"
            whileHover={{ scale: 1.02 }}
            transition={{ duration: 0.2 }}
          >
            <div className="flex items-center gap-1.5 mb-1.5">
              <Target size={12} className="text-[var(--accent-green)]" />
              <span className="text-[10px] text-[var(--text-dim)] font-[family-name:var(--font-mono)] uppercase tracking-wider">Total Bets</span>
            </div>
            <motion.div className="text-xl font-bold font-[family-name:var(--font-mono)] text-[var(--text-primary)]" key={userStats.totalPredictions} initial={{ scale: 1.2 }} animate={{ scale: 1 }} transition={{ type: "spring", stiffness: 300 }}>
              {userStats.totalPredictions}
            </motion.div>
          </motion.div>

          <motion.div
            className={`rounded-lg p-3 border ${isProfit ? 'bg-[var(--accent-green-dim)] border-[var(--accent-green)]/30' : 'bg-[var(--accent-red-dim)] border-[var(--accent-red)]/30'}`}
            whileHover={{ scale: 1.02 }}
            animate={winFlash ? { boxShadow: ['0 0 0 var(--accent-green)', '0 0 20px var(--accent-green)', '0 0 0 var(--accent-green)'] } : lossFlash ? { boxShadow: ['0 0 0 var(--accent-red)', '0 0 20px var(--accent-red)', '0 0 0 var(--accent-red)'] } : {}}
            transition={{ duration: 0.5 }}
          >
            <div className="flex items-center gap-1.5 mb-1.5">
              {isProfit ? <TrendingUp size={12} className="text-[var(--accent-green)]" /> : <TrendingDown size={12} className="text-[var(--accent-red)]" />}
              <span className="text-[10px] text-[var(--text-dim)] font-[family-name:var(--font-mono)] uppercase tracking-wider">Net P/L</span>
            </div>
            <motion.div
              className={`text-xl font-bold font-[family-name:var(--font-mono)] ${isProfit ? 'text-[var(--accent-green)]' : 'text-[var(--accent-red)]'}`}
              key={userStats.netProfit}
              initial={{ scale: 1.2 }}
              animate={{ scale: 1 }}
              transition={{ type: "spring", stiffness: 300 }}
            >
              {isProfit ? '+' : ''}${userStats.netProfit}
            </motion.div>
          </motion.div>

          <motion.div
            className="bg-[var(--bg-elevated)] rounded-lg p-3 border border-[var(--border-subtle)]"
            whileHover={{ scale: 1.02 }}
          >
            <div className="flex items-center gap-1.5 mb-1.5">
              <Flame size={12} className="text-[var(--accent-amber)]" />
              <span className="text-[10px] text-[var(--text-dim)] font-[family-name:var(--font-mono)] uppercase tracking-wider">Streak</span>
            </div>
            <div className="flex items-center gap-2">
              <motion.span className="text-xl font-bold font-[family-name:var(--font-mono)] text-[var(--text-primary)]" key={userStats.currentStreak} initial={{ scale: 1.2 }} animate={{ scale: 1 }} transition={{ type: "spring", stiffness: 300 }}>
                {userStats.currentStreak}
              </motion.span>
              <AnimatePresence>
                {userStats.currentStreak >= 3 && (
                  <motion.span
                    className="text-[10px] bg-[var(--accent-amber)]/20 text-[var(--accent-amber)] px-1.5 py-0.5 rounded font-bold font-[family-name:var(--font-mono)]"
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    exit={{ scale: 0 }}
                  >
                    HOT
                  </motion.span>
                )}
              </AnimatePresence>
            </div>
          </motion.div>

          <motion.div
            className="bg-[var(--bg-elevated)] rounded-lg p-3 border border-[var(--border-subtle)]"
            whileHover={{ scale: 1.02 }}
          >
            <div className="flex items-center gap-1.5 mb-1.5">
              <Zap size={12} className="text-[var(--accent-amber)]" />
              <span className="text-[10px] text-[var(--text-dim)] font-[family-name:var(--font-mono)] uppercase tracking-wider">Rating</span>
            </div>
            <div className="flex items-center gap-1.5">
              <motion.span className="text-xl font-bold font-[family-name:var(--font-mono)] text-[var(--text-primary)]" key={winRateNum} initial={{ scale: 1.2 }} animate={{ scale: 1 }} transition={{ type: "spring", stiffness: 300 }}>
                {winRateNum >= 70 ? 'S' : winRateNum >= 55 ? 'A' : winRateNum >= 45 ? 'B' : winRateNum >= 30 ? 'C' : 'D'}
              </motion.span>
              <div className="flex">
                {[...Array(winRateNum >= 70 ? 3 : winRateNum >= 50 ? 2 : 1)].map((_, i) => (
                  <motion.div key={i} initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ delay: i * 0.08, type: "spring", stiffness: 500 }}>
                    <Zap size={10} className="text-[var(--accent-amber)] fill-[var(--accent-amber)]" />
                  </motion.div>
                ))}
              </div>
            </div>
          </motion.div>
        </div>

        {userStats.totalPredictions > 0 && (
          <div className="mt-4 pt-4 border-t border-[var(--border-subtle)]">
            <div className="flex justify-between text-[11px] mb-1.5 font-[family-name:var(--font-mono)]">
              <span className="text-[var(--text-dim)]">Win progress</span>
              <span className="text-[var(--text-muted)] font-bold">{userStats.wins} / {userStats.totalPredictions}</span>
            </div>
            <div className="h-1.5 bg-[var(--bg-elevated)] rounded-full overflow-hidden">
              <motion.div
                className="h-full bg-[var(--accent-green)] rounded-full"
                initial={{ width: 0 }}
                animate={{ width: `${userStats.winRate}%` }}
                transition={{ duration: 0.8, ease: "easeOut" }}
              />
            </div>
          </div>
        )}
      </div>
    </motion.div>
  );
}

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
      <div className="bg-gradient-to-br from-[#0A696C] to-[#065456] rounded-3xl p-6 shadow-2xl relative overflow-hidden">
        <div className="absolute top-0 right-0 w-40 h-40 bg-white/5 rounded-full -translate-y-1/2 translate-x-1/2" />
        <div className="absolute bottom-0 left-0 w-24 h-24 bg-white/5 rounded-full translate-y-1/2 -translate-x-1/2" />
        <div className="relative z-10">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-12 h-12 bg-white/10 rounded-2xl animate-pulse" />
            <div className="w-32 h-6 bg-white/10 rounded animate-pulse" />
          </div>
          <div className="flex justify-center mb-6">
            <div className="w-36 h-36 bg-white/10 rounded-full animate-pulse" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="h-20 bg-white/10 rounded-2xl animate-pulse" />
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
    { name: 'Wins', value: userStats.wins, color: '#4ADE80' },
    { name: 'Losses', value: userStats.losses, color: '#F87171' },
  ];
  const filteredPieData = pieData.filter(item => item.value > 0);
  const hasData = filteredPieData.length > 0;

  return (
    <motion.div
      className="bg-gradient-to-br from-[#0A696C] to-[#065456] rounded-3xl p-6 shadow-2xl relative overflow-hidden"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
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

      {/* Decorative circles */}
      <div className="absolute top-0 right-0 w-40 h-40 bg-white/5 rounded-full -translate-y-1/2 translate-x-1/2" />
      <div className="absolute bottom-0 left-0 w-24 h-24 bg-white/5 rounded-full translate-y-1/2 -translate-x-1/2" />

      <div className="relative z-10">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <motion.div
              className="p-3 bg-[#F5F5DC] rounded-2xl"
              whileHover={{ scale: 1.1, rotate: 5 }}
              whileTap={{ scale: 0.95 }}
            >
              <Trophy className="text-[#0A696C]" size={24} />
            </motion.div>
            <div>
              <h3 className="text-xl font-bold text-white">Your Stats</h3>
              <p className="text-xs text-white/60">Performance Overview</p>
            </div>
          </div>
          <AnimatePresence>
            {userStats.currentStreak > 0 && (
              <motion.div
                className="flex items-center gap-1 px-3 py-1.5 bg-orange-500 rounded-full"
                initial={{ scale: 0, rotate: -180 }}
                animate={{ scale: 1, rotate: 0 }}
                exit={{ scale: 0 }}
                transition={{ type: "spring", stiffness: 500, damping: 25 }}
              >
                <motion.div
                  animate={{ scale: [1, 1.2, 1] }}
                  transition={{ duration: 0.5, repeat: Infinity, repeatDelay: 1 }}
                >
                  <Flame size={16} className="text-white" />
                </motion.div>
                <span className="text-sm font-bold text-white">{userStats.currentStreak}</span>
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
              <span className="text-3xl font-black text-white">{userStats.winRate}%</span>
              <span className="text-xs text-white/60 font-medium">Win Rate</span>
            </motion.div>
          </div>
        </div>

        {/* Win/Loss Legend */}
        <div className="flex justify-center gap-6 mb-6">
          <motion.div
            className="flex items-center gap-2"
            animate={winFlash ? { scale: [1, 1.2, 1] } : {}}
            transition={{ duration: 0.3 }}
          >
            <motion.div
              className="w-3 h-3 rounded-full bg-[#4ADE80]"
              animate={winFlash ? { scale: [1, 1.5, 1], boxShadow: ['0 0 0px #4ADE80', '0 0 20px #4ADE80', '0 0 0px #4ADE80'] } : {}}
            />
            <span className="text-sm text-white/80">Wins</span>
            <motion.span
              className="text-sm font-bold text-[#4ADE80]"
              key={userStats.wins}
              initial={{ scale: 1.5, color: '#fff' }}
              animate={{ scale: 1, color: '#4ADE80' }}
              transition={{ duration: 0.5 }}
            >
              {userStats.wins}
            </motion.span>
          </motion.div>
          <motion.div
            className="flex items-center gap-2"
            animate={lossFlash ? { scale: [1, 1.2, 1] } : {}}
            transition={{ duration: 0.3 }}
          >
            <motion.div
              className="w-3 h-3 rounded-full bg-[#F87171]"
              animate={lossFlash ? { scale: [1, 1.5, 1], boxShadow: ['0 0 0px #F87171', '0 0 20px #F87171', '0 0 0px #F87171'] } : {}}
            />
            <span className="text-sm text-white/80">Losses</span>
            <motion.span
              className="text-sm font-bold text-[#F87171]"
              key={userStats.losses}
              initial={{ scale: 1.5, color: '#fff' }}
              animate={{ scale: 1, color: '#F87171' }}
              transition={{ duration: 0.5 }}
            >
              {userStats.losses}
            </motion.span>
          </motion.div>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-2 gap-3">
          {/* Total Bets */}
          <motion.div
            className="bg-white/10 backdrop-blur-sm rounded-2xl p-4 border border-white/10"
            whileHover={{ scale: 1.02, backgroundColor: 'rgba(255,255,255,0.15)' }}
            transition={{ duration: 0.2 }}
          >
            <div className="flex items-center gap-2 mb-2">
              <Target size={14} className="text-[#A1BCBD]" />
              <span className="text-xs text-white/60 font-medium">Total Bets</span>
            </div>
            <motion.div
              className="text-2xl font-black text-white"
              key={userStats.totalPredictions}
              initial={{ scale: 1.3 }}
              animate={{ scale: 1 }}
              transition={{ type: "spring", stiffness: 300 }}
            >
              {userStats.totalPredictions}
            </motion.div>
          </motion.div>

          {/* Net Profit */}
          <motion.div
            className={`rounded-2xl p-4 border ${
              isProfit
                ? 'bg-green-500/20 border-green-500/30'
                : 'bg-red-500/20 border-red-500/30'
            }`}
            whileHover={{ scale: 1.02 }}
            animate={winFlash ? { boxShadow: ['0 0 0px #4ADE80', '0 0 30px #4ADE80', '0 0 0px #4ADE80'] } :
                     lossFlash ? { boxShadow: ['0 0 0px #F87171', '0 0 30px #F87171', '0 0 0px #F87171'] } : {}}
            transition={{ duration: 0.5 }}
          >
            <div className="flex items-center gap-2 mb-2">
              {isProfit ? (
                <motion.div animate={winFlash ? { y: [0, -5, 0] } : {}} transition={{ duration: 0.3, repeat: 3 }}>
                  <TrendingUp size={14} className="text-green-400" />
                </motion.div>
              ) : (
                <motion.div animate={lossFlash ? { y: [0, 5, 0] } : {}} transition={{ duration: 0.3, repeat: 3 }}>
                  <TrendingDown size={14} className="text-red-400" />
                </motion.div>
              )}
              <span className="text-xs text-white/60 font-medium">Net Profit</span>
            </div>
            <motion.div
              className={`text-2xl font-black ${isProfit ? 'text-green-400' : 'text-red-400'}`}
              key={userStats.netProfit}
              initial={{ scale: 1.3 }}
              animate={{ scale: 1 }}
              transition={{ type: "spring", stiffness: 300 }}
            >
              {isProfit ? '+' : ''}${userStats.netProfit}
            </motion.div>
          </motion.div>

          {/* Streak */}
          <motion.div
            className="bg-white/10 backdrop-blur-sm rounded-2xl p-4 border border-white/10"
            whileHover={{ scale: 1.02, backgroundColor: 'rgba(255,255,255,0.15)' }}
          >
            <div className="flex items-center gap-2 mb-2">
              <Flame size={14} className="text-orange-400" />
              <span className="text-xs text-white/60 font-medium">Streak</span>
            </div>
            <div className="flex items-center gap-2">
              <motion.span
                className="text-2xl font-black text-white"
                key={userStats.currentStreak}
                initial={{ scale: 1.5, rotate: 10 }}
                animate={{ scale: 1, rotate: 0 }}
                transition={{ type: "spring", stiffness: 300 }}
              >
                {userStats.currentStreak}
              </motion.span>
              <AnimatePresence>
                {userStats.currentStreak >= 3 && (
                  <motion.span
                    className="text-xs bg-orange-500/20 text-orange-400 px-2 py-0.5 rounded-full font-bold"
                    initial={{ scale: 0, x: -10 }}
                    animate={{ scale: 1, x: 0 }}
                    exit={{ scale: 0 }}
                  >
                    HOT
                  </motion.span>
                )}
              </AnimatePresence>
            </div>
          </motion.div>

          {/* Performance Rating */}
          <motion.div
            className="bg-white/10 backdrop-blur-sm rounded-2xl p-4 border border-white/10"
            whileHover={{ scale: 1.02, backgroundColor: 'rgba(255,255,255,0.15)' }}
          >
            <div className="flex items-center gap-2 mb-2">
              <Zap size={14} className="text-yellow-400" />
              <span className="text-xs text-white/60 font-medium">Rating</span>
            </div>
            <div className="flex items-center gap-2">
              <motion.span
                className="text-2xl font-black text-white"
                key={winRateNum}
                initial={{ scale: 1.5 }}
                animate={{ scale: 1 }}
                transition={{ type: "spring", stiffness: 300 }}
              >
                {winRateNum >= 70 ? 'S' : winRateNum >= 55 ? 'A' : winRateNum >= 45 ? 'B' : winRateNum >= 30 ? 'C' : 'D'}
              </motion.span>
              <div className="flex">
                {[...Array(winRateNum >= 70 ? 3 : winRateNum >= 50 ? 2 : 1)].map((_, i) => (
                  <motion.div
                    key={i}
                    initial={{ scale: 0, rotate: -180 }}
                    animate={{ scale: 1, rotate: 0 }}
                    transition={{ delay: i * 0.1, type: "spring", stiffness: 500 }}
                  >
                    <Zap size={12} className="text-yellow-400 fill-yellow-400" />
                  </motion.div>
                ))}
              </div>
            </div>
          </motion.div>
        </div>

        {/* Progress Bar */}
        {userStats.totalPredictions > 0 && (
          <div className="mt-4 pt-4 border-t border-white/10">
            <div className="flex justify-between text-xs mb-2">
              <span className="text-white/60">Win Progress</span>
              <span className="text-[#F5F5DC] font-bold">{userStats.wins} / {userStats.totalPredictions}</span>
            </div>
            <div className="h-2 bg-white/10 rounded-full overflow-hidden">
              <motion.div
                className="h-full bg-gradient-to-r from-[#4ADE80] to-[#22C55E] rounded-full"
                initial={{ width: 0 }}
                animate={{ width: `${userStats.winRate}%` }}
                transition={{ duration: 1, ease: "easeOut" }}
              />
            </div>
          </div>
        )}
      </div>
    </motion.div>
  );
}

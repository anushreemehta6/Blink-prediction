'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import {
  History, TrendingUp, TrendingDown, ExternalLink,
  Clock, Trophy, XCircle, RefreshCw, ArrowUpRight, ArrowDownRight,
  Sparkles, CircleDot
} from 'lucide-react';
import { type Address } from 'viem';
import { motion, AnimatePresence } from 'framer-motion';

interface RecentRoundsProps {
  address: Address;
}

interface BetHistoryItem {
  _id: string;
  positionId: number;
  targetPrice?: string;
  entryPrice?: string;
  multiplier?: number;
  amount: string;
  isUpward: boolean;
  status: 'OPEN' | 'WON' | 'LOST';
  payout?: string;
  txHash: string;
  createdAt: string;
}

export default function RecentRounds({ address }: RecentRoundsProps) {
  const [bets, setBets] = useState<BetHistoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [newWinId, setNewWinId] = useState<string | null>(null);
  const [newLossId, setNewLossId] = useState<string | null>(null);
  const prevBetsRef = useRef<BetHistoryItem[]>([]);

  const fetchHistory = useCallback(async (silent = false) => {
    if (!silent) setIsRefreshing(true);
    try {
      const res = await fetch(`/api/predictions/history?address=${address}&limit=10`, {
        cache: 'no-store',
        headers: { 'Pragma': 'no-cache' }
      });
      if (res.ok) {
        const data = await res.json();
        const newBets = data.predictions || [];

        // Check for status changes (OPEN -> WON or OPEN -> LOST)
        if (prevBetsRef.current.length > 0) {
          newBets.forEach((bet: BetHistoryItem) => {
            const prevBet = prevBetsRef.current.find(b => b._id === bet._id);
            if (prevBet && prevBet.status === 'OPEN') {
              if (bet.status === 'WON') {
                setNewWinId(bet._id);
                setTimeout(() => setNewWinId(null), 3000);
              } else if (bet.status === 'LOST') {
                setNewLossId(bet._id);
                setTimeout(() => setNewLossId(null), 3000);
              }
            }
          });
        }

        prevBetsRef.current = newBets;
        setBets(newBets);
      }
    } catch (error) {
      console.error('Failed to fetch history:', error);
    } finally {
      setLoading(false);
      setIsRefreshing(false);
    }
  }, [address]);

  useEffect(() => {
    if (address) {
      fetchHistory();
      const interval = setInterval(() => fetchHistory(true), 5000);
      return () => clearInterval(interval);
    }
  }, [address, fetchHistory]);

  // Calculate summary stats
  const openCount = bets.filter(b => b.status === 'OPEN').length;
  const wonCount = bets.filter(b => b.status === 'WON').length;
  const lostCount = bets.filter(b => b.status === 'LOST').length;

  if (loading) return (
    <div className="bg-[#082832] rounded-3xl p-6 shadow-2xl border border-[#0A696C]/30 relative overflow-hidden min-h-[500px]">
      <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-[#0A696C] to-transparent" />
      <div className="absolute -top-20 -right-20 w-40 h-40 bg-[#0A696C]/10 rounded-full blur-3xl" />

      <div className="relative z-10 flex flex-col items-center justify-center h-full min-h-[400px]">
        <div className="relative">
          <div className="w-16 h-16 rounded-full border-4 border-[#0A696C]/30 border-t-[#0A696C] animate-spin" />
          <History className="absolute inset-0 m-auto text-[#0A696C]" size={24} />
        </div>
        <p className="text-[#A1BCBD] font-bold mt-4">Loading History...</p>
        <p className="text-[#A1BCBD]/50 text-xs mt-1">Syncing with blockchain</p>
      </div>
    </div>
  );

  return (
    <motion.div
      className="bg-[#082832] rounded-3xl p-6 shadow-2xl border border-[#0A696C]/30 relative overflow-hidden"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay: 0.1 }}
    >
      {/* Decorative top gradient line */}
      <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-[#0A696C] to-transparent" />

      {/* Decorative glow */}
      <div className="absolute -top-20 -right-20 w-40 h-40 bg-[#0A696C]/10 rounded-full blur-3xl" />

      <div className="relative z-10">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <motion.div
              className="p-3 bg-[#0A696C] rounded-2xl"
              whileHover={{ scale: 1.1, rotate: -5 }}
              whileTap={{ scale: 0.95 }}
            >
              <History className="text-white" size={24} />
            </motion.div>
            <div>
              <h3 className="text-xl font-bold text-white">Trade History</h3>
              <p className="text-xs text-[#A1BCBD]/60">Recent predictions</p>
            </div>
          </div>
          <motion.button
            onClick={() => fetchHistory()}
            disabled={isRefreshing}
            className="p-2.5 bg-[#0A696C]/20 hover:bg-[#0A696C]/40 rounded-xl text-[#A1BCBD] transition-all border border-[#0A696C]/30"
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.9 }}
          >
            <RefreshCw size={18} className={isRefreshing ? 'animate-spin' : ''} />
          </motion.button>
        </div>

        {/* Quick Stats Bar */}
        <div className="flex gap-2 mb-6">
          <motion.div
            className="flex-1 bg-yellow-500/10 border border-yellow-500/20 rounded-xl px-3 py-2 flex items-center justify-center gap-2"
            whileHover={{ scale: 1.05, backgroundColor: 'rgba(234, 179, 8, 0.2)' }}
          >
            <Clock size={14} className="text-yellow-500" />
            <motion.span
              className="text-xs font-bold text-yellow-500"
              key={openCount}
              initial={{ scale: 1.5 }}
              animate={{ scale: 1 }}
            >
              {openCount} Open
            </motion.span>
          </motion.div>
          <motion.div
            className="flex-1 bg-green-500/10 border border-green-500/20 rounded-xl px-3 py-2 flex items-center justify-center gap-2"
            whileHover={{ scale: 1.05, backgroundColor: 'rgba(34, 197, 94, 0.2)' }}
            animate={newWinId ? { scale: [1, 1.1, 1], boxShadow: ['0 0 0px #22c55e', '0 0 20px #22c55e', '0 0 0px #22c55e'] } : {}}
            transition={{ duration: 0.5 }}
          >
            <Trophy size={14} className="text-green-500" />
            <motion.span
              className="text-xs font-bold text-green-500"
              key={wonCount}
              initial={{ scale: 1.5 }}
              animate={{ scale: 1 }}
            >
              {wonCount} Won
            </motion.span>
          </motion.div>
          <motion.div
            className="flex-1 bg-red-500/10 border border-red-500/20 rounded-xl px-3 py-2 flex items-center justify-center gap-2"
            whileHover={{ scale: 1.05, backgroundColor: 'rgba(239, 68, 68, 0.2)' }}
            animate={newLossId ? { scale: [1, 1.1, 1], boxShadow: ['0 0 0px #ef4444', '0 0 20px #ef4444', '0 0 0px #ef4444'] } : {}}
            transition={{ duration: 0.5 }}
          >
            <XCircle size={14} className="text-red-500" />
            <motion.span
              className="text-xs font-bold text-red-500"
              key={lostCount}
              initial={{ scale: 1.5 }}
              animate={{ scale: 1 }}
            >
              {lostCount} Lost
            </motion.span>
          </motion.div>
        </div>

        {/* Trades List */}
        <div className="space-y-3 max-h-[420px] overflow-y-auto pr-1 custom-scrollbar">
          <AnimatePresence mode="popLayout">
            {bets.length === 0 ? (
              <motion.div
                className="flex flex-col items-center justify-center py-12 text-center"
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.8 }}
              >
                <motion.div
                  className="p-4 bg-[#0A696C]/10 rounded-full mb-4"
                  animate={{ rotate: [0, 10, -10, 0] }}
                  transition={{ duration: 2, repeat: Infinity, repeatDelay: 3 }}
                >
                  <Sparkles className="text-[#0A696C]" size={32} />
                </motion.div>
                <p className="text-white font-bold">No trades yet</p>
                <p className="text-[#A1BCBD]/50 text-sm mt-1">Your predictions will appear here</p>
              </motion.div>
            ) : (
              bets.map((bet, index) => {
                const isWon = bet.status === 'WON';
                const isLost = bet.status === 'LOST';
                const isOpen = bet.status === 'OPEN';
                const isNewWin = bet._id === newWinId;
                const isNewLoss = bet._id === newLossId;

                return (
                  <motion.div
                    key={bet._id}
                    layout
                    initial={{ opacity: 0, x: -50, scale: 0.8 }}
                    animate={{
                      opacity: isLost && !isNewLoss ? 0.6 : 1,
                      x: 0,
                      scale: 1,
                    }}
                    exit={{ opacity: 0, x: 50, scale: 0.8 }}
                    transition={{
                      duration: 0.4,
                      delay: index * 0.05,
                      layout: { duration: 0.3 }
                    }}
                    className={`relative rounded-2xl transition-all duration-300 overflow-hidden ${
                      isOpen
                        ? 'bg-[#0A696C]/10 border-2 border-[#0A696C]/50'
                        : isWon
                          ? 'bg-green-500/5 border border-green-500/20'
                          : 'bg-red-500/5 border border-red-500/10'
                    }`}
                  >
                    {/* Win celebration overlay */}
                    <AnimatePresence>
                      {isNewWin && (
                        <motion.div
                          className="absolute inset-0 z-10 pointer-events-none"
                          initial={{ opacity: 0 }}
                          animate={{ opacity: 1 }}
                          exit={{ opacity: 0 }}
                        >
                          <motion.div
                            className="absolute inset-0 bg-green-500/30"
                            animate={{ opacity: [0.5, 0.2, 0.5, 0.2, 0] }}
                            transition={{ duration: 2 }}
                          />
                          {/* Confetti particles */}
                          {[...Array(12)].map((_, i) => (
                            <motion.div
                              key={i}
                              className="absolute w-2 h-2 rounded-full"
                              style={{
                                backgroundColor: ['#4ADE80', '#22C55E', '#F5F5DC', '#0A696C'][i % 4],
                                left: '50%',
                                top: '50%'
                              }}
                              initial={{ scale: 0 }}
                              animate={{
                                x: (Math.random() - 0.5) * 200,
                                y: (Math.random() - 0.5) * 100,
                                scale: [0, 1, 0],
                                rotate: Math.random() * 360
                              }}
                              transition={{
                                duration: 1.5,
                                delay: i * 0.05,
                                ease: "easeOut"
                              }}
                            />
                          ))}
                          {/* WIN badge */}
                          <motion.div
                            className="absolute inset-0 flex items-center justify-center"
                            initial={{ scale: 0, rotate: -20 }}
                            animate={{ scale: [0, 1.3, 1], rotate: [-20, 10, 0] }}
                            exit={{ scale: 0, opacity: 0 }}
                            transition={{ duration: 0.5, delay: 0.2 }}
                          >
                            <div className="bg-green-500 text-white px-4 py-2 rounded-xl font-black text-lg shadow-lg shadow-green-500/50 flex items-center gap-2">
                              <Trophy size={20} />
                              WIN!
                            </div>
                          </motion.div>
                        </motion.div>
                      )}
                    </AnimatePresence>

                    {/* Loss animation overlay */}
                    <AnimatePresence>
                      {isNewLoss && (
                        <motion.div
                          className="absolute inset-0 z-10 pointer-events-none"
                          initial={{ opacity: 0 }}
                          animate={{ opacity: 1 }}
                          exit={{ opacity: 0 }}
                        >
                          <motion.div
                            className="absolute inset-0 bg-red-500/30"
                            animate={{ opacity: [0.5, 0.1, 0.5, 0.1, 0] }}
                            transition={{ duration: 1.5 }}
                          />
                          {/* Shake the card */}
                          <motion.div
                            className="absolute inset-0 flex items-center justify-center"
                            initial={{ scale: 0 }}
                            animate={{ scale: [0, 1.2, 1], x: [0, -10, 10, -10, 10, 0] }}
                            exit={{ scale: 0, opacity: 0 }}
                            transition={{ duration: 0.6 }}
                          >
                            <div className="bg-red-500 text-white px-4 py-2 rounded-xl font-black text-lg shadow-lg shadow-red-500/50 flex items-center gap-2">
                              <XCircle size={20} />
                              LOSS
                            </div>
                          </motion.div>
                        </motion.div>
                      )}
                    </AnimatePresence>

                    {/* Status indicator line */}
                    <motion.div
                      className={`absolute left-0 top-0 bottom-0 w-1 ${
                        isOpen ? 'bg-[#0A696C]' : isWon ? 'bg-green-500' : 'bg-red-500'
                      }`}
                      layoutId={`indicator-${bet._id}`}
                      animate={isNewWin ? { boxShadow: '0 0 10px #22c55e' } : isNewLoss ? { boxShadow: '0 0 10px #ef4444' } : {}}
                    />

                    <div className="p-4 pl-5">
                      {/* Top Row - Status & Amount */}
                      <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center gap-2">
                          {/* Direction Icon */}
                          <motion.div
                            className={`p-1.5 rounded-lg ${
                              bet.isUpward
                                ? 'bg-green-500/20'
                                : 'bg-red-500/20'
                            }`}
                            whileHover={{ scale: 1.2, rotate: bet.isUpward ? 15 : -15 }}
                          >
                            {bet.isUpward
                              ? <ArrowUpRight size={16} className="text-green-500" />
                              : <ArrowDownRight size={16} className="text-red-500" />
                            }
                          </motion.div>

                          {/* Status Badge */}
                          <motion.div
                            className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold uppercase ${
                              isOpen
                                ? 'bg-[#0A696C] text-white'
                                : isWon
                                  ? 'bg-green-500/20 text-green-400'
                                  : 'bg-red-500/20 text-red-400'
                            }`}
                            animate={isOpen ? { scale: [1, 1.05, 1] } : {}}
                            transition={{ duration: 1.5, repeat: isOpen ? Infinity : 0 }}
                          >
                            {isOpen ? (
                              <>
                                <motion.div
                                  animate={{ opacity: [1, 0.3, 1] }}
                                  transition={{ duration: 1, repeat: Infinity }}
                                >
                                  <CircleDot size={10} />
                                </motion.div>
                                LIVE
                              </>
                            ) : isWon ? (
                              <>
                                <motion.div
                                  animate={isNewWin ? { rotate: [0, 20, -20, 0], scale: [1, 1.3, 1] } : {}}
                                  transition={{ duration: 0.5, repeat: isNewWin ? 3 : 0 }}
                                >
                                  <Trophy size={10} />
                                </motion.div>
                                WON
                              </>
                            ) : (
                              <>
                                <XCircle size={10} />
                                LOST
                              </>
                            )}
                          </motion.div>

                          {/* Position ID */}
                          <span className="text-[10px] font-mono text-[#A1BCBD]/50">
                            #{bet.positionId.toString().slice(-4)}
                          </span>
                        </div>

                        {/* Multiplier */}
                        <div className="text-right">
                          <span className="text-sm font-black text-white">${bet.amount}</span>
                          <span className="text-xs text-[#0A696C] ml-1 font-bold">{bet.multiplier?.toFixed(1)}x</span>
                        </div>
                      </div>

                      {/* Middle Row - Target & Payout */}
                      <div className="flex items-end justify-between">
                        <div>
                          <div className="text-[10px] text-[#A1BCBD]/50 font-medium mb-0.5">Target Price</div>
                          <div className="flex items-center gap-1.5">
                            <span className="text-lg font-black text-white">
                              ${parseFloat(bet.targetPrice || '0').toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                            </span>
                            {bet.isUpward
                              ? <TrendingUp size={16} className="text-green-500" />
                              : <TrendingDown size={16} className="text-red-500" />
                            }
                          </div>
                        </div>

                        <div className="text-right">
                          <div className="text-[10px] text-[#A1BCBD]/50 font-medium mb-0.5">
                            {isWon ? 'Payout' : isOpen ? 'Potential' : 'Result'}
                          </div>
                          <motion.div
                            className={`text-lg font-black ${
                              isWon ? 'text-green-400' : isLost ? 'text-red-400/50' : 'text-[#F5F5DC]'
                            }`}
                            animate={isNewWin ? {
                              scale: [1, 1.2, 1],
                              textShadow: ['0 0 0px #4ADE80', '0 0 20px #4ADE80', '0 0 0px #4ADE80']
                            } : {}}
                            transition={{ duration: 0.5, repeat: isNewWin ? 3 : 0 }}
                          >
                            {isWon
                              ? `+$${parseFloat(bet.payout || '0').toFixed(2)}`
                              : isOpen
                                ? `$${(parseFloat(bet.amount) * (bet.multiplier || 0)).toFixed(2)}`
                                : '$0.00'
                            }
                          </motion.div>
                        </div>
                      </div>

                      {/* Bottom Row - Time & TX Link */}
                      <div className="flex items-center justify-between mt-3 pt-3 border-t border-white/5">
                        <div className="flex items-center gap-1.5 text-[#A1BCBD]/40">
                          <Clock size={10} />
                          <span className="text-[10px] font-medium">
                            {new Date(bet.createdAt).toLocaleString([], {
                              month: 'short',
                              day: 'numeric',
                              hour: '2-digit',
                              minute: '2-digit'
                            })}
                          </span>
                        </div>
                        {bet.txHash && (
                          <motion.a
                            href={`https://testnet.monadvision.com/tx/${bet.txHash}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex items-center gap-1 text-[10px] font-bold text-[#0A696C] hover:text-[#A1BCBD] transition-colors"
                            whileHover={{ scale: 1.1, x: 3 }}
                          >
                            View TX
                            <ExternalLink size={10} />
                          </motion.a>
                        )}
                      </div>
                    </div>
                  </motion.div>
                );
              })
            )}
          </AnimatePresence>
        </div>

        {/* Bottom fade effect */}
        {bets.length > 4 && (
          <div className="absolute bottom-0 left-0 right-0 h-16 bg-gradient-to-t from-[#082832] to-transparent pointer-events-none" />
        )}
      </div>
    </motion.div>
  );
}

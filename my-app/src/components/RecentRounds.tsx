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
    <div className="bg-[var(--bg-panel)] rounded-xl p-6 border border-[var(--border-subtle)] relative overflow-hidden min-h-[320px]">
      <div className="absolute top-0 left-0 w-full h-0.5 bg-gradient-to-r from-transparent via-[var(--accent-green)] to-transparent" />
      <div className="relative z-10 flex flex-col items-center justify-center min-h-[280px]">
        <div className="relative">
          <div className="w-14 h-14 rounded-full border-2 border-[var(--border-subtle)] border-t-[var(--accent-green)] animate-spin" />
          <History className="absolute inset-0 m-auto text-[var(--accent-green)]" size={20} />
        </div>
        <p className="text-[var(--text-muted)] font-bold font-[family-name:var(--font-mono)] mt-4 text-sm">Loading…</p>
        <p className="text-[var(--text-dim)] text-[11px] mt-1 font-[family-name:var(--font-mono)]">Syncing</p>
      </div>
    </div>
  );

  return (
    <motion.div
      className="bg-[var(--bg-panel)] rounded-xl p-5 border border-[var(--border-subtle)] relative overflow-hidden"
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, delay: 0.05 }}
    >
      <div className="absolute top-0 left-0 w-full h-0.5 bg-gradient-to-r from-transparent via-[var(--accent-green)] to-transparent" />
      <div className="relative z-10">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2.5">
            <motion.div
              className="p-2.5 bg-[var(--accent-green)]/15 rounded-lg"
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
            >
              <History className="text-[var(--accent-green)]" size={20} />
            </motion.div>
            <div>
              <h3 className="text-base font-bold text-[var(--text-primary)] font-[family-name:var(--font-display)]" style={{ fontFamily: 'var(--font-display)' }}>Trade History</h3>
              <p className="text-[11px] text-[var(--text-dim)] font-[family-name:var(--font-mono)]">Recent</p>
            </div>
          </div>
          <motion.button
            onClick={() => fetchHistory()}
            disabled={isRefreshing}
            className="p-2 rounded-lg bg-[var(--bg-elevated)] border border-[var(--border-subtle)] text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:border-[var(--border-strong)] transition-all"
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
          >
            <RefreshCw size={16} className={isRefreshing ? 'animate-spin' : ''} />
          </motion.button>
        </div>

        <div className="flex gap-1.5 mb-4">
          <motion.div
            className="flex-1 bg-[var(--accent-amber-dim)] border border-[var(--accent-amber)]/30 rounded-lg px-2.5 py-1.5 flex items-center justify-center gap-1.5"
            whileHover={{ scale: 1.03 }}
          >
            <Clock size={12} className="text-[var(--accent-amber)]" />
            <motion.span className="text-[11px] font-bold font-[family-name:var(--font-mono)] text-[var(--accent-amber)]" key={openCount} initial={{ scale: 1.2 }} animate={{ scale: 1 }}>
              {openCount} Open
            </motion.span>
          </motion.div>
          <motion.div
            className="flex-1 bg-[var(--accent-green-dim)] border border-[var(--accent-green)]/30 rounded-lg px-2.5 py-1.5 flex items-center justify-center gap-1.5"
            whileHover={{ scale: 1.03 }}
            animate={newWinId ? { scale: [1, 1.08, 1], boxShadow: ['0 0 0 var(--accent-green)', '0 0 14px var(--accent-green)', '0 0 0 var(--accent-green)'] } : {}}
            transition={{ duration: 0.5 }}
          >
            <Trophy size={12} className="text-[var(--accent-green)]" />
            <motion.span className="text-[11px] font-bold font-[family-name:var(--font-mono)] text-[var(--accent-green)]" key={wonCount} initial={{ scale: 1.2 }} animate={{ scale: 1 }}>
              {wonCount} Won
            </motion.span>
          </motion.div>
          <motion.div
            className="flex-1 bg-[var(--accent-red-dim)] border border-[var(--accent-red)]/30 rounded-lg px-2.5 py-1.5 flex items-center justify-center gap-1.5"
            whileHover={{ scale: 1.03 }}
            animate={newLossId ? { scale: [1, 1.08, 1], boxShadow: ['0 0 0 var(--accent-red)', '0 0 14px var(--accent-red)', '0 0 0 var(--accent-red)'] } : {}}
            transition={{ duration: 0.5 }}
          >
            <XCircle size={12} className="text-[var(--accent-red)]" />
            <motion.span className="text-[11px] font-bold font-[family-name:var(--font-mono)] text-[var(--accent-red)]" key={lostCount} initial={{ scale: 1.2 }} animate={{ scale: 1 }}>
              {lostCount} Lost
            </motion.span>
          </motion.div>
        </div>

        <div className="space-y-2 max-h-[360px] overflow-y-auto pr-1 custom-scrollbar">
          <AnimatePresence mode="popLayout">
            {bets.length === 0 ? (
              <motion.div
                className="flex flex-col items-center justify-center py-10 text-center"
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.9 }}
              >
                <motion.div
                  className="p-3 bg-[var(--accent-green)]/10 rounded-full mb-3"
                  animate={{ rotate: [0, 8, -8, 0] }}
                  transition={{ duration: 2, repeat: Infinity, repeatDelay: 3 }}
                >
                  <Sparkles className="text-[var(--accent-green)]" size={24} />
                </motion.div>
                <p className="text-[var(--text-primary)] font-bold font-[family-name:var(--font-mono)] text-sm">No trades yet</p>
                <p className="text-[var(--text-dim)] text-[11px] mt-1 font-[family-name:var(--font-mono)]">Predictions appear here</p>
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
                    className={`relative rounded-xl transition-all duration-300 overflow-hidden ${
                      isOpen
                        ? 'bg-[var(--accent-green)]/10 border-2 border-[var(--accent-green)]/40'
                        : isWon
                          ? 'bg-[var(--accent-green)]/5 border border-[var(--accent-green)]/20'
                          : 'bg-[var(--accent-red)]/5 border border-[var(--accent-red)]/20'
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
                            className="absolute inset-0 bg-[var(--accent-green)]/25"
                            animate={{ opacity: [0.5, 0.2, 0.5, 0.2, 0] }}
                            transition={{ duration: 2 }}
                          />
                          {[...Array(12)].map((_, i) => (
                            <motion.div
                              key={i}
                              className="absolute w-2 h-2 rounded-full"
                              style={{
                                backgroundColor: ['#00d26a', '#22c55e', '#e6edf3', '#f59e0b'][i % 4],
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
                            <div className="bg-[var(--accent-green)] text-[var(--bg-deep)] px-4 py-2 rounded-lg font-black text-base font-[family-name:var(--font-mono)] flex items-center gap-2">
                              <Trophy size={18} />
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
                            className="absolute inset-0 bg-[var(--accent-red)]/25"
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
                            <div className="bg-[var(--accent-red)] text-white px-4 py-2 rounded-lg font-black text-base font-[family-name:var(--font-mono)] flex items-center gap-2">
                              <XCircle size={18} />
                              LOSS
                            </div>
                          </motion.div>
                        </motion.div>
                      )}
                    </AnimatePresence>

                    <motion.div
                      className={`absolute left-0 top-0 bottom-0 w-1 ${
                        isOpen ? 'bg-[var(--accent-green)]' : isWon ? 'bg-[var(--accent-green)]' : 'bg-[var(--accent-red)]'
                      }`}
                      layoutId={`indicator-${bet._id}`}
                      animate={isNewWin ? { boxShadow: '0 0 10px var(--accent-green)' } : isNewLoss ? { boxShadow: '0 0 10px var(--accent-red)' } : {}}
                    />

                    <div className="p-3 pl-4">
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2">
                          <motion.div
                            className={`p-1 rounded-md ${bet.isUpward ? 'bg-[var(--accent-green)]/20' : 'bg-[var(--accent-red)]/20'}`}
                            whileHover={{ scale: 1.1 }}
                          >
                            {bet.isUpward ? <ArrowUpRight size={14} className="text-[var(--accent-green)]" /> : <ArrowDownRight size={14} className="text-[var(--accent-red)]" />}
                          </motion.div>
                          <motion.div
                            className={`flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-bold font-[family-name:var(--font-mono)] uppercase ${
                              isOpen ? 'bg-[var(--accent-green)]/20 text-[var(--accent-green)]' : isWon ? 'bg-[var(--accent-green)]/15 text-[var(--accent-green)]' : 'bg-[var(--accent-red)]/15 text-[var(--accent-red)]'
                            }`}
                            animate={isOpen ? { scale: [1, 1.03, 1] } : {}}
                            transition={{ duration: 1.5, repeat: isOpen ? Infinity : 0 }}
                          >
                            {isOpen ? (
                              <>
                                <motion.div animate={{ opacity: [1, 0.4, 1] }} transition={{ duration: 1, repeat: Infinity }}><CircleDot size={9} /></motion.div>
                                LIVE
                              </>
                            ) : isWon ? (
                              <>
                                <motion.div animate={isNewWin ? { rotate: [0, 15, -15, 0], scale: [1, 1.2, 1] } : {}} transition={{ duration: 0.5, repeat: isNewWin ? 3 : 0 }}><Trophy size={9} /></motion.div>
                                WON
                              </>
                            ) : (
                              <><XCircle size={9} /> LOST</>
                            )}
                          </motion.div>
                          <span className="text-[10px] font-[family-name:var(--font-mono)] text-[var(--text-dim)]">#{bet.positionId.toString().slice(-4)}</span>
                        </div>
                        <div className="text-right">
                          <span className="text-sm font-bold font-[family-name:var(--font-mono)] text-[var(--text-primary)]">${bet.amount}</span>
                          <span className="text-[10px] text-[var(--accent-green)] font-bold ml-1">{bet.multiplier?.toFixed(1)}x</span>
                        </div>
                      </div>
                      <div className="flex items-end justify-between">
                        <div>
                          <div className="text-[10px] text-[var(--text-dim)] font-[family-name:var(--font-mono)] mb-0.5">Target</div>
                          <div className="flex items-center gap-1.5">
                            <span className="text-base font-bold font-[family-name:var(--font-mono)] text-[var(--text-primary)]">
                              ${parseFloat(bet.targetPrice || '0').toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                            </span>
                            {bet.isUpward ? <TrendingUp size={14} className="text-[var(--accent-green)]" /> : <TrendingDown size={14} className="text-[var(--accent-red)]" />}
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="text-[10px] text-[var(--text-dim)] font-[family-name:var(--font-mono)] mb-0.5">{isWon ? 'Payout' : isOpen ? 'Potential' : 'Result'}</div>
                          <motion.div
                            className={`text-base font-bold font-[family-name:var(--font-mono)] ${isWon ? 'text-[var(--accent-green)]' : isLost ? 'text-[var(--accent-red)]/60' : 'text-[var(--text-muted)]'}`}
                            animate={isNewWin ? { scale: [1, 1.15, 1] } : {}}
                            transition={{ duration: 0.5, repeat: isNewWin ? 3 : 0 }}
                          >
                            {isWon ? `+$${parseFloat(bet.payout || '0').toFixed(2)}` : isOpen ? `$${(parseFloat(bet.amount) * (bet.multiplier || 0)).toFixed(2)}` : '$0.00'}
                          </motion.div>
                        </div>
                      </div>
                      <div className="flex items-center justify-between mt-2 pt-2 border-t border-[var(--border-subtle)]">
                        <div className="flex items-center gap-1.5 text-[var(--text-dim)]">
                          <Clock size={10} />
                          <span className="text-[10px] font-[family-name:var(--font-mono)]">
                            {new Date(bet.createdAt).toLocaleString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                          </span>
                        </div>
                        {bet.txHash && (
                          <motion.a
                            href={`https://testnet.monadvision.com/tx/${bet.txHash}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex items-center gap-1 text-[10px] font-bold font-[family-name:var(--font-mono)] text-[var(--accent-green)] hover:underline"
                            whileHover={{ x: 2 }}
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

        {bets.length > 4 && (
          <div className="absolute bottom-0 left-0 right-0 h-12 bg-gradient-to-t from-[var(--bg-panel)] to-transparent pointer-events-none" />
        )}
      </div>
    </motion.div>
  );
}

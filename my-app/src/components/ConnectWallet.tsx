'use client';

import { useState, useEffect } from 'react';
import { useWallet } from '@/context/WalletContext';
import { switchToMonadTestnet, isMonadTestnet, formatChainId } from '@/lib/networkUtils';
import { toast } from 'react-hot-toast';

export default function ConnectWallet() {
  const {
    address,
    balance,
    chainId,
    isConnected,
    isConnecting,
    isFlask,
    connectWallet,
    disconnect,
    provider,
  } = useWallet();

  const [showDropdown, setShowDropdown] = useState(false);
  const [isSwitchingNetwork, setIsSwitchingNetwork] = useState(false);
  const wrongNetwork = isConnected && chainId && !isMonadTestnet(chainId);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (showDropdown && !target.closest('.wallet-dropdown')) setShowDropdown(false);
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [showDropdown]);

  const handleSwitchNetwork = async () => {
    if (!provider) {
      toast.error('No wallet provider found');
      return;
    }
    setIsSwitchingNetwork(true);
    try {
      await switchToMonadTestnet(provider);
      toast.success('Switched to Monad Testnet');
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to switch network';
      toast.error(msg);
    } finally {
      setIsSwitchingNetwork(false);
    }
  };

  if (!isConnected) {
    return (
      <button
        onClick={connectWallet}
        disabled={isConnecting || !isFlask}
        className="flex items-center gap-2 bg-[var(--accent-green)] text-[var(--bg-deep)] font-[family-name:var(--font-mono)] font-bold px-4 py-2.5 rounded-lg border-0 transition-all duration-200 hover:brightness-110 active:scale-[0.98] disabled:opacity-50 disabled:cursor-wait disabled:hover:brightness-100"
        style={{ fontFamily: 'var(--font-mono)' }}
      >
        {!isFlask ? (
          <>
            <span>⚠</span>
            <span className="hidden sm:inline">Install Flask</span>
            <span className="sm:hidden">Flask</span>
          </>
        ) : isConnecting ? (
          <>
            <div className="w-4 h-4 border-2 border-[var(--bg-deep)] border-t-transparent rounded-full animate-spin" />
            <span className="hidden sm:inline">Connecting…</span>
          </>
        ) : (
          <>
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9a9 9 0 01-9-9m9 9c1.657 0 3-4.03 3-9s-1.343-9-3-9m0 18c-1.657 0-3-4.03-3-9s1.343-9 3-9m-9 9a9 9 0 019-9" />
            </svg>
            <span className="hidden sm:inline">Connect</span>
          </>
        )}
      </button>
    );
  }

  return (
    <div className="relative wallet-dropdown">
      {wrongNetwork && (
        <button
          onClick={handleSwitchNetwork}
          disabled={isSwitchingNetwork}
          className="mr-2 flex items-center gap-2 bg-[var(--accent-red)] text-white px-3 py-2 rounded-lg font-bold text-xs font-[family-name:var(--font-mono)] transition-all disabled:opacity-60"
          style={{ fontFamily: 'var(--font-mono)' }}
        >
          {isSwitchingNetwork ? (
            <>
              <div className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin" />
              <span className="hidden sm:inline">Switching…</span>
            </>
          ) : (
            <>
              <span>⚠</span>
              <span className="hidden sm:inline">Wrong network</span>
            </>
          )}
        </button>
      )}

      <button
        onClick={() => setShowDropdown(!showDropdown)}
        className={`flex items-center gap-2 pl-2 pr-3 py-2 rounded-lg transition-all duration-200 font-[family-name:var(--font-mono)] ${
          wrongNetwork ? 'bg-[var(--accent-red-dim)] border border-[var(--accent-red)]/40' : 'bg-[var(--bg-elevated)] border border-[var(--border-subtle)] hover:border-[var(--border-strong)]'
        }`}
        style={{ fontFamily: 'var(--font-mono)' }}
      >
        <div className="w-8 h-8 rounded-md bg-[var(--accent-green)]/20 flex items-center justify-center text-[var(--accent-green)] font-bold text-sm">
          {address?.slice(2, 4).toUpperCase()}
        </div>
        <div className="text-left hidden sm:block">
          <div className="text-xs font-bold text-[var(--text-primary)]">{balance} MON</div>
          <div className="text-[10px] text-[var(--text-dim)]">{address?.slice(0, 6)}…{address?.slice(-4)}</div>
        </div>
        <svg
          className={`w-4 h-4 text-[var(--text-dim)] transition-transform hidden sm:block ${showDropdown ? 'rotate-180' : ''}`}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {showDropdown && (
        <div className="mt-2 absolute right-0 w-72 bg-[var(--bg-panel)] border border-[var(--border-subtle)] rounded-xl shadow-xl overflow-hidden z-50">
          <div className="p-4 border-b border-[var(--border-subtle)]">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-[var(--accent-green)]/20 flex items-center justify-center text-[var(--accent-green)] font-bold text-sm font-[family-name:var(--font-mono)]">
                {address?.slice(2, 4).toUpperCase()}
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-sm font-bold text-[var(--text-primary)] font-[family-name:var(--font-mono)] truncate">
                  {address?.slice(0, 10)}…{address?.slice(-8)}
                </div>
                <button
                  onClick={() => {
                    if (address) {
                      navigator.clipboard.writeText(address);
                      toast.success('Address copied');
                    }
                  }}
                  className="text-[11px] text-[var(--accent-green)] hover:underline font-[family-name:var(--font-mono)]"
                  style={{ fontFamily: 'var(--font-mono)' }}
                >
                  Copy address
                </button>
              </div>
            </div>
          </div>
          <div className="p-4 space-y-3 text-sm font-[family-name:var(--font-mono)]" style={{ fontFamily: 'var(--font-mono)' }}>
            <div className="flex justify-between">
              <span className="text-[var(--text-dim)]">Network</span>
              <span className={wrongNetwork ? 'text-[var(--accent-red)] font-bold' : 'text-[var(--accent-green)]'}>
                {wrongNetwork ? `Chain ${formatChainId(chainId)}` : 'Monad Testnet'}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-[var(--text-dim)]">Balance</span>
              <span className="font-bold text-[var(--text-primary)]">{balance} MON</span>
            </div>
            <div className="flex justify-between">
              <span className="text-[var(--text-dim)]">Wallet</span>
              <span className="text-[var(--text-muted)]">{isFlask ? 'MetaMask Flask' : 'MetaMask'}</span>
            </div>
          </div>
          <div className="p-4 pt-0 space-y-2">
            {wrongNetwork && (
              <button
                onClick={handleSwitchNetwork}
                disabled={isSwitchingNetwork}
                className="w-full flex items-center justify-center gap-2 bg-[var(--accent-amber-dim)] text-[var(--accent-amber)] py-2.5 rounded-lg font-bold text-sm font-[family-name:var(--font-mono)] border border-[var(--accent-amber)]/30 hover:brightness-110 disabled:opacity-50"
                style={{ fontFamily: 'var(--font-mono)' }}
              >
                {isSwitchingNetwork ? (
                  <>
                    <div className="w-4 h-4 border-2 border-[var(--accent-amber)] border-t-transparent rounded-full animate-spin" />
                    Switching…
                  </>
                ) : (
                  'Switch to Monad Testnet'
                )}
              </button>
            )}
            <button
              onClick={() => {
                disconnect();
                setShowDropdown(false);
              }}
              className="w-full flex items-center justify-center gap-2 bg-[var(--bg-elevated)] text-[var(--text-muted)] py-2.5 rounded-lg font-bold text-sm border border-[var(--border-subtle)] hover:border-[var(--accent-red)]/40 hover:text-[var(--accent-red)] transition-all font-[family-name:var(--font-mono)]"
              style={{ fontFamily: 'var(--font-mono)' }}
            >
              Disconnect
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

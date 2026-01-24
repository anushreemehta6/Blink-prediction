'use client';

import { useState, useEffect, Fragment } from 'react';
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
    provider,
    connectWallet, 
    disconnect 
  } = useWallet();

  const [showDropdown, setShowDropdown] = useState(false);
  const [isSwitchingNetwork, setIsSwitchingNetwork] = useState(false);

  // Check if on wrong network
  const wrongNetwork = isConnected && chainId && !isMonadTestnet(chainId);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as HTMLElement;
      if (showDropdown && !target.closest('.wallet-dropdown')) {
        setShowDropdown(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [showDropdown]);

  const handleSwitchNetwork = async () => {
    if (!provider) {
      toast.error("No wallet provider found");
      return;
    }

    setIsSwitchingNetwork(true);
    try {
      await switchToMonadTestnet(provider);
      toast.success("Switched to Monad Testnet!");
    } catch (error: any) {
      console.error("Network switch error:", error);
      toast.error(error.message || "Failed to switch network");
    } finally {
      setIsSwitchingNetwork(false);
    }
  };

  // Not connected - show connect button
  if (!isConnected) {
    return (
      <button
        onClick={connectWallet}
        disabled={isConnecting || !isFlask}
        className="flex items-center gap-2 bg-gradient-to-r from-[#599BA5] to-[#A1BCBD] text-white  px-4 lg:px-6 py-2.5 lg:py-3 rounded-full font-bold transition-all duration-300 shadow-lg hover:shadow-xl hover:scale-105 disabled:opacity-60 disabled:cursor-wait disabled:scale-100 text-sm lg:text-base mr-4"
      >
        {!isFlask ? (
          <>
            <span>⚠️</span>
            <span className="hidden sm:inline">Install Flask</span>
            <span className="sm:hidden">Flask</span>
          </>
        ) : isConnecting ? (
          <>
            <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
            <span className="hidden sm:inline">Connecting...</span>
          </>
        ) : (
          <>
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9a9 9 0 01-9-9m9 9c1.657 0 3-4.03 3-9s-1.343-9-3-9m0 18c-1.657 0-3-4.03-3-9s1.343-9 3-9m-9 9a9 9 0 019-9" />
            </svg>
            <span className="hidden sm:inline">Connect Wallet</span>
            <span className="sm:hidden">Connect</span>
          </>
        )}
      </button>
    );
  }

  // Connected - show account dropdown
  return (
    <div className="relative wallet-dropdown">
      {/* Wrong Network Banner (if applicable) */}
      {wrongNetwork && (
        <button
          onClick={handleSwitchNetwork}
          disabled={isSwitchingNetwork}
          className="mr-2 flex items-center gap-2 bg-red-500 hover:bg-red-600 text-white px-3 py-2 rounded-lg font-bold text-xs transition-all shadow-lg disabled:opacity-60"
        >
          {isSwitchingNetwork ? (
            <>
              <div className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
              <span className="hidden sm:inline">Switching...</span>
            </>
          ) : (
            <>
              <span>⚠️</span>
              <span className="hidden sm:inline">Wrong Network</span>
            </>
          )}
        </button>
      )}

      {/* Account Button */}
      <button
        onClick={() => setShowDropdown(!showDropdown)}
        className={`flex items-center gap-2  pl-2 pr-3 py-2 rounded-full transition-all duration-300 ${
          wrongNetwork 
            ? 'bg-red-50 ' 
            : 'bg-gradient-to-r from-[#599BA5] to-[#A1BCBD]  hover:shadow-lg text-xl '
        }`}
      >
        
         <div className="w-12 h-12 rounded-full bg-gradient-to-br from-purple-400 to-blue-500 flex items-center justify-center text-2xl shadow-lg">
              B
            </div>
       
        <div className="text-left hidden sm:block">
          <div className="text-sm font-bold text-gray-800">
            {balance} MON
          </div>
          <div className="text-[10px] text-white/90">
            {address.slice(0, 4)}...{address.slice(-3)}
          </div>
        </div>
        <svg 
          className={`w-4 h-4 text-gray-500 transition-transform hidden sm:block ${showDropdown ? 'rotate-180' : ''}`} 
          fill="none" 
          stroke="currentColor" 
          viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {/* Dropdown Menu */}
      {showDropdown && (
        <div className="mt-6 absolute right-0  w-80 bg-[#6BA3AB]  border-10 border-[#0A696C] rounded-2xl shadow-2xl p-4 z-50 origin-top-right animate-in fade-in slide-in-from-top-2">
          {/* Profile Section */}
          <div className="flex items-center gap-3 pb-4 border-b border-gray-100">
            <div className="w-12 h-12 rounded-full bg-gradient-to-br from-purple-400 to-blue-500 flex items-center justify-center text-2xl shadow-lg">
              B
            </div>
            <div className="flex-1 min-w-0">
              <div className="font-bold text-gray-800 text-sm truncate">
                {address.slice(0, 8)}...{address.slice(-6)}
              </div>
              <button
                onClick={() => {
                  navigator.clipboard.writeText(address);
                  toast.success("Address copied!");
                }}
                className="text-xs text-white hover:text-blue-600 hover:underline flex items-center gap-1"
              >
                Copy Address
                <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                </svg>
              </button>
            </div>
          </div>

          {/* Stats Section */}
          <div className="py-4 space-y-3 text-sm">
            <div className="flex justify-between items-center">
              <span className="text-white">Network</span>
              <span className={`font-bold px-3 py-1 rounded-full text-sm ${
                wrongNetwork 
                  ? 'bg-red-100 text-red-600' 
                  : 'text-white'
              }`}>
                {wrongNetwork ? (
                  <>⚠️ Chain {formatChainId(chainId)}</>
                ) : (
                  <>✅ Monad Testnet</>
                )}
              </span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-white">Balance</span>
              <span className="font-bold text-gray-800">
                {balance} MON
              </span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-white">Wallet Type</span>
              <span className="font-bold text-white text-xs">
                {isFlask ? ' MetaMask Flask' : 'MetaMask'}
              </span>
            </div>
          </div>

          {/* Actions */}
          <div className="pt-4 border-t border-gray-100 space-y-2">
            {wrongNetwork && (
              <button
                onClick={handleSwitchNetwork}
                disabled={isSwitchingNetwork}
                className="w-full flex items-center justify-center gap-2 bg-orange-50 text-orange-600 py-2.5 rounded-xl hover:bg-orange-100 transition-all duration-200 font-bold text-sm disabled:opacity-50"
              >
                {isSwitchingNetwork ? (
                  <>
                    <div className="w-4 h-4 border-2 border-orange-600 border-t-transparent rounded-full animate-spin"></div>
                    Switching...
                  </>
                ) : (
                  <>
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
                    </svg>
                    Switch to Monad Testnet
                  </>
                )}
              </button>
            )}
            
            <button 
              onClick={() => { disconnect(); setShowDropdown(false); }} 
              className="w-full flex items-center justify-center gap-2 bg-gradient-to-r from-[#599BA5] to-[#A1BCBD] text-white py-2.5 rounded-full border border-black transition-all duration-200 font-bold text-sm"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
              </svg>
              Disconnect
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
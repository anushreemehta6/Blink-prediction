'use client';

import { useWallet } from '@/context/WalletContext';

export default function TestPage() {
  const { address, isConnected, isFlask,  connectWallet: connect, disconnect } = useWallet();

  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <div className="card max-w-md w-full space-y-4">
        <h1 className="text-2xl font-bold">Wallet Test</h1>
        
        <div className="space-y-2">
          <p>Flask Installed: {isFlask ? '✅' : '❌'}</p>
          <p>Connected: {isConnected ? '✅' : '❌'}</p>
          {address && (
            <p className="text-sm font-mono">
              {address.slice(0, 6)}...{address.slice(-4)}
            </p>
          )}
        </div>

        {!isConnected ? (
          <button onClick={connect} className="btn btn-primary w-full">
            Connect Flask
          </button>
        ) : (
          <button onClick={disconnect} className="btn btn-secondary w-full">
            Disconnect
          </button>
        )}
      </div>
    </div>
  );
}
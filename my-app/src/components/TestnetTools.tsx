'use client';

import { useState } from 'react';
import { useWallet } from '@/context/WalletContext';
import { createWalletClient, custom, parseUnits, type Address, type Chain } from 'viem';
import { USDC_ADDRESS, THIRTY_ENGINE_ADDRESS } from '@/lib/contracts/addresses';
import { toast } from 'react-hot-toast';
import { Wrench } from 'lucide-react';

// ✅ Define the Chain
const monadTestnet: Chain = {
  id: 10143,
  name: 'Monad Testnet',
  nativeCurrency: { name: 'MON', symbol: 'MON', decimals: 18 },
  rpcUrls: {
    default: { http: ['https://monad-testnet.drpc.org/'] },
    public: { http: ['https://monad-testnet.drpc.org/'] },
  },
};

const USDC_ABI = [
  {
    name: 'mint',
    type: 'function',
    inputs: [{ name: 'to', type: 'address' }, { name: 'amount', type: 'uint256' }],
    outputs: [],
    stateMutability: 'nonpayable'
  },
  {
    name: 'approve',
    type: 'function',
    inputs: [{ name: 'spender', type: 'address' }, { name: 'amount', type: 'uint256' }],
    outputs: [{ name: '', type: 'bool' }],
    stateMutability: 'nonpayable'
  }
] as const;

export default function TestnetTools() {
  const { address, isConnected } = useWallet();
  const [loading, setLoading] = useState(false);

  const handleSetup = async () => {
    if (!address || !window.ethereum) return;
    setLoading(true);
    const toastId = toast.loading('Setting up testnet account...');

    try {
      // ✅ Pass 'chain' here to fix the error
      const client = createWalletClient({
        chain: monadTestnet,
        transport: custom(window.ethereum)
      });

      // 1. Mint 1,000 USDC
      const mintHash = await client.writeContract({
        address: USDC_ADDRESS,
        abi: USDC_ABI,
        functionName: 'mint',
        args: [address as Address, parseUnits('1000', 6)],
        account: address as Address,
        chain: monadTestnet // ✅ Pass chain explicitly just to be safe
      });
      console.log("Mint Tx:", mintHash);
      toast.loading('Minted! Approving...', { id: toastId });

      // 2. Approve Contract (Max Uint256)
      const approveHash = await client.writeContract({
        address: USDC_ADDRESS,
        abi: USDC_ABI,
        functionName: 'approve',
        args: [THIRTY_ENGINE_ADDRESS, BigInt('115792089237316195423570985008687907853269984665640564039457584007913129639935')], 
        account: address as Address,
        chain: monadTestnet // ✅ Pass chain explicitly
      });
      console.log("Approve Tx:", approveHash);
      
      toast.success('Ready to trade! 🚀', { id: toastId });
    } catch (e: any) {
      console.error(e);
      toast.error('Setup failed: ' + (e.shortMessage || e.message), { id: toastId });
    } finally {
      setLoading(false);
    }
  };

  if (!isConnected) return null;

  return (
    <div className="fixed bottom-4 left-4 z-50">
      <button 
        onClick={handleSetup} 
        disabled={loading}
        className="bg-gray-800 hover:bg-gray-700 text-gray-400 hover:text-white px-4 py-2 rounded-lg text-xs font-mono border border-gray-700 flex items-center gap-2 shadow-xl"
      >
        <Wrench size={12} />
        {loading ? 'Setting up...' : '🛠️ Mint & Approve USDC'}
      </button>
    </div>
  );
}
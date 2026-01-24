'use client';

import { useState } from 'react';
import { createWalletClient, custom, parseUnits, type Address } from 'viem';
import { monadTestnet } from '@/lib/chains';
import { toast } from 'react-hot-toast';
import { erc7715ProviderActions } from '@metamask/smart-accounts-kit/actions';
import Image from 'next/image';
import { dice } from '@/assets';

declare global {
  interface Window {
    ethereum?: unknown;
  }
}

const THIRTY_CONTRACT_ADDRESS = process.env.NEXT_PUBLIC_THIRTY_ENGINE_ADDRESS as `0x${string}`;
const USDC_ADDRESS = '0xD9a4C52EfA4EfA8F698EC9941061c9ef3387DBc6';

export default function AutoTradeSetup({ userAddress, onEnabled }: { userAddress: string; onEnabled: () => void }) {
  const [loading, setLoading] = useState(false);

  const handleSetup = async () => {
    if (!userAddress) {
      toast.error('Connect your wallet first');
      return;
    }
    if (typeof window === 'undefined' || !window.ethereum) {
      toast.error('MetaMask Flask required');
      window.open('https://metamask.io/flask/', '_blank');
      return;
    }

    setLoading(true);
    try {
      toast.loading('Creating session…', { id: 'setup' });
      const sessionRes = await fetch('/api/session/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userAddress }),
      });
      if (!sessionRes.ok) {
        const err = await sessionRes.json().catch(() => ({}));
        throw new Error(err.error || 'Failed to create session');
      }
      const { sessionAccountAddress, sessionId } = await sessionRes.json();
      if (!sessionAccountAddress) throw new Error('Invalid session account');

      toast.loading('Connect in MetaMask Flask…', { id: 'setup' });
      const walletClient = createWalletClient({
        chain: monadTestnet,
        transport: custom(window.ethereum as never),
        account: userAddress as Address,
      }).extend(erc7715ProviderActions());

      toast.loading('Approve USDC spending in MetaMask…', { id: 'setup' });
      const currentTime = Math.floor(Date.now() / 1000);
      const expiry = currentTime + 30 * 24 * 60 * 60;
      const grantedPermissions = await walletClient.requestExecutionPermissions([
        {
          chainId: monadTestnet.id,
          expiry,
          signer: { type: 'account', data: { address: sessionAccountAddress } },
          permission: {
            type: 'erc20-token-periodic',
            data: {
              tokenAddress: USDC_ADDRESS,
              periodAmount: parseUnits('10000', 6),
              periodDuration: 86400,
              startTime: currentTime,
              recipient: THIRTY_CONTRACT_ADDRESS,
            },
          },
          isAdjustmentAllowed: true,
        },
      ]);

      if (!grantedPermissions?.length) throw new Error('Permission denied');

      const permissionData = grantedPermissions[0];
      const permissionsContext = permissionData.context;
      const delegationManager = permissionData.signerMeta?.delegationManager ?? '';
      const userSmartAccountAddress = permissionData.address;
      if (!permissionsContext) throw new Error('Missing permissions context');

      toast.loading('Saving…', { id: 'setup' });
      const enableRes = await fetch('/api/session/enable', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sessionId,
          context: permissionsContext,
          delegationManager,
          smartAccountAddress: userSmartAccountAddress,
        }),
      });
      const enableData = await enableRes.json();
      if (!enableData.success) throw new Error(enableData.error || 'Failed to save');

      toast.success('Auto-trade enabled', { id: 'setup' });
      onEnabled();
    } catch (e: unknown) {
      const err = e as { code?: number; message?: string };
      if (err.code === 4001 || err.message?.includes('User rejected')) {
        toast.error('Cancelled', { id: 'setup' });
      } else if (err.code === -32601 || /does not exist|not available/.test(err.message ?? '')) {
        toast.error('Update MetaMask Flask for ERC-7715', { id: 'setup', duration: 6000 });
      } else if (err.message?.toLowerCase().includes('chain')) {
        toast.error('Switch to Monad Testnet', { id: 'setup' });
      } else {
        toast.error(err.message || 'Setup failed', { id: 'setup' });
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <button
      onClick={handleSetup}
      disabled={loading}
      className="flex items-center gap-2 bg-[var(--accent-green)] text-[var(--bg-deep)] font-[family-name:var(--font-mono)] font-bold px-4 py-2.5 rounded-lg border-0 transition-all duration-200 hover:brightness-110 active:scale-[0.98] disabled:opacity-50 disabled:cursor-wait"
      style={{ fontFamily: 'var(--font-mono)' }}
    >
      {loading ? (
        <>
          <div className="w-4 h-4 border-2 border-[var(--bg-deep)] border-t-transparent rounded-full animate-spin" />
          <span>Setting up…</span>
        </>
      ) : (
        <>
          <Image src={dice} alt="" width={18} height={18} />
          <span>Go 1‑Tap</span>
        </>
      )}
    </button>
  );
}

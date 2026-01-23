'use client';

import { useState } from 'react';
import { Gift } from 'lucide-react';
import { toast } from 'react-hot-toast';
import confetti from 'canvas-confetti';

interface ClaimButtonProps {
  roundId: number;
}

export default function ClaimButton({ roundId }: ClaimButtonProps) {
  const [claiming, setClaiming] = useState(false);

  const handleClaim = async () => {
    try {
      setClaiming(true);
      toast.loading('Claiming reward...', { id: 'claim' });

      const res = await fetch('/api/predictions/claim', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ roundId }),
      });

      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || 'Failed to claim reward');
      }

      const data = await res.json();

      toast.dismiss('claim');
      toast.success(`Claimed $${data.payout}! 🎉`);

      // Confetti celebration
      confetti({
        particleCount: 150,
        spread: 70,
        origin: { y: 0.6 },
        colors: ['#10b981', '#8b5cf6', '#f59e0b'],
      });

      // Reload page to refresh data
      setTimeout(() => window.location.reload(), 1500);
    } catch (error: any) {
      console.error('Claim error:', error);
      toast.dismiss('claim');
      toast.error(error.message || 'Failed to claim reward');
    } finally {
      setClaiming(false);
    }
  };

  return (
    <button
      onClick={handleClaim}
      disabled={claiming}
      className="text-xs px-3 py-1.5 bg-green-600 hover:bg-green-700 text-white rounded-lg font-bold transition-all disabled:opacity-50 flex items-center gap-1"
    >
      <Gift size={12} />
      {claiming ? 'Claiming...' : 'Claim'}
    </button>
  );
}
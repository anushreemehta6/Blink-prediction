'use client';

import Image from 'next/image';
import { logo } from '@/assets';
import ConnectWallet from '@/components/ConnectWallet';

interface HeaderProps {
  currentPrice: number | null;
}

export default function Header({ currentPrice }: HeaderProps) {
  return (
    <header className="fixed top-0 left-0 right-0 z-50 border-b border-[var(--border-subtle)] bg-[var(--bg-panel)]/90 backdrop-blur-xl">
      <div className="max-w-7xl mx-auto px-4 h-14 flex items-center justify-between">
        <Image src={logo} alt="3HIRTY" className="h-8 w-auto max-w-[160px] object-contain" />
        <div className="flex items-center gap-3">
          {currentPrice != null && (
            <div className="hidden md:flex items-center gap-2 font-[family-name:var(--font-mono)] text-sm text-[var(--text-muted)]">
              <span className="w-1.5 h-1.5 rounded-full bg-[var(--accent-green)] animate-pulse" />
              <span className="font-semibold text-[var(--text-primary)]">${currentPrice.toFixed(2)}</span>
            </div>
          )}
          <ConnectWallet />
        </div>
      </div>
    </header>
  );
}

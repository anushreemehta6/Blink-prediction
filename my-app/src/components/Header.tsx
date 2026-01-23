'use client';

import Image from 'next/image';
import { logo } from '@/assets';
import ConnectWallet from '@/components/ConnectWallet';

interface HeaderProps {
  currentPrice: number | null;
}

export default function Header({ currentPrice }: HeaderProps) {
  return (
    <header className="fixed top-4 left-1/2 -translate-x-1/2 w-[calc(100%-2rem)] max-w-7xl z-50 bg-[#0A696C] rounded-full">
      <div className="p-2 flex items-center justify-between">
        <Image src={logo} alt="logo" className='w-[200px] h-[70px]' />

        {currentPrice && (
          <div className="hidden md:flex items-center gap-4 px-4 py-2 bg-gray-900/50 rounded-full border border-gray-800">
            <span className="text-lg font-bold text-white">${currentPrice.toFixed(2)}</span>
          </div>
        )}
        <ConnectWallet />
      </div>
    </header>
  );
}

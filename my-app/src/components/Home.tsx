'use client';

import React from 'react';
import Image from 'next/image';
import { useWallet } from '@/context/WalletContext';
import Header from './Header';
import BackgroundGrid from './bgGrid';
import { dice } from '@/assets';
import { useRouter } from 'next/navigation';

const Home = () => {
  const { connectWallet, isConnecting } = useWallet();
  const router = useRouter();

  return (
    <>
      <BackgroundGrid />
      <div className="fixed inset-0 w-full h-full overflow-hidden bg-[var(--bg-deep)]">
        <div className="absolute inset-0 bg-gradient-to-b from-transparent via-transparent to-[var(--bg-deep)]/80" />

        <Header currentPrice={null} />

        <div className="relative z-10 flex flex-col justify-center items-center text-center min-h-screen px-4 pt-16">
          <p
            className="font-[family-name:var(--font-mono)] text-xs uppercase tracking-[0.2em] text-[var(--accent-green)] mb-4"
            style={{ fontFamily: 'var(--font-mono)' }}
          >
            30-Second Prediction Markets
          </p>
          <h1
            className="font-[family-name:var(--font-display)] text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-bold tracking-tight text-[var(--text-primary)] max-w-3xl leading-[1.1]"
            style={{ fontFamily: 'var(--font-display)' }}
          >
            PREDICT. TRADE. WIN.
          </h1>
          <p className="font-[family-name:var(--font-mono)] text-base sm:text-lg text-[var(--text-muted)] mt-5 max-w-xl">
            Click the chart. Set your target. 30 seconds to resolve. Real money on Monad.
          </p>
          <div className='flex gap-4'>
          <button
            onClick={connectWallet}
            disabled={isConnecting}
            className="mt-10 flex items-center gap-3 bg-[var(--accent-green)] text-[var(--bg-deep)] font-[family-name:var(--font-mono)] font-bold px-8 py-4 rounded-lg border-0 transition-all duration-200 hover:brightness-110 hover:scale-[1.02] active:scale-[0.98] disabled:opacity-50 disabled:cursor-wait disabled:hover:scale-100 disabled:hover:brightness-100"
            style={{ fontFamily: 'var(--font-mono)' }}
          >
            <Image src={dice} alt="" width={22} height={22} className="opacity-90" />
            <span>{isConnecting ? 'Connecting…' : 'Start Blinking'}</span>
          </button>
          {/* <button
            // onClick={connectWallet}
            // disabled={isConnecting}
            onClick={() => router.push('/pvp')}
            className="mt-10 flex items-center gap-3 bg-[var(--accent-green)] text-[var(--bg-deep)] font-[family-name:var(--font-mono)] font-bold px-8 py-4 rounded-lg border-0 transition-all duration-200 hover:brightness-110 hover:scale-[1.02] active:scale-[0.98] disabled:opacity-50 disabled:cursor-wait disabled:hover:scale-100 disabled:hover:brightness-100"
            style={{ fontFamily: 'var(--font-mono)' }}
          >
            <Image src={dice} alt="" width={22} height={22} className="opacity-90" />
            <span>PvP mode</span>
          </button> */}

          </div>
          
        </div>
      </div>
    </>
  );
};

export default Home;

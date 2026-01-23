'use client'

import { dice, grid } from '@/assets'
import React from 'react'
import Image from 'next/image'
import { useWallet } from '@/context/WalletContext'
import Header from './Header'

const Home = () => {
  const { connectWallet, isConnecting } = useWallet()

  return (
    <div
      className='fixed inset-0 w-full h-full overflow-hidden'
      style={{
        backgroundImage: `url(${grid.src})`,
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        backgroundRepeat: 'no-repeat'
      }}
    >
      {/* Overlay for better text readability */}
      <div className='absolute inset-0 bg-black/40' />

      {/* Header */}
      <Header currentPrice={null} />

      {/* Content */}
      <div className='relative z-10 flex flex-col justify-center items-center text-center h-full px-4'>
        <h1 className='font-[family-name:var(--font-spicy-rice)] text-4xl md:text-5xl lg:text-[64px] leading-tight'>
          Blink and the market moves.
        </h1>
        <p className='font-[family-name:var(--font-spicy-rice)] text-xl md:text-2xl lg:text-[32px] text-gray-300 mt-4'>
          30-second prediction rounds.
        </p>
        <button
          onClick={connectWallet}
          disabled={isConnecting}
          className='mt-8 flex items-center gap-2 bg-gradient-to-r from-[#599BA5] to-[#A1BCBD] text-black px-6 lg:px-8 py-3 lg:py-4 rounded-full font-bold transition-all duration-300 shadow-lg hover:shadow-xl hover:scale-105 disabled:opacity-60 disabled:cursor-wait disabled:scale-100 text-base lg:text-lg'
        >
          <Image src={dice} alt='dice' width={24} height={24} />
          <span>{isConnecting ? 'Connecting...' : 'Start Blinking'}</span>
        </button>
      </div>
    </div>
  )
}

export default Home

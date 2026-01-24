'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { AssetSymbol, getPythId, MONAD_CONFIG } from '@/lib/constants';
import GameCanvas from './GameCanvas';

// --- CONSTANTS FOR GRID SNAPPING ---
// These must match the visual grid settings in GameCanvas
const GRID_TIME_STEP = 5000; // 5 seconds per column
const GRID_PRICE_ROWS = 10;  // 10 Rows visible

export interface TargetBlock {
  id: string;
  targetPrice: number;
  amount: number;
  multiplier: number;
  expiryTime: number; 
  isUpward: boolean;
  status: 'PENDING' | 'HIT' | 'MISSED';
  createdAt: number;
  hitTime?: number;
}

export interface Viewport {
  timeOffset: number;
  priceOffset: number;
  zoom: number;
}

interface GameEngineProps {
  selectedAsset: AssetSymbol;
  userAddress?: string;
  selectedAmount: number;
  onPlaceBetAPI: (targetPrice: number, amount: number, multiplier: number) => Promise<void>;
}

export default function GameEngine({ 
  selectedAsset, 
  userAddress, 
  selectedAmount, 
  onPlaceBetAPI 
}: GameEngineProps) {
  
  // --- STATE ---
  const [currentPrice, setCurrentPrice] = useState<number | null>(null);
  const [priceHistory, setPriceHistory] = useState<{ time: number; price: number }[]>([]);
  const [blocks, setBlocks] = useState<TargetBlock[]>([]);
  const [isPlacing, setIsPlacing] = useState(false);
  
  const [viewport, setViewport] = useState<Viewport>({ 
    timeOffset: 0, 
    priceOffset: 0, 
    zoom: 1 
  });

  // --- DATA FETCHING (Unchanged) ---
  useEffect(() => {
    let mounted = true;
    const fetchPrice = async () => {
      try {
        const id = getPythId(selectedAsset);
        const res = await fetch(`${MONAD_CONFIG.HERMES_ENDPOINT}?ids[]=${id}`);
        if (res.ok && mounted) {
          const data = await res.json();
          const parsed = data.parsed?.[0];
          if (parsed) {
             const rawPrice = parsed.price.price;
             const expo = parsed.price.expo;
             const newPrice = Number(rawPrice) * Math.pow(10, expo);

             setCurrentPrice(newPrice);
             setPriceHistory(prev => {
               const now = Date.now();
               const newPoint = { time: now, price: newPrice };
               const cutoff = now - (60 * 1000); 
               return [...prev.filter(p => p.time > cutoff), newPoint];
             });
          }
        }
      } catch (e) { console.error(e); }
    };
    
    fetchPrice();
    const interval = setInterval(fetchPrice, 1000);
    return () => { mounted = false; clearInterval(interval); };
  }, [selectedAsset]);

  // --- WIN/LOSS LOGIC (Unchanged) ---
  useEffect(() => {
    if (!currentPrice) return;
    setBlocks(prev => prev.map(block => {
      if (block.status !== 'PENDING') return block;

      const priceHit = block.isUpward
        ? currentPrice >= block.targetPrice
        : currentPrice <= block.targetPrice;

      if (priceHit) return { ...block, status: 'HIT', hitTime: Date.now() };
      if (Date.now() > block.expiryTime) return { ...block, status: 'MISSED' };
      return block;
    }));
  }, [currentPrice]);

  // --- MATH ENGINE ---
  const getVisibleBounds = useMemo(() => {
    if (!currentPrice) return { min: 0, max: 100, range: 100 };
    
    const spread = currentPrice * 0.0005 * viewport.zoom; 
    const centerPrice = currentPrice + viewport.priceOffset;
    
    return {
      min: centerPrice - spread,
      max: centerPrice + spread,
      range: spread * 2
    };
  }, [currentPrice, viewport]);

  // --- INTERACTION ---
  const handlePan = useCallback((deltaX: number, deltaY: number, width: number, height: number) => {
    setViewport(prev => {
      const msPerPixel = 50 * prev.zoom; 
      const pricePerPixel = (currentPrice || 1000) * 0.000001 * prev.zoom;
      return {
        ...prev,
        timeOffset: prev.timeOffset - (deltaX * msPerPixel),
        priceOffset: prev.priceOffset + (deltaY * pricePerPixel),
      };
    });
  }, [currentPrice]);

  const handlePlaceBet = useCallback(async (screenX: number, screenY: number, width: number, height: number) => {
    if (!currentPrice || isPlacing) return;

    const { min, max, range } = getVisibleBounds;
    const priceStep = range / GRID_PRICE_ROWS;

    // 1. Calculate Raw Price at Click
    const priceRatio = (height - screenY) / height; 
    const rawTargetPrice = min + (priceRatio * range);

    // 2. Snap Price to Grid Center
    // Find which "row" index was clicked
    const rowIndex = Math.floor((rawTargetPrice - min) / priceStep);
    // Center the price in that row
    const snappedPrice = min + (rowIndex * priceStep) + (priceStep / 2);

    // 3. Snap Time to Grid Column
    // X-Axis logic from Canvas: NOW is at 70% width
    const MS_PER_PIXEL = 50 * viewport.zoom;
    const now = Date.now();
    const nowScreenX = width * 0.7;
    
    // Convert click X to Time
    const clickDiffPixels = screenX - nowScreenX;
    const clickTime = now + (clickDiffPixels * MS_PER_PIXEL) - viewport.timeOffset;
    
    // Snap to next 5-second interval
    const snappedExpiryTime = Math.ceil(clickTime / GRID_TIME_STEP) * GRID_TIME_STEP;

    // 4. Calculate Multiplier
    const diff = Math.abs(snappedPrice - currentPrice);
    const distanceBps = (diff * 10000) / currentPrice;
    const bonus = (distanceBps * 2000) / 1000;
    let multiplier = (110 + bonus) / 100;
    multiplier = Math.min(Math.max(multiplier, 1.1), 50.0);

    const isUpward = snappedPrice > currentPrice;

    // 5. Create Block
    const newBlock: TargetBlock = {
      id: Date.now().toString(),
      targetPrice: snappedPrice,
      amount: selectedAmount,
      multiplier,
      expiryTime: snappedExpiryTime, // Snapped Time
      isUpward,
      status: 'PENDING',
      createdAt: Date.now(),
    };

    setBlocks(prev => [...prev, newBlock]);
    setIsPlacing(true);

    try {
      await onPlaceBetAPI(snappedPrice, selectedAmount, multiplier);
    } finally {
      setIsPlacing(false);
    }

  }, [currentPrice, getVisibleBounds, isPlacing, selectedAmount, onPlaceBetAPI, viewport]);

  return (
    <div className="relative w-full h-full bg-[#05181e] overflow-hidden">
      <GameCanvas 
        currentPrice={currentPrice}
        priceHistory={priceHistory}
        blocks={blocks}
        selectedAsset={selectedAsset}
        viewport={viewport}
        visibleBounds={getVisibleBounds}
        onPan={handlePan}
        onPlaceBet={handlePlaceBet}
      />
    </div>
  );
}
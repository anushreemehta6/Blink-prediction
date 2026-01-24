'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { AssetSymbol, getPythId, MONAD_CONFIG } from '@/lib/constants';
import GameCanvas from './GameCanvas';

// --- CONSTANTS FOR GRID SNAPPING ---
// These must match the visual grid settings in GameCanvas
const GRID_TIME_STEP = 2500; // 2.5 seconds per column (half width = more columns)
const GRID_PRICE_ROWS = 10;  // 10 Rows visible
const BETTING_COLUMNS = 12;  // Number of betting columns - MUST MATCH GameCanvas (doubled since width is halved)
const BETTING_AREA_PERCENT = 0.75; // Betting area takes 75% of screen - MUST MATCH GameCanvas

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
  onPriceUpdate?: (price: number) => void;
}

export default function GameEngine({ 
  selectedAsset, 
  userAddress, 
  selectedAmount, 
  onPlaceBetAPI,
  onPriceUpdate,
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

  // --- DATA FETCHING ---
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
             // Call the onPriceUpdate callback to update the HUD
             onPriceUpdate?.(newPrice);

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
  }, [selectedAsset, onPriceUpdate]);

  // --- WIN/LOSS LOGIC ---
  // Only trigger HIT when the price line has visually entered the block's time column
  useEffect(() => {
    if (!currentPrice) return;
    const now = Date.now();

    setBlocks(prev => prev.map(block => {
      if (block.status !== 'PENDING') return block;

      // Calculate the block's time column boundaries
      const blockGridTime = Math.floor(block.expiryTime / GRID_TIME_STEP) * GRID_TIME_STEP;
      const blockTimeEnd = blockGridTime + GRID_TIME_STEP;

      // Check if current time has entered the block's time column
      const timeInBlockColumn = now >= blockGridTime;

      // Check if price has reached the target
      const priceHit = block.isUpward
        ? currentPrice >= block.targetPrice
        : currentPrice <= block.targetPrice;

      // Only HIT if both: price reached AND time is within/past the block's column
      if (priceHit && timeInBlockColumn) {
        return { ...block, status: 'HIT', hitTime: Date.now() };
      }

      // MISSED if time has passed the block's expiry without hitting
      if (now > blockTimeEnd) {
        return { ...block, status: 'MISSED' };
      }

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
      // Calculate pixels per ms to match GameCanvas coordinate system
      const bettingAreaWidth = width * BETTING_AREA_PERCENT; // Betting area takes 75% of screen
      const bettingAreaDuration = BETTING_COLUMNS * GRID_TIME_STEP;
      const pixelsPerMs = bettingAreaWidth / bettingAreaDuration;
      const msPerPixel = 1 / pixelsPerMs;

      const pricePerPixel = (currentPrice || 1000) * 0.000001 * prev.zoom;

      // Calculate new time offset
      let newTimeOffset = prev.timeOffset - (deltaX * msPerPixel);

      // Only allow panning into the PAST (left), not into the FUTURE (right)
      // timeOffset < 0 means we're looking at the future, which we don't want
      // Keep timeOffset >= 0 to prevent panning right beyond the betting area
      newTimeOffset = Math.max(0, newTimeOffset);

      return {
        ...prev,
        timeOffset: newTimeOffset,
        priceOffset: prev.priceOffset + (deltaY * pricePerPixel),
      };
    });
  }, [currentPrice]);

  const handlePlaceBet = useCallback(async (screenX: number, screenY: number, width: number, height: number) => {
    if (!currentPrice || isPlacing) return;

    const { min, range } = getVisibleBounds;
    const priceStep = range / GRID_PRICE_ROWS;

    // 1. Calculate Raw Price at Click
    const priceRatio = (height - screenY) / height;
    const rawTargetPrice = min + (priceRatio * range);

    // 2. Snap Price to Grid Center
    // Find which "row" index was clicked
    const rowIndex = Math.floor((rawTargetPrice - min) / priceStep);
    // Center the price in that row
    const snappedPrice = min + (rowIndex * priceStep) + (priceStep / 2);

    // 3. Snap Time to Grid Column - MUST MATCH GameCanvas coordinate system
    const now = Date.now();
    const bettingAreaWidth = width * BETTING_AREA_PERCENT; // 75% of screen
    const bettingAreaDuration = BETTING_COLUMNS * GRID_TIME_STEP;
    const nowLinePosition = width - bettingAreaWidth; // NOW line X position
    const pixelsPerMs = bettingAreaWidth / bettingAreaDuration;
    const msPerPixel = 1 / pixelsPerMs;

    // Convert click X to Time (reverse of worldToScreen)
    const clickDiffPixels = screenX - nowLinePosition;
    const clickTime = now + (clickDiffPixels * msPerPixel) - viewport.timeOffset;

    // Snap to grid time step
    const snappedExpiryTime = Math.floor(clickTime / GRID_TIME_STEP) * GRID_TIME_STEP;

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
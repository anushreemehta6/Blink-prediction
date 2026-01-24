'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { AssetSymbol, ASSET_METADATA, getPythId, MONAD_CONFIG } from '@/lib/constants';
import GameCanvas from './GameCanvas'; // We will build this next

// --- TYPES ---
export interface TargetBlock {
  id: string;
  targetPrice: number;
  amount: number;
  multiplier: number;
  expiryTime: number; // X-Axis (Time)
  isUpward: boolean;
  status: 'PENDING' | 'HIT' | 'MISSED';
  createdAt: number;
  hitTime?: number;
}

export interface Viewport {
  timeOffset: number; // How far back/forward in time we are panned
  priceOffset: number; // How far up/down in price we are panned
  zoom: number;       // Future proofing: zoom level (1.0 = default)
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
  
  // --- 1. STATE MANAGEMENT ---
  const [currentPrice, setCurrentPrice] = useState<number | null>(null);
  const [priceHistory, setPriceHistory] = useState<{ time: number; price: number }[]>([]);
  const [blocks, setBlocks] = useState<TargetBlock[]>([]);
  const [isPlacing, setIsPlacing] = useState(false);
  
  // Camera State: Tracks user drag position
  const [viewport, setViewport] = useState<Viewport>({ 
    timeOffset: 0, 
    priceOffset: 0, 
    zoom: 1 
  });

  // --- 2. DATA STREAMING (Logic Only) ---
  
  // Fetch Price directly from Hermes (Reliable)
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
             
             // Maintain a history buffer for the line chart
             setPriceHistory(prev => {
               const now = Date.now();
               const newPoint = { time: now, price: newPrice };
               // Keep last 60 seconds of history + any future bet points
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

  // Block Status Checking (Win/Loss Logic)
  useEffect(() => {
    if (!currentPrice) return;

    setBlocks(prev => prev.map(block => {
      if (block.status !== 'PENDING') return block;

      // Check if price HIT the target
      // For upward bets: win if current price >= target
      // For downward bets: win if current price <= target
      const priceHit = block.isUpward
        ? currentPrice >= block.targetPrice
        : currentPrice <= block.targetPrice;

      if (priceHit) {
        return { ...block, status: 'HIT', hitTime: Date.now() };
      }

      // Check if expired (MISSED)
      if (Date.now() > block.expiryTime) {
        return { ...block, status: 'MISSED' };
      }

      return block;
    }));
  }, [currentPrice]); // Check every time price updates

  // --- 3. THE MATH ENGINE (Coordinate Systems) ---
  
  // Helper: Get Visible Price Range based on current price & drag offset
  const getVisibleBounds = useMemo(() => {
    if (!currentPrice) return { min: 0, max: 100, range: 100 };
    
    // Default view: +/- 0.05% of price
    const spread = currentPrice * 0.0005 * viewport.zoom; 
    const centerPrice = currentPrice + viewport.priceOffset;
    
    return {
      min: centerPrice - spread,
      max: centerPrice + spread,
      range: spread * 2
    };
  }, [currentPrice, viewport]);

  // --- 4. INTERACTION HANDLERS ---

  // Handle Dragging (Panning the Chart)
  const handlePan = useCallback((deltaX: number, deltaY: number, width: number, height: number) => {
    setViewport(prev => {
      const { range } = getVisibleBounds; // You'd need to access current bounds here
      // X-Axis: Pixels -> Time (1px = approx 50ms)
      const msPerPixel = 50 * prev.zoom; 
      
      // Y-Axis: Pixels -> Price
      // We calculate "Price per Pixel" dynamically based on the current range
      // (This is a simplified estimation for the pan)
      const pricePerPixel = (currentPrice || 1000) * 0.000001 * prev.zoom;

      return {
        ...prev,
        timeOffset: prev.timeOffset - (deltaX * msPerPixel),
        priceOffset: prev.priceOffset + (deltaY * pricePerPixel),
      };
    });
  }, [currentPrice, getVisibleBounds]);

  // Handle Placing a Bet (Snapping Logic)
  const handlePlaceBet = useCallback(async (screenX: number, screenY: number, width: number, height: number) => {
    if (!currentPrice || isPlacing) return;

    // 1. Convert Screen Y -> World Price
    const { min, range } = getVisibleBounds;
    // Invert Y because screen Y=0 is top, but Price Max is top
    const priceRatio = (height - screenY) / height; 
    const rawTargetPrice = min + (priceRatio * range);

    // 2. Snap to Grid (e.g., nearest 1/10000th or $0.50 depending on asset)
    // For simplicity, let's snap to a sensible decimal based on price
    const precision = currentPrice > 1000 ? 0.1 : 0.0001;
    const snappedPrice = Math.round(rawTargetPrice / precision) * precision;

    // 3. Calculate Multiplier
    const diff = Math.abs(snappedPrice - currentPrice);
    const distanceBps = (diff * 10000) / currentPrice;
    const bonus = (distanceBps * 2000) / 1000;
    let multiplier = (110 + bonus) / 100;
    multiplier = Math.min(Math.max(multiplier, 1.1), 50.0);

    const isUpward = snappedPrice > currentPrice;

    // 4. Create Optimistic Block
    const newBlock: TargetBlock = {
      id: Date.now().toString(),
      targetPrice: snappedPrice,
      amount: selectedAmount,
      multiplier,
      expiryTime: Date.now() + 30000, // Fixed 30s for now
      isUpward,
      status: 'PENDING',
      createdAt: Date.now(),
      // We don't store Y here anymore, we calculate it dynamically in render
    };

    setBlocks(prev => [...prev, newBlock]);
    setIsPlacing(true);

    // 5. Fire API Call
    try {
      await onPlaceBetAPI(snappedPrice, selectedAmount, multiplier);
    } finally {
      setIsPlacing(false);
    }

  }, [currentPrice, getVisibleBounds, isPlacing, selectedAmount, onPlaceBetAPI]);

  // --- 5. RENDER ---
  return (
    <div className="relative w-full h-full bg-[#05181e] overflow-hidden">
      {/* This is where the magic happens. 
         The Engine passes PURE DATA to the Canvas. 
         The Canvas doesn't know about APIs or logic, it just draws.
      */}
      <GameCanvas 
        // Data
        currentPrice={currentPrice}
        priceHistory={priceHistory}
        blocks={blocks}
        selectedAsset={selectedAsset}
        
        // Camera / Math
        viewport={viewport}
        visibleBounds={getVisibleBounds}
        
        // Interaction
        onPan={handlePan}
        onPlaceBet={handlePlaceBet}
      />
    </div>
  );
}
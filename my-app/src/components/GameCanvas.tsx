'use client';

import { useRef, useEffect, useState, useMemo } from 'react';
import { AssetSymbol, ASSET_METADATA } from '@/lib/constants';
import { TargetBlock, Viewport } from './GameEngine';

interface GameCanvasProps {
  currentPrice: number | null;
  priceHistory: { time: number; price: number }[];
  blocks: TargetBlock[];
  selectedAsset: AssetSymbol;
  
  viewport: Viewport;
  visibleBounds: { min: number; max: number; range: number };
  
  onPan: (dx: number, dy: number, w: number, h: number) => void;
  onPlaceBet: (x: number, y: number, w: number, h: number) => void;
}

export default function GameCanvas({
  currentPrice,
  priceHistory,
  blocks,
  selectedAsset,
  viewport,
  visibleBounds,
  onPan,
  onPlaceBet
}: GameCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  
  // Interaction State
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState<{ x: number, y: number } | null>(null);
  const [mousePos, setMousePos] = useState<{ x: number, y: number } | null>(null);

  // Visual Constants
  const ASSET_COLOR = ASSET_METADATA[selectedAsset]?.color || '#0A696C';
  const MS_PER_PIXEL = 50 * viewport.zoom; // Zoom scaling for time axis

  // --- 1. COORDINATE SYSTEM ---
  // Converts "World Data" (Time/Price) to "Screen Pixels" (X/Y)
  const worldToScreen = (time: number, price: number, width: number, height: number) => {
    // X-Axis: "NOW" is fixed at 70% of screen width. Time flows to the left.
    // viewport.timeOffset allows us to pan back and forth.
    const now = Date.now();
    const timeDiff = time - now + viewport.timeOffset;
    const x = (width * 0.7) + (timeDiff / MS_PER_PIXEL);

    // Y-Axis: Mapped based on visible price bounds
    const priceRatio = (price - visibleBounds.min) / visibleBounds.range;
    // Invert Y because Canvas (0,0) is top-left
    const y = height - (priceRatio * height);

    return { x, y };
  };

  // --- 2. THE RENDER LOOP ---
  useEffect(() => {
    const canvas = canvasRef.current;
    const container = containerRef.current;
    if (!canvas || !container || !currentPrice) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Handle Resize & DPI
    const dpr = window.devicePixelRatio || 1;
    const width = container.clientWidth;
    const height = container.clientHeight;
    canvas.width = width * dpr;
    canvas.height = height * dpr;
    ctx.scale(dpr, dpr);

    // --- DRAWING START ---
    ctx.clearRect(0, 0, width, height);

    // A. Draw Infinite Grid
    // We calculate "Grid Steps" based on World Coordinates so lines stay anchored
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.05)';
    ctx.lineWidth = 1;
    ctx.beginPath();

    // Vertical Lines (Time: every 5 seconds)
    const now = Date.now();
    const startTime = now - viewport.timeOffset - (width * 0.7 * MS_PER_PIXEL);
    const endTime = startTime + (width * MS_PER_PIXEL);
    // Round to nearest 5s (5000ms)
    const firstGridTime = Math.floor(startTime / 5000) * 5000;
    
    for (let t = firstGridTime; t < endTime; t += 5000) {
        const { x } = worldToScreen(t, visibleBounds.min, width, height);
        ctx.moveTo(x, 0);
        ctx.lineTo(x, height);
    }

    // Horizontal Lines (Price)
    // Dynamic step size based on zoom (simplified logic here)
    const priceStep = visibleBounds.range / 10; 
    const firstGridPrice = Math.floor(visibleBounds.min / priceStep) * priceStep;
    
    for (let p = firstGridPrice; p < visibleBounds.max; p += priceStep) {
        const { y } = worldToScreen(now, p, width, height);
        ctx.moveTo(0, y);
        ctx.lineTo(width, y);
    }
    ctx.stroke();

    // B. Draw Price Line with Gradient
    if (priceHistory.length > 1) {
        // Gradient Fill
        const gradient = ctx.createLinearGradient(0, 0, 0, height);
        gradient.addColorStop(0, `${ASSET_COLOR}80`); // 50% opacity
        gradient.addColorStop(1, 'rgba(0,0,0,0)');    // Transparent

        ctx.beginPath();
        priceHistory.forEach((pt, i) => {
            const { x, y } = worldToScreen(pt.time, pt.price, width, height);
            if (i === 0) ctx.moveTo(x, y);
            else ctx.lineTo(x, y);
        });
        
        // Close the path for filling
        const lastPt = priceHistory[priceHistory.length - 1];
        const { x: lastX } = worldToScreen(lastPt.time, lastPt.price, width, height);
        ctx.lineTo(lastX, height);
        ctx.lineTo(worldToScreen(priceHistory[0].time, 0, width, height).x, height);
        ctx.closePath();
        ctx.fillStyle = gradient;
        ctx.fill();

        // Stroke Line on top
        ctx.beginPath();
        ctx.strokeStyle = ASSET_COLOR;
        ctx.lineWidth = 2;
        ctx.shadowBlur = 10;
        ctx.shadowColor = ASSET_COLOR;
        priceHistory.forEach((pt, i) => {
            const { x, y } = worldToScreen(pt.time, pt.price, width, height);
            if (i === 0) ctx.moveTo(x, y);
            else ctx.lineTo(x, y);
        });
        ctx.stroke();
        ctx.shadowBlur = 0; // Reset glow
    }

    // C. Draw "NOW" Line
    const { x: nowX, y: nowY } = worldToScreen(now, currentPrice, width, height);
    ctx.beginPath();
    ctx.setLineDash([5, 5]);
    ctx.strokeStyle = '#fff';
    ctx.moveTo(nowX, 0);
    ctx.lineTo(nowX, height);
    ctx.stroke();
    ctx.setLineDash([]);

    // D. Draw Blocks (The Bets)
    blocks.forEach(block => {
        const { x, y } = worldToScreen(block.expiryTime, block.targetPrice, width, height);
        const blockW = 60; // Fixed visual size for now
        const blockH = 40;
        
        // Collision / Status Color
        let color = '#ffffff';
        let glow = 0;
        
        if (block.status === 'HIT') {
            color = '#4ade80'; // Green
            glow = 20;
        } else if (block.status === 'MISSED') {
            color = '#ef4444'; // Red
            ctx.globalAlpha = 0.5; // Fade out
        } else {
            color = ASSET_COLOR; // Pending
            glow = 10;
        }

        // 1. Draw Glow/Shadow
        ctx.shadowBlur = glow;
        ctx.shadowColor = color;
        ctx.fillStyle = 'rgba(0,0,0,0.6)'; // Dark glass background
        ctx.fillRect(x - blockW/2, y - blockH/2, blockW, blockH);
        
        // 2. Draw Border
        ctx.strokeStyle = color;
        ctx.lineWidth = 2;
        ctx.strokeRect(x - blockW/2, y - blockH/2, blockW, blockH);
        
        // 3. Draw Text
        ctx.shadowBlur = 0;
        ctx.globalAlpha = 1.0;
        ctx.fillStyle = '#fff';
        ctx.font = 'bold 12px sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(`${block.multiplier.toFixed(2)}x`, x, y);
    });

    // E. Draw Hover Crosshair
    if (mousePos) {
        ctx.strokeStyle = 'rgba(255,255,255,0.3)';
        ctx.setLineDash([2, 2]);
        ctx.beginPath();
        ctx.moveTo(mousePos.x, 0);
        ctx.lineTo(mousePos.x, height);
        ctx.moveTo(0, mousePos.y);
        ctx.lineTo(width, mousePos.y);
        ctx.stroke();
    }

  }, [currentPrice, priceHistory, blocks, viewport, visibleBounds, mousePos, selectedAsset]);


  // --- 3. INTERACTION HANDLERS ---
  
  const handleMouseDown = (e: React.MouseEvent) => {
    setIsDragging(true);
    setDragStart({ x: e.clientX, y: e.clientY });
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    
    setMousePos({ x, y });

    if (isDragging && dragStart) {
        const dx = e.clientX - dragStart.x;
        const dy = e.clientY - dragStart.y;
        
        // Pass Delta to Engine
        onPan(dx, dy, rect.width, rect.height);
        
        // Reset start so we get continuous deltas
        setDragStart({ x: e.clientX, y: e.clientY });
    }
  };

  const handleMouseUp = (e: React.MouseEvent) => {
    if (isDragging && dragStart) {
        // Calculate total distance moved to distinguish "Drag" vs "Click"
        // (Simplified here: we just assume if we were dragging, we stop)
        setIsDragging(false);
        setDragStart(null);
        
        // If it was a very short drag (basically a click), place bet
        // Ideally, you track 'totalMovement' distance state
    }
  };

  const handleClick = (e: React.MouseEvent) => {
    // Only place bet if we weren't actively dragging
    // (You might need a small distance threshold check here)
    if (!containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    onPlaceBet(e.clientX - rect.left, e.clientY - rect.top, rect.width, rect.height);
  };

  return (
    <div 
        ref={containerRef} 
        className="w-full h-full cursor-crosshair touch-none"
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={() => { setIsDragging(false); setMousePos(null); }}
        onClick={handleClick}
    >
        <canvas ref={canvasRef} className="block w-full h-full" />
    </div>
  );
}
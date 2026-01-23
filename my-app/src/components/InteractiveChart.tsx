'use client';

import { useState, useEffect, useRef, useMemo } from 'react';
import { Trophy } from 'lucide-react';

interface TargetBlock {
  id: string;
  targetPrice: number;
  amount: number;
  multiplier: number;
  expiryTime: number;
  y: number;
  isUpward: boolean;
  status: 'PENDING' | 'HIT' | 'MISSED';
  createdAt: number;
  hitTime?: number; // Track when block was hit for animation
}

interface InteractiveChartProps {
  currentPrice: number | null;
  userAddress?: string;
  selectedAmount?: number;
  onPlaceBet: (targetPrice: number, amount: number, multiplier: number) => Promise<void>;
}

export default function InteractiveChart({ currentPrice, userAddress, selectedAmount = 5, onPlaceBet }: InteractiveChartProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const chartContainerRef = useRef<HTMLDivElement>(null);
  const [priceHistory, setPriceHistory] = useState<{ time: number; price: number }[]>([]);
  const [blocks, setBlocks] = useState<TargetBlock[]>([]);
  const [isPlacing, setIsPlacing] = useState(false);
  const [now, setNow] = useState(Date.now());

  // Hover State
  const [mousePos, setMousePos] = useState<{x: number, y: number} | null>(null);
  const [hoverData, setHoverData] = useState<{price: number, mult: number} | null>(null);

  const DURATION_SECONDS = 30;
  const CHART_HEIGHT = 400;
  const PADDING = { top: 40, right: 100, bottom: 40, left: 60 };
  const FUTURE_SECONDS = 30;

  // 1. ANIMATION LOOP (Keeps the blocks moving)
  useEffect(() => {
    const interval = setInterval(() => {
      setNow(Date.now());
    }, 50); // 20FPS update for smooth movement
    return () => clearInterval(interval);
  }, []);

  // 2. MOCK DATA & LIVE UPDATES
  useEffect(() => {
    if (currentPrice && priceHistory.length === 0) {
      const data: { time: number; price: number }[] = [];
      const currTime = Date.now();
      let price = currentPrice;
      for (let i = 60; i > 0; i--) {
        const change = (Math.random() - 0.5) * (currentPrice * 0.0005); 
        price += change;
        data.push({ time: currTime - (i * 1000), price });
      }
      setPriceHistory(data);
    }
  }, [currentPrice]);

  useEffect(() => {
    if (!currentPrice) return;
    setPriceHistory(prev => {
      const currTime = Date.now();
      const newHistory = [...prev, { time: currTime, price: currentPrice }];
      return newHistory.filter(p => currTime - p.time < 60000);
    });

    // Check Hits
    setBlocks(prev => {
      const newBlocks = prev.map(block => {
        if (block.status !== 'PENDING') return block;

        // Hit Logic
        const hit = block.isUpward
          ? currentPrice >= block.targetPrice
          : currentPrice <= block.targetPrice;

        if (hit) {
          return { ...block, status: 'HIT', hitTime: Date.now() };
        }

        // Expiry Logic
        if (Date.now() > block.expiryTime) return { ...block, status: 'MISSED' };

        return block;
      });
      return newBlocks;
    });
  }, [currentPrice]);

  // 3. ZOOM HELPERS
  const getBounds = () => {
    if (priceHistory.length === 0) return { min: 0, max: 100, range: 100 };
    const prices = priceHistory.map(p => p.price);
    let min = Math.min(...prices) * 0.9995; 
    let max = Math.max(...prices) * 1.0005;
    if (max === min) { min -= 1; max += 1; }
    return { min, max, range: max - min };
  };

  const { min: minPrice, max: maxPrice, range: priceRange } = useMemo(getBounds, [priceHistory]);

  const getYFromPrice = (price: number) => {
    const drawHeight = CHART_HEIGHT - PADDING.top - PADDING.bottom;
    const ratio = (price - minPrice) / priceRange;
    return PADDING.top + drawHeight - (ratio * drawHeight);
  };

  const getPriceFromY = (y: number) => {
    const drawHeight = CHART_HEIGHT - PADDING.top - PADDING.bottom;
    const ratio = (PADDING.top + drawHeight - y) / drawHeight;
    return minPrice + (ratio * priceRange);
  };

  // Helper to map Time to X position
  const getXFromTime = (time: number, width: number) => {
    const chartWidth = width - PADDING.left - PADDING.right;
    const nowX = PADDING.left + chartWidth;
    const pixelsPerMs = chartWidth / (60 * 1000); // 60s history fits in chartWidth
    
    // Future is to the right of nowX
    const diffMs = time - now;
    return nowX + (diffMs * pixelsPerMs);
  };

  // 4. RENDER CANVAS
  useEffect(() => {
    const canvas = canvasRef.current;
    const container = chartContainerRef.current;
    if (!canvas || !container || priceHistory.length === 0) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const dpr = window.devicePixelRatio || 1;
    const width = container.clientWidth;
    canvas.width = width * dpr;
    canvas.height = CHART_HEIGHT * dpr;
    canvas.style.width = `${width}px`;
    canvas.style.height = `${CHART_HEIGHT}px`;
    
    ctx.scale(dpr, dpr);
    ctx.clearRect(0, 0, width, CHART_HEIGHT);

    const chartWidth = width - PADDING.left - PADDING.right;
    const nowX = PADDING.left + chartWidth;
    const chartAreaHeight = CHART_HEIGHT - PADDING.top - PADDING.bottom;

    // A. Grid (draw before clipping)
    ctx.strokeStyle = 'rgba(10, 105, 108, 0.3)';
    ctx.lineWidth = 1;
    for (let i = 0; i <= 10; i++) {
      const y = PADDING.top + (chartAreaHeight / 10) * i;
      ctx.beginPath(); ctx.moveTo(PADDING.left, y); ctx.lineTo(width - PADDING.right, y); ctx.stroke();
      const priceAtLine = getPriceFromY(y);
      ctx.fillStyle = 'rgba(10, 105, 108, 0.6)';
      ctx.font = '11px sans-serif';
      ctx.textAlign = 'right';
      ctx.fillText(priceAtLine.toFixed(2), PADDING.left - 8, y + 4);
    }
    // Time Lines
    for (let x = PADDING.left; x <= width - PADDING.right; x += chartWidth / 6) {
      ctx.beginPath(); ctx.moveTo(x, PADDING.top); ctx.lineTo(x, CHART_HEIGHT - PADDING.bottom); ctx.stroke();
    }

    // Set clipping region for chart area
    ctx.save();
    ctx.beginPath();
    ctx.rect(PADDING.left, PADDING.top, chartWidth, chartAreaHeight);
    ctx.clip();

    // B. Price Line - Teal color (now clipped)
    if (priceHistory.length > 1) {
      ctx.shadowColor = '#0A696C';
      ctx.shadowBlur = 15;
      ctx.strokeStyle = '#0A696C';
      ctx.lineWidth = 3;
      ctx.lineJoin = 'round';
      ctx.beginPath();
      priceHistory.forEach((p, i) => {
        const x = getXFromTime(p.time, width);
        const y = getYFromPrice(p.price);
        if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
      });
      ctx.stroke();
      ctx.shadowBlur = 0;
    }

    // Restore context (remove clipping)
    ctx.restore();

    // C. "NOW" Line
    ctx.strokeStyle = 'rgba(10, 105, 108, 0.5)';
    ctx.setLineDash([5, 5]);
    ctx.beginPath(); ctx.moveTo(nowX, PADDING.top); ctx.lineTo(nowX, CHART_HEIGHT - PADDING.bottom); ctx.stroke();
    ctx.setLineDash([]);
    ctx.fillStyle = 'rgba(10, 105, 108, 0.8)';
    ctx.font = '12px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('NOW', nowX, PADDING.top - 8);

    // D. Current Price Dot
    if (currentPrice) {
      const y = Math.max(PADDING.top, Math.min(CHART_HEIGHT - PADDING.bottom, getYFromPrice(currentPrice)));
      ctx.strokeStyle = '#0A696C';
      ctx.setLineDash([2, 2]);
      ctx.beginPath(); ctx.moveTo(nowX, y); ctx.lineTo(PADDING.left, y); ctx.stroke();
      ctx.setLineDash([]);
      ctx.fillStyle = '#0A696C';
      ctx.beginPath(); ctx.arc(nowX, y, 5, 0, Math.PI * 2); ctx.fill();

      // Price label on left
      ctx.fillStyle = '#0A696C';
      ctx.fillRect(PADDING.left - 55, y - 10, 52, 20);
      ctx.fillStyle = '#fff';
      ctx.font = '11px sans-serif';
      ctx.textAlign = 'right';
      ctx.fillText(currentPrice.toFixed(2), PADDING.left - 6, y + 4);
    }

  }, [priceHistory, currentPrice, minPrice, maxPrice, now]);

  // 5. INTERACTION
const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!chartContainerRef.current || !currentPrice) return;
    const rect = chartContainerRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    
    // Calculate boundaries
    const width = rect.width;
    const chartWidth = width - PADDING.left - PADDING.right;
    const nowX = PADDING.left + chartWidth;
    
    // Only show hover data if mouse is in the "Future" zone (to the right of NOW line)
    if (x > nowX) {
      setMousePos({ x, y });
      const targetPrice = getPriceFromY(y);

      // ============================================================
      // 🧠 MATCHING SMART CONTRACT MATH (ThirtyEngineV3.sol)
      // ============================================================
      // 1. Calculate price difference
      const diff = Math.abs(targetPrice - currentPrice);

      // 2. Convert distance to Basis Points (BPS). 1% = 100 BPS
      // Formula: (diff * 10000) / currentPrice
      const distanceBps = (diff * 10000) / currentPrice;

      // 3. Apply DIFFICULTY_SCALER (2000)
      // Formula: (distanceBps * DIFFICULTY_SCALER) / 1000
      const bonus = (distanceBps * 2000) / 1000;

      // 4. Add MIN_MULTIPLIER (110 = 1.1x) and scale down by 100 for frontend display
      let mult = (110 + bonus) / 100;

      // 5. Apply MIN/MAX Caps (1.1x to 50.0x)
      mult = Math.min(Math.max(mult, 1.1), 50.0);

      setHoverData({ price: targetPrice, mult });
    } else {
      setMousePos(null);
      setHoverData(null);
    }
  };

  const handleChartClick = () => {
    if (!mousePos || !hoverData || !currentPrice || isPlacing) return;
    
    const newBlock: TargetBlock = {
      id: Date.now().toString(),
      targetPrice: hoverData.price,
      amount: selectedAmount,
      multiplier: hoverData.mult,
      expiryTime: Date.now() + (DURATION_SECONDS * 1000),
      y: mousePos.y, // We only store Y, X is calculated live
      isUpward: hoverData.price > currentPrice,
      status: 'PENDING',
      createdAt: Date.now()
    };

    setBlocks(prev => [...prev, newBlock]);
    setIsPlacing(true);
    
    onPlaceBet(hoverData.price, selectedAmount, hoverData.mult)
      .finally(() => setIsPlacing(false));
  };

  return (
    <div className="h-[400px]">
      <div
        ref={chartContainerRef}
        className="w-full h-full relative rounded-xl overflow-hidden bg-white cursor-crosshair shadow-lg"
        onMouseMove={handleMouseMove}
        onMouseLeave={() => setMousePos(null)}
        onClick={handleChartClick}
      >
        <canvas ref={canvasRef} className="absolute inset-0 z-0" />

        {/* GHOST BLOCK */}
        {mousePos && hoverData && (
          <div className="pointer-events-none z-10">
            <div className="absolute h-[1px] w-full bg-[#0A696C]/30 border-t border-dashed border-[#0A696C]/50" style={{ top: mousePos.y }} />
            <div className="absolute w-[1px] h-full bg-[#0A696C]/30 border-l border-dashed border-[#0A696C]/50" style={{ left: mousePos.x }} />
            <div className={`absolute w-16 h-16 border-2 flex flex-col items-center justify-center rounded-lg bg-opacity-20 backdrop-blur-sm
              ${hoverData.price > (currentPrice || 0) ? 'border-[#0A696C] bg-[#0A696C]/20' : 'border-[#B76E79] bg-[#B76E79]/20'}`}
              style={{ left: mousePos.x, top: mousePos.y, transform: 'translate(-50%, -50%)' }}>
              <span className="text-[#0A696C] font-bold text-sm">${selectedAmount}</span>
              <span className="text-[10px] font-bold text-[#0A696C]/70">{hoverData.mult.toFixed(2)}x</span>
            </div>
          </div>
        )}

        {/* MOVING BLOCKS */}
        {blocks.map(block => {
           const width = chartContainerRef.current?.clientWidth || 0;
           const x = getXFromTime(block.expiryTime, width);
           const y = getYFromPrice(block.targetPrice);
           const isRecentHit = block.status === 'HIT' && block.hitTime && (now - block.hitTime) < 800;

           if (x < 0) return null;

           return (
             <div
               key={block.id}
               className="absolute"
               style={{
                 left: x,
                 top: y,
                 transform: 'translate(-50%, -50%)'
               }}
             >
               {/* Burst effect for recent hits */}
               {isRecentHit && (
                 <>
                   {/* Expanding ring 1 */}
                   <div
                     className="absolute rounded-full border-4 border-green-400 animate-ping"
                     style={{
                       width: 80,
                       height: 80,
                       left: '50%',
                       top: '50%',
                       transform: 'translate(-50%, -50%)',
                       animationDuration: '0.6s'
                     }}
                   />
                   {/* Expanding ring 2 */}
                   <div
                     className="absolute rounded-full border-2 border-yellow-300 animate-ping"
                     style={{
                       width: 100,
                       height: 100,
                       left: '50%',
                       top: '50%',
                       transform: 'translate(-50%, -50%)',
                       animationDuration: '0.8s',
                       animationDelay: '0.1s'
                     }}
                   />
                   {/* Glow */}
                   <div
                     className="absolute rounded-full bg-green-400 animate-pulse"
                     style={{
                       width: 70,
                       height: 70,
                       left: '50%',
                       top: '50%',
                       transform: 'translate(-50%, -50%)',
                       filter: 'blur(15px)',
                       opacity: 0.7
                     }}
                   />
                   {/* WIN text */}
                   <div
                     className="absolute font-black text-green-400 text-lg animate-bounce whitespace-nowrap"
                     style={{
                       left: '50%',
                       top: -30,
                       transform: 'translateX(-50%)',
                       textShadow: '0 0 10px rgba(74, 222, 128, 0.8), 0 0 20px rgba(74, 222, 128, 0.5)'
                     }}
                   >
                     WIN!
                   </div>
                 </>
               )}

               {/* Block */}
               <div
                 className={`w-14 h-14 flex flex-col items-center justify-center rounded-lg border-2 shadow-lg transition-all
                   ${block.status === 'HIT' ? 'bg-green-500 border-green-300 scale-125 z-20' :
                     block.status === 'MISSED' ? 'bg-[#B76E79]/50 border-[#B76E79] opacity-50' :
                     'bg-[#0A696C] border-[#A1BCBD]'}
                 `}
                 style={{
                   transition: block.status === 'HIT' ? 'all 0.2s ease-out' : 'all 0.075s'
                 }}
               >
                 {block.status === 'HIT' && <Trophy size={14} className="text-white mb-0.5" />}
                 <span className="text-white font-black text-xs">${block.amount}</span>
                 <span className="text-white/70 text-[9px] font-bold">{block.multiplier.toFixed(2)}x</span>
               </div>

               {block.status === 'PENDING' && (
                 <div className="absolute -bottom-5 left-1/2 -translate-x-1/2 bg-[#0A696C] text-white text-[9px] px-2 py-0.5 rounded-full whitespace-nowrap">
                   {Math.max(0, ((block.expiryTime - now)/1000)).toFixed(1)}s
                 </div>
               )}
             </div>
           );
        })}
      </div>
    </div>
  );
}
  // 'use client';

  // import { useState, useEffect, useRef, useMemo } from 'react';
  // import { Trophy } from 'lucide-react';

  // interface TargetBlock {
  //   id: string;
  //   targetPrice: number;
  //   amount: number;
  //   multiplier: number;
  //   expiryTime: number;
  //   isUpward: boolean;
  //   status: 'PENDING' | 'HIT' | 'MISSED';
  //   createdAt: number;
  //   hitTime?: number;
  // }

  // interface InteractiveChartProps {
  //   currentPrice: number | null;
  //   selectedAmount?: number;
  //   onPlaceBet: (targetPrice: number, amount: number, multiplier: number) => Promise<void>;
  // }

  // export default function InteractiveChart({
  //   currentPrice,
  //   selectedAmount = 5,
  //   onPlaceBet
  // }: InteractiveChartProps) {
  //   const canvasRef = useRef<HTMLCanvasElement>(null);
  //   const containerRef = useRef<HTMLDivElement>(null);

  //   const [priceHistory, setPriceHistory] = useState<{ time: number; price: number }[]>([]);
  //   const [blocks, setBlocks] = useState<TargetBlock[]>([]);
  //   const [mousePos, setMousePos] = useState<{ x: number; y: number } | null>(null);
  //   const [hoverData, setHoverData] = useState<{ price: number; mult: number } | null>(null);
  //   const [now, setNow] = useState(Date.now());
  //   const [isPlacing, setIsPlacing] = useState(false);

  //   const CHART_HEIGHT = 400;
  //   const HISTORY_RATIO = 0.2; // 20% history, 80% betting
  //   const FUTURE_SECONDS = 30;
  //   const DURATION_SECONDS = 30;

  //   const PADDING = { top: 40, right: 40, bottom: 40, left: 60 };
  // const HISTORY_MS = 60 * 1000;
  // const BLOCK_SIZE = 40;


  //   /* -------------------- CLOCK -------------------- */
  //   useEffect(() => {
  //     const i = setInterval(() => setNow(Date.now()), 50);
  //     return () => clearInterval(i);
  //   }, []);

  //   /* -------------------- PRICE HISTORY -------------------- */
  //   useEffect(() => {
  //     if (!currentPrice) return;

  //     setPriceHistory(prev => {
  //       const t = Date.now();
  //       return [...prev, { time: t, price: currentPrice }].filter(p => t - p.time < 60000);
  //     });

  //     setBlocks(prev =>
  //       prev.map(b => {
  //         if (b.status !== 'PENDING') return b;

  //         const hit = b.isUpward
  //           ? currentPrice >= b.targetPrice
  //           : currentPrice <= b.targetPrice;

  //         if (hit) return { ...b, status: 'HIT', hitTime: Date.now() };
  //         if (Date.now() > b.expiryTime) return { ...b, status: 'MISSED' };
  //         return b;
  //       })
  //     );
  //   }, [currentPrice]);

  //   /* -------------------- PRICE SCALING -------------------- */
  //   const { min, max, range } = useMemo(() => {
  //     if (!priceHistory.length) return { min: 0, max: 1, range: 1 };
  //     const prices = priceHistory.map(p => p.price);
  //     const min = Math.min(...prices) * 0.999;
  //     const max = Math.max(...prices) * 1.001;
  //     return { min, max, range: max - min };
  //   }, [priceHistory]);

  //   const getY = (price: number) => {
  //     const h = CHART_HEIGHT - PADDING.top - PADDING.bottom;
  //     return PADDING.top + h - ((price - min) / range) * h;
  //   };

  //   const getPriceFromY = (y: number) => {
  //     const h = CHART_HEIGHT - PADDING.top - PADDING.bottom;
  //     return min + ((PADDING.top + h - y) / h) * range;
  //   };

  // const TOTAL_MS = HISTORY_MS + FUTURE_SECONDS * 1000;

  // const getXFromTime = (time: number, width: number) => {
  //   const usable = width - PADDING.left - PADDING.right;
  //   const totalMs = HISTORY_MS + FUTURE_SECONDS * 1000;
  //   const pxPerMs = usable / totalMs;

  //   return (
  //     PADDING.left +
  //     (time - (now - HISTORY_MS)) * pxPerMs
  //   );
  // };




  //   /* -------------------- CANVAS DRAW -------------------- */
  //   useEffect(() => {
  //     const canvas = canvasRef.current;
  //     const container = containerRef.current;
  //     if (!canvas || !container || !priceHistory.length) return;

  //     const ctx = canvas.getContext('2d')!;
  //     const dpr = window.devicePixelRatio || 1;
  //     const width = container.clientWidth;

  //     canvas.width = width * dpr;
  //     canvas.height = CHART_HEIGHT * dpr;
  //     canvas.style.width = `${width}px`;
  //     canvas.style.height = `${CHART_HEIGHT}px`;
  //     ctx.scale(dpr, dpr);

  //     ctx.clearRect(0, 0, width, CHART_HEIGHT);

  //     const usable = width - PADDING.left - PADDING.right;
  //     const historyW = usable * HISTORY_RATIO;
  //     const historyEnd = PADDING.left + historyW;

  //     /* GRID */
  //     ctx.strokeStyle = 'rgba(10,105,108,0.2)';
  //   /* GRID — aligned to block size */
  // ctx.strokeStyle = 'rgba(10,105,108,0.2)';
  // ctx.lineWidth = 1;

  // // Horizontal lines (Y axis grid)
  // for (
  //   let y = PADDING.top;
  //   y <= CHART_HEIGHT - PADDING.bottom;
  //   y += BLOCK_SIZE
  // ) {
  //   ctx.beginPath();
  //   ctx.moveTo(PADDING.left, y);
  //   ctx.lineTo(width - PADDING.right, y);
  //   ctx.stroke();

  //   // Optional price labels
  //   const price = getPriceFromY(y);
  //   ctx.fillStyle = 'rgba(10,105,108,0.8)';
  //   ctx.font = '11px sans-serif';
  //   ctx.textAlign = 'right';
  //   ctx.fillText(price.toFixed(2), PADDING.left - 8, y + 4);
  // }

  // // Vertical lines (X axis grid)
  // for (
  //   let x = PADDING.left;
  //   x <= width - PADDING.right;
  //   x += BLOCK_SIZE
  // ) {
  //   ctx.beginPath();
  //   ctx.moveTo(x, PADDING.top);
  //   ctx.lineTo(x, CHART_HEIGHT - PADDING.bottom);
  //   ctx.stroke();
  // }

  //     /* CLIP HISTORY */
  //     ctx.save();
  //     ctx.beginPath();
  //     ctx.rect(PADDING.left, PADDING.top, historyW, CHART_HEIGHT - PADDING.top - PADDING.bottom);
  //     ctx.clip();

  //     /* PRICE LINE */
  //     ctx.strokeStyle = '#0A696C';
  //     ctx.lineWidth = 2.5;
  //     ctx.beginPath();
  //     priceHistory.forEach((p, i) => {
  //       const x = getXFromTime(p.time, width);
  //       const y = getY(p.price);
  //       i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
  //     });
  //     ctx.stroke();

  //     ctx.restore();

  //     /* NOW DIVIDER */
  //     ctx.setLineDash([6, 6]);
  //     ctx.strokeStyle = 'rgba(10,105,108,0.6)';
  //     ctx.beginPath();
  //     ctx.moveTo(historyEnd, PADDING.top);
  //     ctx.lineTo(historyEnd, CHART_HEIGHT - PADDING.bottom);
  //     ctx.stroke();
  //     ctx.setLineDash([]);

  //     ctx.fillStyle = '#0A696C';
  //     ctx.font = '12px sans-serif';
  //     ctx.fillText('BETTING ZONE →', historyEnd + 12, PADDING.top - 10);
  //   }, [priceHistory, now]);

  //   /* -------------------- INTERACTION -------------------- */
  //   const handleMouseMove = (e: React.MouseEvent) => {
  //     if (!containerRef.current || !currentPrice) return;

  //     const rect = containerRef.current.getBoundingClientRect();
  //     const x = e.clientX - rect.left;
  //     const y = e.clientY - rect.top;

  //     const usable = rect.width - PADDING.left - PADDING.right;
  //     const historyEnd = PADDING.left + usable * HISTORY_RATIO;

  //     if (x <= historyEnd) {
  //       setMousePos(null);
  //       setHoverData(null);
  //       return;
  //     }

  //     const price = getPriceFromY(y);
  //     const diff = Math.abs(price - currentPrice);
  //     const bps = (diff * 10000) / currentPrice;
  //     const mult = Math.min(Math.max((110 + (bps * 2000) / 1000) / 100, 1.1), 50);

  //     setMousePos({ x, y });
  //     setHoverData({ price, mult });
  //   };

  //   const handleClick = () => {
  //     if (!mousePos || !hoverData || !currentPrice || isPlacing) return;

  //     setIsPlacing(true);

  //     const block: TargetBlock = {
  //       id: Date.now().toString(),
  //       targetPrice: hoverData.price,
  //       amount: selectedAmount,
  //       multiplier: hoverData.mult,
  //       expiryTime: Date.now() + DURATION_SECONDS * 1000,
  //       isUpward: hoverData.price > currentPrice,
  //       status: 'PENDING',
  //       createdAt: Date.now()
  //     };

  //     setBlocks(b => [...b, block]);
  //     onPlaceBet(block.targetPrice, block.amount, block.multiplier).finally(() =>
  //       setIsPlacing(false)
  //     );
  //   };
  //   const isInsideChart = (x: number, y: number, width: number) =>
  //   x >= PADDING.left &&
  //   x <= width - PADDING.right &&
  //   y >= PADDING.top &&
  //   y <= CHART_HEIGHT - PADDING.bottom;


  //   /* -------------------- RENDER -------------------- */
  //   return (
  //     <div className="h-[400px]">
  //       <div
  //         ref={containerRef}
  //         className="relative h-full bg-white rounded-xl cursor-crosshair overflow-hidden"
  //         onMouseMove={handleMouseMove}
  //         onMouseLeave={() => setMousePos(null)}
  //         onClick={handleClick}
  //       >
  //         <canvas ref={canvasRef} className="absolute inset-0" />

  //         {/* GHOST */}
  //         {mousePos && hoverData && (
  //           <div
  //             className="absolute w-4 h-4 bg-[#0A696C]/70 border border-[#0A696C]"
  //             style={{ left: mousePos.x, top: mousePos.y, transform: 'translate(-50%, -50%)' }}
  //           />
  //         )}

  //         {/* BLOCKS */}
  //       {blocks.map(b => {
  //   const width = containerRef.current?.clientWidth || 0;

  //   const x = getXFromTime(b.expiryTime, width);
  //   const y = getY(b.targetPrice);

  //   // 🚫 once out of bounds → gone
  //   if (!isInsideChart(x, y, width)) return null;

  //   return (
  //     <div
  //       key={b.id}
  //       className={`absolute w-10 h-10 rounded-sm border
  //         ${
  //           b.status === 'HIT'
  //             ? 'bg-green-500 border-green-300'
  //             : b.status === 'MISSED'
  //             ? 'bg-red-400/40 border-red-400'
  //             : 'bg-[#0A696C] border-[#0A696C]'
  //         }`}
  //       style={{
  //         left: x,
  //         top: y,
  //         transform: 'translate(-50%, -50%)'
  //       }}
  //     />
  //   );
  // })}

  //       </div>
  //     </div>
  //   );
  // }
'use client';

import { useState, useEffect, useRef, useMemo } from 'react';
import { Trophy } from 'lucide-react';
// ✅ IMPORT CONSTANTS: This fixes the missing colors/assets issues
import { ASSET_METADATA, AssetSymbol } from '@/lib/constants';

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
  hitTime?: number;
}

interface InteractiveChartProps {
  currentPrice: number | null;
  userAddress?: string;
  selectedAmount?: number;
  selectedAsset: AssetSymbol; // ✅ Uses the imported type (includes BNB)
  onPlaceBet: (targetPrice: number, amount: number, multiplier: number) => Promise<void>;
}

export default function InteractiveChart({ 
  currentPrice, 
  userAddress, 
  selectedAmount = 5, 
  selectedAsset,
  onPlaceBet 
}: InteractiveChartProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const chartContainerRef = useRef<HTMLDivElement>(null);
  const [priceHistory, setPriceHistory] = useState<{ time: number; price: number }[]>([]);
  const [blocks, setBlocks] = useState<TargetBlock[]>([]);
  const [isPlacing, setIsPlacing] = useState(false);
  const [now, setNow] = useState(Date.now());

  const [mousePos, setMousePos] = useState<{x: number, y: number} | null>(null);
  const [hoverData, setHoverData] = useState<{price: number, mult: number} | null>(null);

  const DURATION_SECONDS = 30;
  const CHART_HEIGHT = 400;
  const PADDING = { top: 40, right: 100, bottom: 40, left: 60 };
  const TOTAL_COLUMNS = 6;
  const HISTORY_COLUMNS = 2; 

  // ✅ DYNAMIC COLOR: Fetches the correct color from your constants (e.g., Orange for BTC)
  const assetColor = ASSET_METADATA[selectedAsset]?.color || '#0A696C';

  useEffect(() => {
    setPriceHistory([]);
    setBlocks([]);
  }, [selectedAsset]);

  useEffect(() => {
    let rafId: number;
    const animate = () => {
      setNow(Date.now());
      rafId = requestAnimationFrame(animate);
    };
    rafId = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(rafId);
  }, []);

  useEffect(() => {
    if (currentPrice && priceHistory.length === 0) {
      const data: { time: number; price: number }[] = [];
      const currTime = Date.now();
      let price = currentPrice;
      for (let i = 60; i > 0; i--) {
        const change = (Math.random() - 0.5) * (currentPrice * 0.0003); 
        price += change;
        data.push({ time: currTime - (i * 500), price });
      }
      setPriceHistory(data);
    }
  }, [currentPrice, selectedAsset]);

  useEffect(() => {
    if (!currentPrice) return;
    
    const currTime = Date.now();
    setPriceHistory(prev => {
      const lastPrice = prev.length > 0 ? prev[prev.length - 1].price : currentPrice;
      const priceDiff = Math.abs(currentPrice - lastPrice);
      const shouldInterpolate = priceDiff > (currentPrice * 0.001);
      
      const newPoints = [];
      if (shouldInterpolate && prev.length > 0) {
        const steps = 3;
        for (let i = 1; i <= steps; i++) {
          const ratio = i / (steps + 1);
          newPoints.push({
            time: currTime - ((steps - i + 1) * 16),
            price: lastPrice + (currentPrice - lastPrice) * ratio
          });
        }
      }
      
      newPoints.push({ time: currTime, price: currentPrice });
      const updated = [...prev, ...newPoints];
      return updated.filter(p => currTime - p.time < 60000);
    });

    setBlocks(prev => {
      const newBlocks = prev.map(block => {
        if (block.status !== 'PENDING') return block;
        
        // Only mark as MISSED when time expires, backend will handle WIN
        if (Date.now() > block.expiryTime) {
          return { ...block, status: 'MISSED' };
        }

        return block;
      });
      return newBlocks;
    });
  }, [currentPrice]);

  // Poll backend for position status updates
  useEffect(() => {
    if (!userAddress || blocks.length === 0) return;

    const checkPositionStatuses = async () => {
      for (const block of blocks) {
        if (block.status !== 'PENDING') continue;
        
        try {
          const res = await fetch(`/api/predictions/status?positionId=${block.id}`);
          if (res.ok) {
            const data = await res.json();
            if (data.status === 'WON') {
              setBlocks(prev => prev.map(b => 
                b.id === block.id ? { ...b, status: 'HIT', hitTime: Date.now() } : b
              ));
            } else if (data.status === 'LOST') {
              setBlocks(prev => prev.map(b => 
                b.id === block.id ? { ...b, status: 'MISSED' } : b
              ));
            }
          }
        } catch (e) {
          // Silently continue
        }
      }
    };

    const interval = setInterval(checkPositionStatuses, 3000);
    return () => clearInterval(interval);
  }, [userAddress, blocks]);

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

  const getXFromTime = (time: number, width: number) => {
    const chartWidth = width - PADDING.left - PADDING.right;
    const nowX = PADDING.left + (chartWidth * (HISTORY_COLUMNS / TOTAL_COLUMNS));
    const futureColumns = TOTAL_COLUMNS - HISTORY_COLUMNS;
    const futureWidthPixels = chartWidth * (futureColumns / TOTAL_COLUMNS);
    const pixelsPerMs = futureWidthPixels / (DURATION_SECONDS * 1000);
    const diffMs = time - now;
    return nowX + (diffMs * pixelsPerMs);
  };

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
    const chartAreaHeight = CHART_HEIGHT - PADDING.top - PADDING.bottom;
    const nowX = PADDING.left + (chartWidth * (HISTORY_COLUMNS / TOTAL_COLUMNS));

    ctx.strokeStyle = 'rgba(10, 105, 108, 0.1)';
    ctx.lineWidth = 1;

    for (let i = 0; i <= 10; i++) {
      const y = PADDING.top + (chartAreaHeight / 10) * i;
      ctx.beginPath(); 
      ctx.moveTo(PADDING.left, y); 
      ctx.lineTo(width - PADDING.right, y); 
      ctx.stroke();
      
      const priceAtLine = getPriceFromY(y);
      ctx.fillStyle = 'rgba(10, 105, 108, 0.6)';
      ctx.font = '11px sans-serif';
      ctx.textAlign = 'right';
      ctx.fillText(priceAtLine.toFixed(2), PADDING.left - 8, y + 4);
    }
    
    for (let i = 0; i <= TOTAL_COLUMNS; i++) {
        const x = PADDING.left + (chartWidth / TOTAL_COLUMNS) * i;
        ctx.beginPath(); 
        ctx.moveTo(x, PADDING.top); 
        ctx.lineTo(x, CHART_HEIGHT - PADDING.bottom); 
        ctx.stroke();
    }

    ctx.save();
    ctx.beginPath();
    ctx.rect(PADDING.left, PADDING.top, (nowX - PADDING.left), chartAreaHeight);
    ctx.clip();

    if (priceHistory.length > 1) {
      ctx.shadowColor = assetColor;
      ctx.shadowBlur = 15;
      ctx.strokeStyle = assetColor;
      ctx.lineWidth = 2.5;
      ctx.lineJoin = 'round';
      ctx.lineCap = 'round';
      
      ctx.beginPath();
      const points = priceHistory.map(p => ({
        x: getXFromTime(p.time, width),
        y: getYFromPrice(p.price)
      }));
      
      ctx.moveTo(points[0].x, points[0].y);
      
      for (let i = 1; i < points.length - 1; i++) {
        const xc = (points[i].x + points[i + 1].x) / 2;
        const yc = (points[i].y + points[i + 1].y) / 2;
        ctx.quadraticCurveTo(points[i].x, points[i].y, xc, yc);
      }
      
      if (points.length > 1) {
        const last = points[points.length - 1];
        const secondLast = points[points.length - 2];
        ctx.quadraticCurveTo(secondLast.x, secondLast.y, last.x, last.y);
      }
      
      ctx.stroke();
      ctx.shadowBlur = 0;
    }
    ctx.restore();

    ctx.strokeStyle = assetColor;
    ctx.setLineDash([5, 5]);
    ctx.lineWidth = 2;
    ctx.beginPath(); 
    ctx.moveTo(nowX, PADDING.top); 
    ctx.lineTo(nowX, CHART_HEIGHT - PADDING.bottom); 
    ctx.stroke();
    ctx.setLineDash([]);
    
    ctx.fillStyle = assetColor;
    ctx.font = 'bold 12px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('NOW', nowX, PADDING.top - 10);

    if (currentPrice) {
      const y = Math.max(PADDING.top, Math.min(CHART_HEIGHT - PADDING.bottom, getYFromPrice(currentPrice)));
      
      ctx.strokeStyle = assetColor;
      ctx.globalAlpha = 0.5;
      ctx.setLineDash([2, 2]);
      ctx.beginPath(); 
      ctx.moveTo(nowX, y); 
      ctx.lineTo(width - PADDING.right, y);
      ctx.stroke();
      ctx.globalAlpha = 1.0;
      ctx.setLineDash([]);

      ctx.fillStyle = assetColor;
      ctx.beginPath(); 
      ctx.arc(nowX, y, 6, 0, Math.PI * 2); 
      ctx.fill();
      
      ctx.beginPath();
      ctx.strokeStyle = assetColor;
      ctx.lineWidth = 1;
      ctx.arc(nowX, y, 12, 0, Math.PI * 2);
      ctx.stroke();
    }

  }, [priceHistory, currentPrice, minPrice, maxPrice, priceRange, now, assetColor, getYFromPrice, getXFromTime]);

  const handleMouseMove = useMemo(() => {
    let rafId: number | null = null;
    
    return (e: React.MouseEvent<HTMLDivElement>) => {
      if (rafId) return;
      
      rafId = requestAnimationFrame(() => {
        rafId = null;
        
        if (!chartContainerRef.current || !currentPrice) return;
        const rect = chartContainerRef.current.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;
        
        const width = rect.width;
        const chartWidth = width - PADDING.left - PADDING.right;
        const nowX = PADDING.left + (chartWidth * (HISTORY_COLUMNS / TOTAL_COLUMNS));
        
        if (x > nowX && x < (width - PADDING.right)) {
          setMousePos({ x, y });
          const targetPrice = getPriceFromY(y);

          const diff = Math.abs(targetPrice - currentPrice);
          const distanceBps = (diff * 10000) / currentPrice;
          const bonus = (distanceBps * 2000) / 1000;
          let mult = (110 + bonus) / 100;
          mult = Math.min(Math.max(mult, 1.1), 50.0);

          setHoverData({ price: targetPrice, mult });
        } else {
          setMousePos(null);
          setHoverData(null);
        }
      });
    };
  }, [currentPrice, getPriceFromY]);

  const handleChartClick = () => {
    if (!mousePos || !hoverData || !currentPrice || isPlacing) return;
    
    const newBlock: TargetBlock = {
      id: Date.now().toString(),
      targetPrice: hoverData.price,
      amount: selectedAmount,
      multiplier: hoverData.mult,
      expiryTime: Date.now() + (DURATION_SECONDS * 1000),
      y: mousePos.y,
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
        className="w-full h-full relative rounded-xl overflow-hidden bg-[#05181e] cursor-crosshair shadow-2xl border border-white/5"
        onMouseMove={handleMouseMove}
        onMouseLeave={() => setMousePos(null)}
        onClick={handleChartClick}
      >
        <canvas ref={canvasRef} className="absolute inset-0 z-0" />

        {mousePos && hoverData && (
          <div className="pointer-events-none z-10">
            <div className="absolute h-[1px] w-full bg-white/20 border-t border-dashed border-white/40" style={{ top: mousePos.y }} />
            <div className="absolute w-[1px] h-full bg-white/20 border-l border-dashed border-white/40" style={{ left: mousePos.x }} />
            
            <div className={`absolute w-20 h-16 border-2 flex flex-col items-center justify-center rounded-xl bg-black/60 backdrop-blur-md shadow-[0_0_15px_rgba(0,0,0,0.5)]
              ${hoverData.price > (currentPrice || 0) ? 'border-green-400 text-green-400' : 'border-red-400 text-red-400'}`}
              style={{ left: mousePos.x, top: mousePos.y, transform: 'translate(-50%, -50%)' }}>
              
              <span className="font-black text-lg">${selectedAmount}</span>
              <span className="text-xs font-bold opacity-80">{hoverData.mult.toFixed(2)}x</span>
            </div>
          </div>
        )}

        {blocks.map(block => {
           const width = chartContainerRef.current?.clientWidth || 0;
           const x = getXFromTime(block.expiryTime, width);
           const y = getYFromPrice(block.targetPrice);
           
           if (x < PADDING.left) return null;

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
               {block.status === 'HIT' && (
                  <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2">
                    <div className="w-20 h-20 bg-green-500/30 rounded-full animate-ping" />
                    <div className="absolute inset-0 flex items-center justify-center font-black text-green-400 text-xl animate-bounce drop-shadow-[0_2px_2px_rgba(0,0,0,0.8)]">
                      WON
                    </div>
                  </div>
               )}

               <div
                 className={`w-12 h-12 flex flex-col items-center justify-center rounded-lg border-2 shadow-lg transition-all duration-300
                   ${block.status === 'HIT' ? 'bg-green-500 border-green-300 scale-110 shadow-green-500/50' :
                     block.status === 'MISSED' ? 'bg-red-900/50 border-red-800 opacity-40 grayscale' :
                     'bg-[#0A696C] border-[#A1BCBD] shadow-[#0A696C]/40'}
                 `}
               >
                 {block.status === 'HIT' && <Trophy size={12} className="text-white mb-0.5" />}
                 <span className="text-white font-bold text-xs">${block.amount}</span>
                 <span className="text-white/60 text-[8px] font-mono">{block.multiplier.toFixed(2)}x</span>
               </div>
               
               {block.status === 'PENDING' && (
                 <div className="absolute -bottom-6 left-1/2 -translate-x-1/2 font-mono text-[10px] text-white/50">
                   {((block.expiryTime - now)/1000).toFixed(1)}s
                 </div>
               )}
             </div>
           );
        })}
      </div>
    </div>
  );
}
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

interface TargetBlock {
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

interface InteractiveChartProps {
  currentPrice: number | null;
  selectedAmount?: number;
  onPlaceBet: (targetPrice: number, amount: number, multiplier: number) => Promise<void>;
}

export default function InteractiveChart({
  currentPrice,
  selectedAmount = 5,
  onPlaceBet
}: InteractiveChartProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const [priceHistory, setPriceHistory] = useState<{ time: number; price: number }[]>([]);
  const [blocks, setBlocks] = useState<TargetBlock[]>([]);
  const [mousePos, setMousePos] = useState<{ x: number; y: number } | null>(null);
  const [hoverData, setHoverData] = useState<{ price: number; mult: number } | null>(null);
  const [now, setNow] = useState(Date.now());
  const [isPlacing, setIsPlacing] = useState(false);

  const CHART_HEIGHT = 400;
  const HISTORY_MS = 60 * 1000;
  const FUTURE_SECONDS = 30;
  const DURATION_SECONDS = 30;
  const BLOCK_SIZE = 40;

  const PADDING = { top: 40, right: 40, bottom: 40, left: 60 };
  const TOTAL_MS = HISTORY_MS + FUTURE_SECONDS * 1000;

  /* ---------------- CLOCK ---------------- */
  useEffect(() => {
    const i = setInterval(() => setNow(Date.now()), 50);
    return () => clearInterval(i);
  }, []);

  /* ---------------- PRICE HISTORY ---------------- */
  useEffect(() => {
    if (!currentPrice) return;

    setPriceHistory(prev => {
      const t = Date.now();
      return [...prev, { time: t, price: currentPrice }].filter(p => t - p.time < HISTORY_MS);
    });

    setBlocks(prev =>
      prev.map(b => {
        if (b.status !== 'PENDING') return b;

        const hit = b.isUpward
          ? currentPrice >= b.targetPrice
          : currentPrice <= b.targetPrice;

        if (hit) return { ...b, status: 'HIT', hitTime: Date.now() };
        if (Date.now() > b.expiryTime) return { ...b, status: 'MISSED' };
        return b;
      })
    );
  }, [currentPrice]);

  /* ---------------- PRICE SCALING ---------------- */
  const { min, max, range } = useMemo(() => {
    if (!priceHistory.length) return { min: 0, max: 1, range: 1 };
    const prices = priceHistory.map(p => p.price);
    const min = Math.min(...prices) * 0.999;
    const max = Math.max(...prices) * 1.001;
    return { min, max, range: max - min };
  }, [priceHistory]);

  const getY = (price: number) => {
    const h = CHART_HEIGHT - PADDING.top - PADDING.bottom;
    return PADDING.top + h - ((price - min) / range) * h;
  };

  const getPriceFromY = (y: number) => {
    const h = CHART_HEIGHT - PADDING.top - PADDING.bottom;
    return min + ((PADDING.top + h - y) / h) * range;
  };

  /* ---------------- X AXIS MAPPING ---------------- */
  const getXFromTimeRaw = (time: number, width: number) => {
    const usable = width - PADDING.left - PADDING.right;
    const pxPerMs = usable / TOTAL_MS;
    return PADDING.left + (time - (now - HISTORY_MS)) * pxPerMs;
  };

  const getXFromTimeClamped = (time: number, width: number) => {
    const x = getXFromTimeRaw(time, width);
    return Math.min(width - PADDING.right, Math.max(PADDING.left, x));
  };

  const isInsideChart = (x: number, y: number, width: number) =>
    x >= PADDING.left &&
    x <= width - PADDING.right &&
    y >= PADDING.top &&
    y <= CHART_HEIGHT - PADDING.bottom;

  /* ---------------- CANVAS DRAW ---------------- */
  useEffect(() => {
    const canvas = canvasRef.current;
    const container = containerRef.current;
    if (!canvas || !container || !priceHistory.length) return;

    const ctx = canvas.getContext('2d')!;
    const dpr = window.devicePixelRatio || 1;
    const width = container.clientWidth;

    canvas.width = width * dpr;
    canvas.height = CHART_HEIGHT * dpr;
    canvas.style.width = `${width}px`;
    canvas.style.height = `${CHART_HEIGHT}px`;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

    ctx.clearRect(0, 0, width, CHART_HEIGHT);

    /* GRID */
    ctx.strokeStyle = 'rgba(10,105,108,0.2)';
    ctx.lineWidth = 1;

    for (let y = PADDING.top; y <= CHART_HEIGHT - PADDING.bottom; y += BLOCK_SIZE) {
      ctx.beginPath();
      ctx.moveTo(PADDING.left, y);
      ctx.lineTo(width - PADDING.right, y);
      ctx.stroke();

      const price = getPriceFromY(y);
      ctx.fillStyle = 'rgba(10,105,108,0.8)';
      ctx.font = '11px sans-serif';
      ctx.textAlign = 'right';
      ctx.fillText(price.toFixed(2), PADDING.left - 8, y + 4);
    }

    for (let x = PADDING.left; x <= width - PADDING.right; x += BLOCK_SIZE) {
      ctx.beginPath();
      ctx.moveTo(x, PADDING.top);
      ctx.lineTo(x, CHART_HEIGHT - PADDING.bottom);
      ctx.stroke();
    }

    /* CLIP HISTORY */
    const nowX = getXFromTimeClamped(now, width);
    ctx.save();
    ctx.beginPath();
    ctx.rect(PADDING.left, PADDING.top, nowX - PADDING.left, CHART_HEIGHT - PADDING.top - PADDING.bottom);
    ctx.clip();

    /* PRICE LINE */
    ctx.strokeStyle = '#0A696C';
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    priceHistory.forEach((p, i) => {
      const x = getXFromTimeClamped(p.time, width);
      const y = getY(p.price);
      i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
    });
    ctx.stroke();
    ctx.restore();

    /* NOW DIVIDER */
    ctx.setLineDash([6, 6]);
    ctx.strokeStyle = 'rgba(10,105,108,0.6)';
    ctx.beginPath();
    ctx.moveTo(nowX, PADDING.top);
    ctx.lineTo(nowX, CHART_HEIGHT - PADDING.bottom);
    ctx.stroke();
    ctx.setLineDash([]);

    ctx.fillStyle = '#0A696C';
    ctx.font = '12px sans-serif';
    ctx.fillText('BETTING ZONE →', nowX + 12, PADDING.top - 10);
  }, [priceHistory, now]);

  /* ---------------- INTERACTION ---------------- */
  const handleMouseMove = (e: React.MouseEvent) => {
    if (!containerRef.current || !currentPrice) return;

    const rect = containerRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    const nowX = getXFromTimeClamped(now, rect.width);
    if (x <= nowX) {
      setMousePos(null);
      setHoverData(null);
      return;
    }

    const price = getPriceFromY(y);
    const diff = Math.abs(price - currentPrice);
    const bps = (diff * 10000) / currentPrice;
    const mult = Math.min(Math.max((110 + (bps * 2000) / 1000) / 100, 1.1), 50);

    setMousePos({ x, y });
    setHoverData({ price, mult });
  };

  const handleClick = () => {
    if (!mousePos || !hoverData || !currentPrice || isPlacing) return;

    setIsPlacing(true);

    const block: TargetBlock = {
      id: Date.now().toString(),
      targetPrice: hoverData.price,
      amount: selectedAmount,
      multiplier: hoverData.mult,
      expiryTime: Date.now() + DURATION_SECONDS * 1000,
      isUpward: hoverData.price > currentPrice,
      status: 'PENDING',
      createdAt: Date.now()
    };

    setBlocks(b => [...b, block]);
    onPlaceBet(block.targetPrice, block.amount, block.multiplier).finally(() =>
      setIsPlacing(false)
    );
  };

  /* ---------------- RENDER ---------------- */
  return (
    <div className="h-[400px]">
      <div
        ref={containerRef}
        className="relative h-full bg-white rounded-xl cursor-crosshair overflow-hidden"
        onMouseMove={handleMouseMove}
        onMouseLeave={() => setMousePos(null)}
        onClick={handleClick}
      >
        <canvas ref={canvasRef} className="absolute inset-0" />

        {mousePos && hoverData && (
          <div
            className="absolute w-4 h-4 bg-[#0A696C]/70 border border-[#0A696C]"
            style={{ left: mousePos.x, top: mousePos.y, transform: 'translate(-50%, -50%)' }}
          />
        )}

        {blocks.map(b => {
          const width = containerRef.current?.clientWidth || 0;
          const x = getXFromTimeRaw(b.expiryTime, width);
          const y = getY(b.targetPrice);

          if (!isInsideChart(x, y, width)) return null;

          return (
            <div
              key={b.id}
              className={`absolute w-10 h-10 rounded-sm border
                ${
                  b.status === 'HIT'
                    ? 'bg-green-500 border-green-300'
                    : b.status === 'MISSED'
                    ? 'bg-red-400/40 border-red-400'
                    : 'bg-[#0A696C] border-[#0A696C]'
                }`}
              style={{ left: x, top: y, transform: 'translate(-50%, -50%)' }}
            />
          );
        })}
      </div>
    </div>
  );
}

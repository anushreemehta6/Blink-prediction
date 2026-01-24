'use client';

import { useRef, useEffect, useState } from 'react';
import { AssetSymbol, ASSET_METADATA } from '@/lib/constants';
import { TargetBlock, Viewport } from './GameEngine';

// Particle type for animations
interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  maxLife: number;
  color: string;
  size: number;
  type: 'burst' | 'shatter';
  rotation?: number;
  rotationSpeed?: number;
}

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

// Calculate multiplier based on distance from current price (same logic as GameEngine)
const calculateMultiplier = (targetPrice: number, currentPrice: number): number => {
  const diff = Math.abs(targetPrice - currentPrice);
  const distanceBps = (diff * 10000) / currentPrice;
  const bonus = (distanceBps * 2000) / 1000;
  let multiplier = (110 + bonus) / 100;
  return Math.min(Math.max(multiplier, 1.1), 50.0);
};

// Get color based on multiplier value - adjusted for typical range (1.1x to 1.3x)
const getMultiplierColor = (multiplier: number): { bg: string; border: string; text: string } => {
  if (multiplier >= 1.25) {
    return { bg: 'rgba(234, 179, 8, 0.35)', border: '#eab308', text: '#fde047' }; // Gold - highest
  } else if (multiplier >= 1.2) {
    return { bg: 'rgba(249, 115, 22, 0.3)', border: '#f97316', text: '#fdba74' }; // Orange
  } else if (multiplier >= 1.17) {
    return { bg: 'rgba(34, 197, 94, 0.25)', border: '#22c55e', text: '#86efac' }; // Green
  } else if (multiplier >= 1.14) {
    return { bg: 'rgba(6, 182, 212, 0.2)', border: '#06b6d4', text: '#67e8f9' }; // Cyan
  } else {
    return { bg: 'rgba(99, 102, 241, 0.15)', border: '#6366f1', text: '#a5b4fc' }; // Indigo - lowest (near current price)
  }
};

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

  // Animation State
  const particlesRef = useRef<Particle[]>([]);
  const processedBlocksRef = useRef<Set<string>>(new Set()); // Track which blocks already animated
  const [animationTick, setAnimationTick] = useState(0); // Force re-renders for animations

  // Visual Constants
  const ASSET_COLOR = ASSET_METADATA[selectedAsset]?.color || '#0A696C';
  const MS_PER_PIXEL = 50 * viewport.zoom; // Zoom scaling for time axis

  // Create burst particles (WIN animation) - BIGGER, FASTER, MORE SPREAD
  const createBurstParticles = (x: number, y: number) => {
    const colors = ['#4ade80', '#22c55e', '#86efac', '#fde047', '#ffffff', '#a3e635'];
    const particles: Particle[] = [];

    // Main explosion - fast outward burst
    for (let i = 0; i < 50; i++) {
      const angle = (Math.PI * 2 * i) / 50 + Math.random() * 0.3;
      const speed = 8 + Math.random() * 12; // Much faster
      particles.push({
        x,
        y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        life: 1,
        maxLife: 1,
        color: colors[Math.floor(Math.random() * colors.length)],
        size: 6 + Math.random() * 8, // Bigger particles
        type: 'burst',
      });
    }

    // Inner ring - medium speed
    for (let i = 0; i < 30; i++) {
      const angle = (Math.PI * 2 * i) / 30 + Math.random() * 0.5;
      const speed = 5 + Math.random() * 7;
      particles.push({
        x,
        y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        life: 1,
        maxLife: 1,
        color: colors[Math.floor(Math.random() * colors.length)],
        size: 4 + Math.random() * 6,
        type: 'burst',
      });
    }

    // Sparkles - upward floating
    for (let i = 0; i < 25; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = 3 + Math.random() * 6;
      particles.push({
        x: x + (Math.random() - 0.5) * 40,
        y: y + (Math.random() - 0.5) * 40,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed - 5, // Upward bias
        life: 1,
        maxLife: 1,
        color: '#fde047',
        size: 3 + Math.random() * 4,
        type: 'burst',
      });
    }

    particlesRef.current.push(...particles);
  };

  // Create shatter particles (LOSS animation) - BIGGER, FASTER, MORE DRAMATIC
  const createShatterParticles = (x: number, y: number, blockW: number, blockH: number) => {
    const colors = ['#ef4444', '#dc2626', '#f87171', '#ff6b6b', '#ff8787'];
    const particles: Particle[] = [];

    // Explosion outward - main shards
    for (let i = 0; i < 40; i++) {
      const angle = (Math.PI * 2 * i) / 40 + Math.random() * 0.3;
      const speed = 6 + Math.random() * 10; // Fast explosion

      particles.push({
        x,
        y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        life: 1,
        maxLife: 1,
        color: colors[Math.floor(Math.random() * colors.length)],
        size: 8 + Math.random() * 10, // Bigger shards
        type: 'shatter',
        rotation: Math.random() * Math.PI * 2,
        rotationSpeed: (Math.random() - 0.5) * 0.5, // Faster spin
      });
    }

    // Secondary debris
    for (let i = 0; i < 25; i++) {
      const offsetX = (Math.random() - 0.5) * blockW * 1.5;
      const offsetY = (Math.random() - 0.5) * blockH * 1.5;
      const angle = Math.atan2(offsetY, offsetX);
      const speed = 4 + Math.random() * 8;

      particles.push({
        x: x + offsetX * 0.3,
        y: y + offsetY * 0.3,
        vx: Math.cos(angle) * speed + (Math.random() - 0.5) * 4,
        vy: Math.sin(angle) * speed,
        life: 1,
        maxLife: 1,
        color: colors[Math.floor(Math.random() * colors.length)],
        size: 5 + Math.random() * 7,
        type: 'shatter',
        rotation: Math.random() * Math.PI * 2,
        rotationSpeed: (Math.random() - 0.5) * 0.4,
      });
    }

    // Dust cloud
    for (let i = 0; i < 20; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = 2 + Math.random() * 5;
      particles.push({
        x: x + (Math.random() - 0.5) * blockW,
        y: y + (Math.random() - 0.5) * blockH,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed - 3,
        life: 1,
        maxLife: 1,
        color: 'rgba(255,100,100,0.6)',
        size: 3 + Math.random() * 4,
        type: 'burst', // Use burst type for round dust
      });
    }

    particlesRef.current.push(...particles);
  };

  // Update and draw particles - OPTIMIZED for smooth animation
  const updateParticles = (ctx: CanvasRenderingContext2D) => {
    const particles = particlesRef.current;

    for (let i = particles.length - 1; i >= 0; i--) {
      const p = particles[i];

      // Update position - faster movement
      p.x += p.vx;
      p.y += p.vy;
      p.vy += 0.08; // Less gravity = more spread
      p.vx *= 0.99; // Slight air resistance
      p.life -= 0.015; // Slower decay = lasts longer

      // Update rotation for shatter particles
      if (p.rotation !== undefined && p.rotationSpeed !== undefined) {
        p.rotation += p.rotationSpeed;
      }

      // Remove dead particles
      if (p.life <= 0) {
        particles.splice(i, 1);
        continue;
      }

      // Draw particle
      ctx.save();
      ctx.globalAlpha = Math.min(1, p.life * 1.5); // Fade out more gradually

      if (p.type === 'burst') {
        // Draw circular burst particle with glow
        ctx.shadowBlur = 15;
        ctx.shadowColor = p.color;
        ctx.fillStyle = p.color;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size * (0.5 + p.life * 0.5), 0, Math.PI * 2);
        ctx.fill();
      } else {
        // Draw shard (rotated rectangle) with glow
        ctx.translate(p.x, p.y);
        if (p.rotation !== undefined) {
          ctx.rotate(p.rotation);
        }
        ctx.shadowBlur = 8;
        ctx.shadowColor = p.color;
        ctx.fillStyle = p.color;
        ctx.fillRect(-p.size / 2, -p.size / 4, p.size, p.size / 2);
      }

      ctx.restore();
    }
  };

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

    // A. Draw Interactive Grid Squares with Multipliers (ONLY IN FUTURE/BETTING AREA)
    const now = Date.now();

    // Grid settings
    const TIME_STEP = 5000; // 5 seconds per column
    const PRICE_ROWS = 10; // Number of price rows
    const priceStep = visibleBounds.range / PRICE_ROWS;

    // Calculate the "NOW" line X position
    const { x: nowLineX } = worldToScreen(now, currentPrice, width, height);

    // Only draw grid in FUTURE area (after NOW line)
    // Start from NOW, go into the future
    const firstGridTime = Math.ceil(now / TIME_STEP) * TIME_STEP; // Round up to next grid line
    const endTime = now + (width * 0.5 * MS_PER_PIXEL); // Future time visible on screen
    const firstGridPrice = Math.floor(visibleBounds.min / priceStep) * priceStep;

    // Draw each grid cell (only in future/betting area)
    for (let t = firstGridTime; t < endTime + TIME_STEP; t += TIME_STEP) {
      for (let p = firstGridPrice; p < visibleBounds.max + priceStep; p += priceStep) {
        // Get cell corners
        const { x: x1, y: y1 } = worldToScreen(t, p + priceStep, width, height);
        const { x: x2, y: y2 } = worldToScreen(t + TIME_STEP, p, width, height);

        // Clamp left edge to NOW line (don't draw in past)
        const clampedX1 = Math.max(x1, nowLineX);
        const cellWidth = x2 - clampedX1;
        const cellHeight = y2 - y1;

        // Skip cells that are off-screen or have no width
        if (x2 < nowLineX || clampedX1 > width || y2 < 0 || y1 > height || cellWidth <= 0) continue;

        // Calculate multiplier for center of this cell
        const cellCenterPrice = p + priceStep / 2;
        const multiplier = calculateMultiplier(cellCenterPrice, currentPrice);
        const colors = getMultiplierColor(multiplier);

        // Check if mouse is hovering this cell (only in betting area)
        const isHovered = mousePos &&
          mousePos.x >= clampedX1 && mousePos.x <= x2 &&
          mousePos.y >= y1 && mousePos.y <= y2;

        // Draw cell background
        ctx.fillStyle = isHovered ? colors.border + '40' : colors.bg;
        ctx.fillRect(clampedX1, y1, cellWidth, cellHeight);

        // Draw cell border
        ctx.strokeStyle = isHovered ? colors.border : 'rgba(255, 255, 255, 0.15)';
        ctx.lineWidth = isHovered ? 2 : 1;
        ctx.strokeRect(clampedX1, y1, cellWidth, cellHeight);

        // Draw multiplier text (only if cell is big enough)
        if (cellWidth > 40 && cellHeight > 25) {
          ctx.fillStyle = isHovered ? '#fff' : colors.text;
          ctx.font = isHovered ? 'bold 14px sans-serif' : '11px sans-serif';
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
          ctx.fillText(`${multiplier.toFixed(2)}x`, clampedX1 + cellWidth / 2, y1 + cellHeight / 2);
        }
      }
    }

    // Draw subtle grid lines in the PAST area (no interactive squares)
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.05)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    const pastStartTime = now - viewport.timeOffset - (width * 0.7 * MS_PER_PIXEL);
    const pastFirstGridTime = Math.floor(pastStartTime / TIME_STEP) * TIME_STEP;
    for (let t = pastFirstGridTime; t < now; t += TIME_STEP) {
      const { x } = worldToScreen(t, visibleBounds.min, width, height);
      if (x < nowLineX) {
        ctx.moveTo(x, 0);
        ctx.lineTo(x, height);
      }
    }
    for (let p = firstGridPrice; p < visibleBounds.max; p += priceStep) {
      const { y } = worldToScreen(now, p, width, height);
      ctx.moveTo(0, y);
      ctx.lineTo(nowLineX, y);
    }
    ctx.stroke();

    // Y-AXIS PRICE LABELS
    const Y_AXIS_WIDTH = 70; // Width reserved for price labels

    // Draw Y-axis background
    ctx.fillStyle = 'rgba(5, 24, 30, 0.9)';
    ctx.fillRect(0, 0, Y_AXIS_WIDTH, height);

    // Draw Y-axis border
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.1)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(Y_AXIS_WIDTH, 0);
    ctx.lineTo(Y_AXIS_WIDTH, height);
    ctx.stroke();

    // Format price based on magnitude
    const formatPrice = (price: number): string => {
      if (price >= 10000) return price.toFixed(0);
      if (price >= 1000) return price.toFixed(1);
      if (price >= 100) return price.toFixed(2);
      if (price >= 1) return price.toFixed(3);
      return price.toFixed(6);
    };

    // Draw price labels at each grid line
    ctx.font = '11px monospace';
    ctx.textAlign = 'right';
    ctx.textBaseline = 'middle';

    for (let p = firstGridPrice; p <= visibleBounds.max; p += priceStep) {
      const { y } = worldToScreen(now, p, width, height);

      // Skip if off-screen
      if (y < 10 || y > height - 10) continue;

      // Highlight current price level
      const isNearCurrentPrice = Math.abs(p - currentPrice) < priceStep * 0.5;

      if (isNearCurrentPrice) {
        // Current price badge
        ctx.fillStyle = ASSET_COLOR;
        ctx.fillRect(2, y - 10, Y_AXIS_WIDTH - 6, 20);
        ctx.fillStyle = '#fff';
        ctx.font = 'bold 11px monospace';
      } else {
        ctx.fillStyle = 'rgba(255, 255, 255, 0.6)';
        ctx.font = '11px monospace';
      }

      ctx.fillText(`$${formatPrice(p)}`, Y_AXIS_WIDTH - 8, y);
    }

    // Draw current price indicator on Y-axis (always visible)
    const { y: currentPriceY } = worldToScreen(now, currentPrice, width, height);
    if (currentPriceY > 10 && currentPriceY < height - 10) {
      // Price tag background
      ctx.fillStyle = ASSET_COLOR;
      ctx.beginPath();
      ctx.moveTo(Y_AXIS_WIDTH, currentPriceY);
      ctx.lineTo(Y_AXIS_WIDTH + 8, currentPriceY - 6);
      ctx.lineTo(Y_AXIS_WIDTH + 8, currentPriceY + 6);
      ctx.closePath();
      ctx.fill();
    }

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
    const { x: nowX } = worldToScreen(now, currentPrice, width, height);
    ctx.beginPath();
    ctx.setLineDash([5, 5]);
    ctx.strokeStyle = '#fff';
    ctx.moveTo(nowX, 0);
    ctx.lineTo(nowX, height);
    ctx.stroke();
    ctx.setLineDash([]);

    // D. Draw Blocks (The Bets) and trigger animations
    const blockW = 60;
    const blockH = 40;

    blocks.forEach(block => {
        const { x, y } = worldToScreen(block.expiryTime, block.targetPrice, width, height);

        // Check if this block just changed status and trigger animation
        if (block.status === 'HIT' && !processedBlocksRef.current.has(block.id + '_hit')) {
            processedBlocksRef.current.add(block.id + '_hit');
            createBurstParticles(x, y);
        } else if (block.status === 'MISSED' && !processedBlocksRef.current.has(block.id + '_miss')) {
            processedBlocksRef.current.add(block.id + '_miss');
            createShatterParticles(x, y, blockW, blockH);
        }

        // Collision / Status Color
        let color = '#ffffff';
        let glow = 0;
        let shouldDraw = true;

        if (block.status === 'HIT') {
            color = '#4ade80'; // Green
            glow = 25;
            // Fade out the block after animation starts
            const timeSinceHit = block.hitTime ? Date.now() - block.hitTime : 500;
            if (timeSinceHit > 500) {
              ctx.globalAlpha = Math.max(0, 1 - (timeSinceHit - 500) / 1000);
              if (ctx.globalAlpha <= 0) shouldDraw = false;
            }
        } else if (block.status === 'MISSED') {
            color = '#ef4444'; // Red
            // Quick fade out for missed blocks
            ctx.globalAlpha = 0.3;
        } else {
            color = ASSET_COLOR; // Pending
            glow = 10;
        }

        if (shouldDraw) {
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
          ctx.fillStyle = '#fff';
          ctx.font = 'bold 12px sans-serif';
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
          ctx.fillText(`${block.multiplier.toFixed(2)}x`, x, y);
        }

        ctx.globalAlpha = 1.0;
    });

    // E. Draw Particles (animations)
    updateParticles(ctx);

    // F. Draw Hover Crosshair
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

  }, [currentPrice, priceHistory, blocks, viewport, visibleBounds, mousePos, selectedAsset, animationTick]);

  // --- ANIMATION LOOP for particles ---
  useEffect(() => {
    let animationId: number;
    let isRunning = true;

    const animate = () => {
      if (!isRunning) return;

      if (particlesRef.current.length > 0) {
        // Force re-render to update particle positions
        setAnimationTick(t => t + 1);
      }

      animationId = requestAnimationFrame(animate);
    };

    animationId = requestAnimationFrame(animate);
    return () => {
      isRunning = false;
      cancelAnimationFrame(animationId);
    };
  }, []); // Run once, always animate

  // --- 3. INTERACTION HANDLERS ---

  // Right-click starts dragging
  const handleMouseDown = (e: React.MouseEvent) => {
    // Right-click (button 2) for panning
    if (e.button === 2) {
      e.preventDefault();
      setIsDragging(true);
      setDragStart({ x: e.clientX, y: e.clientY });
    }
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    setMousePos({ x, y });

    // Check if right mouse button is still held (buttons bitmask: 2 = right button)
    if (isDragging && dragStart && (e.buttons & 2)) {
        const dx = e.clientX - dragStart.x;
        const dy = e.clientY - dragStart.y;

        // Pass Delta to Engine
        onPan(dx, dy, rect.width, rect.height);

        // Reset start so we get continuous deltas
        setDragStart({ x: e.clientX, y: e.clientY });
    } else if (isDragging && !(e.buttons & 2)) {
        // Right button was released outside or we missed the mouseup
        setIsDragging(false);
        setDragStart(null);
    }
  };

  const handleMouseUp = (e: React.MouseEvent) => {
    if (e.button === 2) {
        setIsDragging(false);
        setDragStart(null);
    }
  };

  // Left-click places bet
  const handleClick = (e: React.MouseEvent) => {
    if (!containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    onPlaceBet(e.clientX - rect.left, e.clientY - rect.top, rect.width, rect.height);
  };

  // Prevent context menu on right-click
  const handleContextMenu = (e: React.MouseEvent) => {
    e.preventDefault();
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
        onContextMenu={handleContextMenu}
    >
        <canvas ref={canvasRef} className="block w-full h-full" />
    </div>
  );
}
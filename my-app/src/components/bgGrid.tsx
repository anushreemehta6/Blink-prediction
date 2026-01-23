"use client"

import { useEffect, useRef } from "react"

const GLOW_COLOR = "68,205,215"
const TILE_PATTERN = [
  { col: 1, row: 1 },
  { col: 1, row: 1 },
  { col: 1, row: 1 },
  { col: 2, row: 1 },
  { col: 1, row: 2 },
  { col: 2, row: 2 },
]

export default function BackgroundGrid() {
  const containerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const boxes = containerRef.current?.querySelectorAll<HTMLDivElement>(".bg-box")
    if (!boxes) return

    const handleMouseMove = (e: MouseEvent) => {
      boxes.forEach((box) => {
        const rect = box.getBoundingClientRect()
        const dx = e.clientX - (rect.left + rect.width / 2)
        const dy = e.clientY - (rect.top + rect.height / 2)
        const distance = Math.sqrt(dx * dx + dy * dy)

        const maxDist = 220
        const intensity = Math.max(0, 1 - distance / maxDist)

        box.style.transform = `scale(${1 + intensity * 0.3})`
        box.style.boxShadow = `
          0 0 ${intensity * 50}px rgba(${GLOW_COLOR}, ${intensity}),
          inset 0 0 ${intensity * 25}px rgba(${GLOW_COLOR}, ${intensity * 2.8})
        `
        box.style.background = `rgba(${GLOW_COLOR}, ${0.06 + intensity * 0.22})`
      })
    }

    window.addEventListener("mousemove", handleMouseMove)
    return () => window.removeEventListener("mousemove", handleMouseMove)
  }, [])

  return (
    <div ref={containerRef} className="bg-grid">
      {Array.from({ length: 72 }).map((_, i) => {
        const pattern = TILE_PATTERN[i % TILE_PATTERN.length]

        return (
          <div
            key={i}
            className="bg-box"
            style={{
              gridColumn: `span ${pattern.col}`,
              gridRow: `span ${pattern.row}`,
            }}
          />
        )
      })}
    </div>
  )
}

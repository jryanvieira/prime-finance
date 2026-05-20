'use client'

import { useState } from 'react'
import { formatCurrency } from '@/lib/format'

interface DonutSlice {
  label: string
  value: number
  color: string
}

interface DonutChartProps {
  data: DonutSlice[]
  size?: number
}

export function DonutChart({ data, size = 160 }: DonutChartProps) {
  const [hovered, setHovered] = useState<number | null>(null)

  const total = data.reduce((s, d) => s + d.value, 0)
  if (total === 0) return null

  const cx = size / 2
  const cy = size / 2
  const r = size / 2 - 16
  const innerR = r * 0.58
  const hoverExtra = 4

  let cumAngle = -Math.PI / 2
  const arcs = data.map((slice, i) => {
    const angle = (slice.value / total) * 2 * Math.PI
    const startAngle = cumAngle
    const endAngle = cumAngle + angle
    cumAngle = endAngle

    const isHovered = hovered === i
    const rad = isHovered ? r + hoverExtra : r

    const x1 = cx + Math.cos(startAngle) * rad
    const y1 = cy + Math.sin(startAngle) * rad
    const x2 = cx + Math.cos(endAngle) * rad
    const y2 = cy + Math.sin(endAngle) * rad
    const xi1 = cx + Math.cos(startAngle) * innerR
    const yi1 = cy + Math.sin(startAngle) * innerR
    const xi2 = cx + Math.cos(endAngle) * innerR
    const yi2 = cy + Math.sin(endAngle) * innerR

    const largeArc = angle > Math.PI ? 1 : 0

    const d =
      `M ${xi1} ${yi1} ` +
      `L ${x1} ${y1} ` +
      `A ${rad} ${rad} 0 ${largeArc} 1 ${x2} ${y2} ` +
      `L ${xi2} ${yi2} ` +
      `A ${innerR} ${innerR} 0 ${largeArc} 0 ${xi1} ${yi1} Z`

    return { d, slice, i }
  })

  return (
    <div className="flex items-center gap-6">
      <svg
        width={size}
        height={size}
        viewBox={`0 0 ${size} ${size}`}
        style={{ flexShrink: 0 }}
      >
        {arcs.map(({ d, slice, i }) => (
          <path
            key={i}
            d={d}
            fill={slice.color}
            style={{ transition: 'all 0.2s ease', cursor: 'pointer', opacity: hovered === null || hovered === i ? 1 : 0.7 }}
            onMouseEnter={() => setHovered(i)}
            onMouseLeave={() => setHovered(null)}
          />
        ))}
        <text
          x={cx}
          y={cy - 6}
          textAnchor="middle"
          style={{ fontFamily: 'Georgia, serif', fontSize: 13, fill: 'var(--ink-2)' }}
        >
          total
        </text>
        <text
          x={cx}
          y={cy + 12}
          textAnchor="middle"
          style={{ fontFamily: 'Geist Mono, monospace', fontSize: 13, fontWeight: 600, fill: 'var(--ink)' }}
        >
          {formatCurrency(total)}
        </text>
      </svg>

      <div className="flex flex-col gap-2 flex-1 min-w-0">
        {data.map((slice, i) => (
          <div
            key={i}
            className="flex items-center gap-2 cursor-default"
            onMouseEnter={() => setHovered(i)}
            onMouseLeave={() => setHovered(null)}
            style={{ opacity: hovered === null || hovered === i ? 1 : 0.6, transition: 'opacity 0.15s' }}
          >
            <div className="w-2.5 h-2.5 rounded-full shrink-0" style={{ background: slice.color }} />
            <span className="text-xs text-[--ink] truncate flex-1">{slice.label}</span>
            <span className="mono-num text-xs text-[--ink-2] shrink-0">{formatCurrency(slice.value)}</span>
          </div>
        ))}
      </div>
    </div>
  )
}

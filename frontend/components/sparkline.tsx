interface SparklineProps {
  data: { total: number }[]
  width: number
  height: number
}

export function Sparkline({ data, width, height }: SparklineProps) {
  if (!data || data.length < 2) return null

  const values = data.map((d) => d.total)
  const min = Math.min(...values)
  const max = Math.max(...values)
  const range = max - min || 1

  const pad = 4
  const points = values.map((v, i) => {
    const x = pad + (i / (values.length - 1)) * (width - pad * 2)
    const y = pad + (1 - (v - min) / range) * (height - pad * 2)
    return `${x},${y}`
  })

  const lastX = pad + ((values.length - 1) / (values.length - 1)) * (width - pad * 2)
  const lastY = pad + (1 - (values[values.length - 1] - min) / range) * (height - pad * 2)

  return (
    <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`} fill="none">
      <polyline
        points={points.join(' ')}
        stroke="var(--accent-soft)"
        strokeWidth={1.5}
        strokeLinejoin="round"
        strokeLinecap="round"
        fill="none"
      />
      <circle cx={lastX} cy={lastY} r={4} fill="var(--accent-color)">
        <animate attributeName="r" values="4;6;4" dur="2s" repeatCount="indefinite" />
        <animate attributeName="opacity" values="1;0.6;1" dur="2s" repeatCount="indefinite" />
      </circle>
    </svg>
  )
}

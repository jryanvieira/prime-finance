interface ProgressBarProps {
  value: number
  className?: string
}

export function ProgressBar({ value, className }: ProgressBarProps) {
  const capped = Math.min(value, 100)
  const color =
    value >= 100 ? 'bg-emerald-500' : value >= 60 ? 'bg-blue-500' : 'bg-primary'

  return (
    <div className={`flex items-center gap-3 ${className ?? ''}`}>
      <div className="flex-1 h-2 rounded-full bg-muted overflow-hidden">
        <div
          className={`h-full rounded-full transition-all ${color}`}
          style={{ width: `${capped}%` }}
        />
      </div>
      <span className="text-xs tabular-nums w-10 text-right text-muted-foreground">
        {value.toFixed(0)}%
      </span>
    </div>
  )
}

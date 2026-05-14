'use client'

import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from 'recharts'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { formatCurrency } from '@/lib/mock-data'
import type { CategorySummaryItem } from '@/lib/api'

const FALLBACK_COLORS = [
  '#22c55e', '#3b82f6', '#f59e0b', '#ef4444', '#8b5cf6',
  '#ec4899', '#06b6d4', '#f97316', '#a855f7', '#6b7280',
]

interface CategoryChartProps {
  data: CategorySummaryItem[]
  categories: Array<{ name: string; color: string }>
}

export function CategoryChart({ data, categories }: CategoryChartProps) {
  if (data.length === 0) {
    return (
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base font-medium">Gastos por categoria</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground py-8 text-center">
            Nenhum gasto registrado neste mês
          </p>
        </CardContent>
      </Card>
    )
  }

  const chartData = data.map((item, i) => {
    const match = categories.find((c) => c.name === item.category)
    return {
      ...item,
      color: match?.color ?? FALLBACK_COLORS[i % FALLBACK_COLORS.length],
    }
  })

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-base font-medium">Gastos por categoria</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
          <div className="h-[200px] w-full sm:w-[200px] shrink-0">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={chartData}
                  cx="50%"
                  cy="50%"
                  innerRadius={55}
                  outerRadius={85}
                  paddingAngle={2}
                  dataKey="total_cents"
                >
                  {chartData.map((entry, index) => (
                    <Cell key={index} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip
                  content={({ active, payload }) => {
                    if (active && payload && payload.length) {
                      const item = payload[0].payload as typeof chartData[0]
                      return (
                        <div className="rounded-lg border bg-card p-3 shadow-lg text-sm">
                          <p className="font-medium">{item.category}</p>
                          <p className="text-muted-foreground">{formatCurrency(item.total_cents)}</p>
                          <p className="text-muted-foreground">{item.percentage.toFixed(1)}%</p>
                        </div>
                      )
                    }
                    return null
                  }}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>

          <div className="flex flex-col gap-2 flex-1 min-w-0">
            {chartData.slice(0, 7).map((item) => (
              <div key={item.category} className="flex items-center justify-between gap-2 text-sm">
                <div className="flex items-center gap-2 min-w-0">
                  <span
                    className="size-2.5 rounded-full shrink-0"
                    style={{ background: item.color }}
                  />
                  <span className="truncate text-muted-foreground">{item.category}</span>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <span className="font-medium tabular-nums">{formatCurrency(item.total_cents)}</span>
                  <span className="text-muted-foreground w-10 text-right">{item.percentage.toFixed(0)}%</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

'use client'

import { useEffect, useState, useCallback } from 'react'
import { ChevronLeft, ChevronRight, TrendingDown, TrendingUp, ArrowLeftRight } from 'lucide-react'
import { toast } from 'sonner'
import {
  ComposedChart,
  Bar,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts'

import { cashflowService, type CashflowDay, type CashflowResponse } from '@/lib/api'
import { formatCurrency } from '@/lib/mock-data'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { StatsCard } from '@/components/stats-card'

function formatMonthLabel(month: string) {
  const [y, m] = month.split('-')
  const d = new Date(Number(y), Number(m) - 1, 1)
  return d.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' })
}

function formatDayLabel(date: string) {
  return date.slice(8) // "DD"
}

function currentMonthStr() {
  const now = new Date()
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`
}

function addMonth(month: string, delta: number) {
  const [y, m] = month.split('-').map(Number)
  const d = new Date(y, m - 1 + delta, 1)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
}

const CustomTooltip = ({ active, payload, label }: { active?: boolean; payload?: {name: string; value: number; color: string}[]; label?: string }) => {
  if (!active || !payload?.length) return null
  return (
    <div className="rounded-lg border bg-card p-3 shadow-lg text-sm space-y-1.5 min-w-[160px]">
      <p className="font-medium text-foreground">{label}</p>
      {payload.map((p) => (
        <div key={p.name} className="flex items-center justify-between gap-4">
          <span style={{ color: p.color }}>{p.name}</span>
          <span className="font-semibold tabular-nums">{formatCurrency(p.value)}</span>
        </div>
      ))}
    </div>
  )
}

export default function FluxoCaixaPage() {
  const [month, setMonth] = useState(currentMonthStr)
  const [data, setData] = useState<CashflowResponse | null>(null)
  const [loading, setLoading] = useState(true)

  const load = useCallback(async (m: string) => {
    try {
      setLoading(true)
      const resp = await cashflowService.get(m)
      setData(resp)
    } catch {
      toast.error('Não foi possível carregar o fluxo de caixa.')
      setData(null)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void load(month)
  }, [month, load])

  const chartData = (data?.days ?? []).map((d: CashflowDay) => ({
    date: formatDayLabel(d.date),
    Receitas: d.income_cents,
    Despesas: d.expense_cents,
    Saldo: d.cumulative_balance_cents,
  }))

  const balance = data?.net_balance_cents ?? 0

  return (
    <div className="flex flex-col gap-8">
      {/* Header */}
      <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight flex items-center gap-2">
            <ArrowLeftRight className="size-6 text-primary" />
            Fluxo de Caixa
          </h1>
          <p className="text-muted-foreground">Entradas e saídas diárias do mês.</p>
        </div>
        <div className="flex items-center gap-2 mt-3 sm:mt-0">
          <Button variant="outline" size="icon" onClick={() => setMonth((m) => addMonth(m, -1))}>
            <ChevronLeft className="size-4" />
          </Button>
          <span className="min-w-[160px] text-center text-sm font-medium capitalize">
            {formatMonthLabel(month)}
          </span>
          <Button
            variant="outline"
            size="icon"
            onClick={() => setMonth((m) => addMonth(m, 1))}
            disabled={month >= currentMonthStr()}
          >
            <ChevronRight className="size-4" />
          </Button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid gap-4 sm:grid-cols-3">
        <StatsCard
          title="Total de receitas"
          value={formatCurrency(data?.total_income_cents ?? 0)}
          icon={TrendingUp}
        />
        <StatsCard
          title="Total de despesas"
          value={formatCurrency(data?.total_expense_cents ?? 0)}
          icon={TrendingDown}
        />
        <StatsCard
          title="Saldo líquido"
          value={formatCurrency(Math.abs(balance))}
          description={balance >= 0 ? 'Positivo' : 'Negativo'}
          icon={balance >= 0 ? TrendingUp : TrendingDown}
        />
      </div>

      {/* Chart */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base font-medium">Entradas, saídas e saldo acumulado</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="h-[300px] flex items-center justify-center text-sm text-muted-foreground">
              Carregando...
            </div>
          ) : chartData.length === 0 ? (
            <div className="h-[300px] flex items-center justify-center text-sm text-muted-foreground">
              Nenhuma movimentação neste mês.
            </div>
          ) : (
            <div className="h-[300px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <ComposedChart data={chartData} margin={{ top: 10, right: 20, left: 0, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="oklch(0.9 0 0 / 0.5)" vertical={false} />
                  <XAxis
                    dataKey="date"
                    axisLine={false}
                    tickLine={false}
                    tick={{ fill: 'oklch(0.5 0 0)', fontSize: 11 }}
                    interval={Math.floor(chartData.length / 10)}
                  />
                  <YAxis
                    yAxisId="bars"
                    axisLine={false}
                    tickLine={false}
                    tick={{ fill: 'oklch(0.5 0 0)', fontSize: 11 }}
                    tickFormatter={(v) =>
                      new Intl.NumberFormat('pt-BR', {
                        notation: 'compact',
                        style: 'currency',
                        currency: 'BRL',
                      }).format(v / 100)
                    }
                    dx={-6}
                  />
                  <YAxis
                    yAxisId="line"
                    orientation="right"
                    axisLine={false}
                    tickLine={false}
                    tick={{ fill: 'oklch(0.5 0 0)', fontSize: 11 }}
                    tickFormatter={(v) =>
                      new Intl.NumberFormat('pt-BR', {
                        notation: 'compact',
                        style: 'currency',
                        currency: 'BRL',
                      }).format(v / 100)
                    }
                    dx={6}
                  />
                  <Tooltip content={<CustomTooltip />} />
                  <Legend wrapperStyle={{ fontSize: 12, paddingTop: 12 }} />
                  <Bar yAxisId="bars" dataKey="Receitas" fill="oklch(0.6 0.17 145)" radius={[3, 3, 0, 0]} maxBarSize={20} />
                  <Bar yAxisId="bars" dataKey="Despesas" fill="oklch(0.6 0.22 27)" radius={[3, 3, 0, 0]} maxBarSize={20} />
                  <Line
                    yAxisId="line"
                    type="monotone"
                    dataKey="Saldo"
                    stroke="oklch(0.55 0.2 260)"
                    strokeWidth={2}
                    dot={false}
                    activeDot={{ r: 4 }}
                  />
                </ComposedChart>
              </ResponsiveContainer>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Daily table */}
      {!loading && data && data.days.length > 0 && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base font-medium">Detalhamento diário</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b text-muted-foreground">
                    <th className="px-4 py-3 text-left font-medium">Data</th>
                    <th className="px-4 py-3 text-right font-medium">Receitas</th>
                    <th className="px-4 py-3 text-right font-medium">Despesas</th>
                    <th className="px-4 py-3 text-right font-medium">Líquido</th>
                    <th className="px-4 py-3 text-right font-medium">Saldo acumulado</th>
                  </tr>
                </thead>
                <tbody>
                  {data.days
                    .filter((d) => d.income_cents > 0 || d.expense_cents > 0)
                    .map((d) => (
                      <tr key={d.date} className="border-b last:border-0 hover:bg-muted/40 transition-colors">
                        <td className="px-4 py-2.5 tabular-nums">
                          {new Date(d.date + 'T00:00:00').toLocaleDateString('pt-BR', {
                            weekday: 'short',
                            day: '2-digit',
                            month: 'short',
                          })}
                        </td>
                        <td className="px-4 py-2.5 text-right tabular-nums text-emerald-600">
                          {d.income_cents > 0 ? formatCurrency(d.income_cents) : '—'}
                        </td>
                        <td className="px-4 py-2.5 text-right tabular-nums text-red-500">
                          {d.expense_cents > 0 ? formatCurrency(d.expense_cents) : '—'}
                        </td>
                        <td className={`px-4 py-2.5 text-right tabular-nums font-medium ${d.net_cents >= 0 ? 'text-emerald-600' : 'text-red-500'}`}>
                          {d.net_cents >= 0 ? '+' : ''}{formatCurrency(d.net_cents)}
                        </td>
                        <td className={`px-4 py-2.5 text-right tabular-nums font-semibold ${d.cumulative_balance_cents >= 0 ? 'text-foreground' : 'text-red-500'}`}>
                          {formatCurrency(d.cumulative_balance_cents)}
                        </td>
                      </tr>
                    ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}

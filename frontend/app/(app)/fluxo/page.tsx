'use client'

import { useCallback, useEffect, useState } from 'react'
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
import { ChevronLeft, ChevronRight, ArrowLeftRight } from 'lucide-react'
import { toast } from 'sonner'

import { cashflowService, type CashflowDay, type CashflowResponse } from '@/lib/api'
import { useDashboardExpenses, useDashboardIncomes, useDashboardRecurring } from '@/hooks/use-dashboard'
import { formatCurrency } from '@/lib/format'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'

// ─── helpers ────────────────────────────────────────────────────────────────

function currentMonthStr() {
  const now = new Date()
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`
}

function addMonth(month: string, delta: number) {
  const [y, m] = month.split('-').map(Number)
  const d = new Date(y, m - 1 + delta, 1)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
}

function formatMonthLabel(month: string) {
  const [y, m] = month.split('-')
  return new Date(Number(y), Number(m) - 1, 1).toLocaleDateString('pt-BR', {
    month: 'long',
    year: 'numeric',
  })
}

function formatDayLabel(date: string) {
  return date.slice(8)
}

// ─── tooltip chart ───────────────────────────────────────────────────────────

const CustomTooltip = ({
  active,
  payload,
  label,
}: {
  active?: boolean
  payload?: { name: string; value: number; color: string }[]
  label?: string
}) => {
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

// ─── tab Realizado ────────────────────────────────────────────────────────────

function TabRealizado() {
  const [month, setMonth] = useState(currentMonthStr)
  const [data, setData] = useState<CashflowResponse | null>(null)
  const [loading, setLoading] = useState(true)

  const load = useCallback(async (m: string) => {
    try {
      setLoading(true)
      setData(await cashflowService.get(m))
    } catch {
      toast.error('Não foi possível carregar o fluxo de caixa.')
      setData(null)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { void load(month) }, [month, load])

  const chartData = (data?.days ?? []).map((d: CashflowDay) => ({
    date: formatDayLabel(d.date),
    Receitas: d.income_cents,
    Despesas: d.expense_cents,
    Saldo: d.cumulative_balance_cents,
  }))

  const balance = data?.net_balance_cents ?? 0

  return (
    <div className="flex flex-col gap-8 transition-opacity duration-200">
      {/* month nav */}
      <div className="flex items-center gap-2">
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

      {/* KPIs */}
      <div className="grid gap-4 sm:grid-cols-3">
        <Card>
          <CardContent className="pt-6">
            <p className="text-sm text-muted-foreground">Entradas</p>
            <p className="mono-num text-2xl font-semibold mt-1" style={{ color: 'var(--ok)' }}>
              {formatCurrency(data?.total_income_cents ?? 0)}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <p className="text-sm text-muted-foreground">Saídas</p>
            <p className="mono-num text-2xl font-semibold mt-1" style={{ color: 'var(--accent)' }}>
              {formatCurrency(data?.total_expense_cents ?? 0)}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <p className="text-sm text-muted-foreground">Saldo líquido</p>
            <p
              className="mono-num text-2xl font-semibold mt-1"
              style={{ color: balance >= 0 ? 'var(--ok)' : 'var(--accent)' }}
            >
              {balance >= 0 ? '' : '-'}{formatCurrency(Math.abs(balance))}
            </p>
          </CardContent>
        </Card>
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
                  <Bar yAxisId="bars" dataKey="Receitas" fill="var(--ok)" radius={[3, 3, 0, 0]} maxBarSize={20} />
                  <Bar yAxisId="bars" dataKey="Despesas" fill="var(--accent)" radius={[3, 3, 0, 0]} maxBarSize={20} />
                  <Line
                    yAxisId="line"
                    type="monotone"
                    dataKey="Saldo"
                    stroke="var(--ink)"
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
            <div className="overflow-x-auto max-h-[400px] overflow-y-auto">
              <table className="w-full text-sm">
                <thead className="sticky top-0 bg-card z-10">
                  <tr className="border-b text-muted-foreground">
                    <th className="px-4 py-3 text-left font-medium">Data</th>
                    <th className="px-4 py-3 text-right font-medium">Entradas</th>
                    <th className="px-4 py-3 text-right font-medium">Saídas</th>
                    <th className="px-4 py-3 text-right font-medium">Líquido</th>
                    <th className="px-4 py-3 text-right font-medium">Saldo acumulado</th>
                  </tr>
                </thead>
                <tbody>
                  {data.days
                    .filter((d) => d.income_cents > 0 || d.expense_cents > 0)
                    .map((d) => (
                      <tr
                        key={d.date}
                        className="border-b last:border-0 hover:bg-muted/40 transition-colors"
                      >
                        <td className="px-4 py-2.5 tabular-nums">
                          {new Date(d.date + 'T00:00:00').toLocaleDateString('pt-BR', {
                            weekday: 'short',
                            day: '2-digit',
                            month: 'short',
                          })}
                        </td>
                        <td className="px-4 py-2.5 text-right tabular-nums" style={{ color: 'var(--ok)' }}>
                          {d.income_cents > 0 ? formatCurrency(d.income_cents) : '—'}
                        </td>
                        <td className="px-4 py-2.5 text-right tabular-nums" style={{ color: 'var(--accent)' }}>
                          {d.expense_cents > 0 ? formatCurrency(d.expense_cents) : '—'}
                        </td>
                        <td
                          className="px-4 py-2.5 text-right tabular-nums font-medium"
                          style={{ color: d.net_cents >= 0 ? 'var(--ok)' : 'var(--accent)' }}
                        >
                          {d.net_cents >= 0 ? '+' : ''}{formatCurrency(d.net_cents)}
                        </td>
                        <td
                          className="px-4 py-2.5 text-right tabular-nums font-semibold"
                          style={{ color: d.cumulative_balance_cents >= 0 ? 'var(--ink)' : 'var(--accent)' }}
                        >
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

// ─── tab Projeção ─────────────────────────────────────────────────────────────

const SCENARIOS = [
  { key: 'pessimista', label: 'Pessimista', factor: 1.15, description: 'Gasto médio diário × dias restantes × 1,15' },
  { key: 'base', label: 'Base', factor: 1, description: 'Gasto médio diário × dias restantes' },
  { key: 'otimista', label: 'Otimista', factor: 0.85, description: 'Gasto médio diário × dias restantes × 0,85' },
]

function TabProjecao() {
  const [activeScenario, setActiveScenario] = useState('base')

  const { data: expenses = [] } = useDashboardExpenses()
  const { data: incomes = [] } = useDashboardIncomes()
  const { data: recurring = [] } = useDashboardRecurring()

  const now = new Date()
  const today = now.getDate()
  const daysInMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate()
  const daysRemaining = daysInMonth - today

  // spent so far this month
  const spentSoFar = expenses.reduce((sum, e) => sum + e.amount_cents, 0)
  const avgDailySpend = today > 0 ? spentSoFar / today : 0

  // total income this month
  const totalIncome = incomes.reduce((sum, i) => sum + i.amount_cents, 0)

  const scenario = SCENARIOS.find((s) => s.key === activeScenario)!
  const projectedAdditional = avgDailySpend * daysRemaining * scenario.factor
  const projectedTotal = spentSoFar + projectedAdditional
  const projectedBalance = totalIncome - projectedTotal

  // recurring expenses not yet paid this month (due after today)
  const upcomingFixed = recurring
    .filter((r) => {
      // recurring expenses with a day_of_month field or just show all
      return true
    })
    .slice(0, 8)

  const suggestions = [
    avgDailySpend > 0 && `Reduzir gasto diário médio de ${formatCurrency(avgDailySpend)} pode economizar bastante.`,
    recurring.length > 0 && `Você tem ${recurring.length} gastos fixos — revise os desnecessários.`,
    projectedBalance < 0 && 'Projeção indica saldo negativo ao fim do mês.',
    projectedBalance >= 0 && 'Projeção indica saldo positivo — bom momento para poupar.',
  ].filter(Boolean) as string[]

  return (
    <div className="flex flex-col gap-8 transition-opacity duration-200">
      {/* Hero */}
      <Card>
        <CardContent className="pt-6 pb-6">
          <p className="eyebrow text-muted-foreground text-xs uppercase tracking-widest mb-2">
            Fim do mês · projetado
          </p>
          <p
            className="serif text-4xl font-semibold"
            style={{ color: projectedBalance >= 0 ? 'var(--ok)' : 'var(--accent)' }}
          >
            {projectedBalance >= 0 ? '' : '-'}{formatCurrency(Math.abs(projectedBalance))}
          </p>
          <p className="text-sm text-muted-foreground mt-2">
            Receitas {formatCurrency(totalIncome)} · Gastos projetados {formatCurrency(projectedTotal)}
          </p>
        </CardContent>
      </Card>

      {/* Cenários */}
      <div className="grid gap-4 sm:grid-cols-3">
        {SCENARIOS.map((s) => {
          const projAdditional = avgDailySpend * daysRemaining * s.factor
          const projBal = totalIncome - (spentSoFar + projAdditional)
          const isActive = activeScenario === s.key
          return (
            <button
              key={s.key}
              onClick={() => setActiveScenario(s.key)}
              className={`rounded-xl border p-4 text-left transition-all ${
                isActive
                  ? 'bg-foreground text-background border-foreground'
                  : 'bg-card hover:bg-muted/50'
              }`}
            >
              <p className={`text-xs font-medium uppercase tracking-wider mb-2 ${isActive ? 'text-background/70' : 'text-muted-foreground'}`}>
                {s.label}
              </p>
              <p className={`mono-num text-xl font-semibold ${isActive ? 'text-background' : projBal >= 0 ? '' : 'text-destructive'}`}
                style={isActive ? {} : { color: projBal >= 0 ? 'var(--ok)' : 'var(--accent)' }}
              >
                {projBal >= 0 ? '' : '-'}{formatCurrency(Math.abs(projBal))}
              </p>
              <p className={`text-xs mt-2 ${isActive ? 'text-background/60' : 'text-muted-foreground'}`}>
                {s.description}
              </p>
            </button>
          )
        })}
      </div>

      {/* Grid: sugestões + gastos fixos previstos */}
      <div className="grid gap-6 lg:grid-cols-[2fr_1fr]">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base font-medium">O que mudaria o jogo</CardTitle>
          </CardHeader>
          <CardContent>
            {suggestions.length === 0 ? (
              <p className="text-sm text-muted-foreground">Sem sugestões por enquanto.</p>
            ) : (
              <ul className="flex flex-col gap-3">
                {suggestions.map((s, i) => (
                  <li key={i} className="flex gap-2 text-sm">
                    <span className="mt-0.5 size-1.5 rounded-full bg-foreground shrink-0 mt-2" />
                    {s}
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base font-medium">Gastos fixos previstos</CardTitle>
          </CardHeader>
          <CardContent>
            {upcomingFixed.length === 0 ? (
              <p className="text-sm text-muted-foreground">Nenhum gasto fixo cadastrado.</p>
            ) : (
              <ul className="flex flex-col gap-3">
                {upcomingFixed.map((r) => (
                  <li key={r.id} className="flex items-center justify-between gap-2 text-sm">
                    <span className="truncate text-foreground">{r.description}</span>
                    <span className="tabular-nums font-medium shrink-0">
                      {formatCurrency(r.amount_cents)}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

// ─── página principal ─────────────────────────────────────────────────────────

export default function FluxoPage() {
  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-1">
        <h1 className="text-2xl font-semibold tracking-tight flex items-center gap-2">
          <ArrowLeftRight className="size-6 text-primary" />
          Fluxo &amp; Projeções
        </h1>
        <p className="text-muted-foreground">Realizado do mês e projeção até o fim.</p>
      </div>

      <Tabs defaultValue="realizado">
        <TabsList>
          <TabsTrigger value="realizado">Realizado</TabsTrigger>
          <TabsTrigger value="projecao">Projeção</TabsTrigger>
        </TabsList>
        <TabsContent value="realizado" className="mt-6">
          <TabRealizado />
        </TabsContent>
        <TabsContent value="projecao" className="mt-6">
          <TabProjecao />
        </TabsContent>
      </Tabs>
    </div>
  )
}

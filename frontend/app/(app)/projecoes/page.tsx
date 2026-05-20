'use client'

import { useEffect, useState } from 'react'
import {
  Bar,
  BarChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
  ReferenceLine,
  Legend,
} from 'recharts'
import { AlertCircle, ArrowRight, CheckCircle2, TrendingUp, Wallet, CheckSquare } from 'lucide-react'

import { projectionsService } from '@/lib/api'
import { toast } from 'sonner'
import type { ProjectionsSummary, FutureMonthProjection } from '@/lib/api/types'
import { formatCurrency } from '@/lib/format'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { StatsCard } from '@/components/stats-card'
import { 
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion'

export default function ProjectionsPage() {
  const [loading, setLoading] = useState(true)
  const [summary, setSummary] = useState<ProjectionsSummary | null>(null)

  useEffect(() => {
    void loadProjections()
  }, [])

  const loadProjections = async () => {
    try {
      setLoading(true)
      const data = await projectionsService.getFutureProjections(6)
      setSummary(data)
    } catch {
      toast.error('Não foi possível carregar as projeções. Tente novamente.')
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="flex h-[50vh] items-center justify-center">
        <p className="text-muted-foreground animate-pulse">Carregando projeções...</p>
      </div>
    )
  }

  if (!summary) {
    return (
      <div className="flex h-[50vh] flex-col items-center justify-center gap-4">
        <AlertCircle className="size-10 text-destructive" />
        <p className="text-muted-foreground">Não foi possível carregar as projeções.</p>
        <Button onClick={loadProjections}>Tentar novamente</Button>
      </div>
    )
  }

  // Find worst month
  let worstMonth: FutureMonthProjection | null = null
  for (const m of summary.months) {
    if (!worstMonth || m.committed_percentage > worstMonth.committed_percentage) {
      worstMonth = m
    }
  }

  // Calculate total relief (sum of finishing installments)
  const reliefAmount = summary.finishing_installments.reduce((sum, item) => sum + item.amount_cents, 0)

  // Format data for chart
  const chartData = summary.months.map(m => ({
    name: m.month.split(' de ')[0], // ex: "maio"
    fixo: m.total_fixed,
    parcelas: m.total_installments,
    renda: m.expected_income,
    percentage: m.committed_percentage
  }))

  const expectedIncome = summary.months[0]?.expected_income || 0

  return (
    <div className="flex flex-col gap-8">
      {/* Header */}
      <div className="flex flex-col gap-1">
        <h1 className="text-2xl font-semibold tracking-tight text-foreground">
          Projeções Financeiras
        </h1>
        <p className="text-muted-foreground">
          Visualize seus compromissos do mês atual e dos próximos 6 meses.
        </p>
      </div>

      {/* Stats Grid */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <StatsCard
          title="Média de Comprometimento"
          value={`${summary.average_commitment.toFixed(1)}%`}
          description="Da sua renda nos próximos 6 meses"
          icon={TrendingUp}
          trend={{
            value: 0, // could calculate trend
            isPositive: summary.average_commitment < 50
          }}
        />
        <StatsCard
          title="Mês mais Crítico"
          value={worstMonth ? worstMonth.month.split(' de ')[0] : '-'}
          description={worstMonth ? `${worstMonth.committed_percentage.toFixed(1)}% comprometido` : 'Sem dados'}
          icon={AlertCircle}
        />
        <StatsCard
          title="Alívio Financeiro"
          value={formatCurrency(reliefAmount)}
          description="Parcelas acabando no período"
          icon={Wallet}
          trend={{
            value: summary.finishing_installments.length,
            isPositive: true
          }}
        />
      </div>

      {/* Main Content Grid */}
      <div className="grid gap-6 lg:grid-cols-3">
        
        {/* Chart Column */}
        <div className="lg:col-span-2 flex flex-col gap-6">
          <Card className="flex-1">
            <CardHeader>
              <CardTitle>Comprometimento de Renda</CardTitle>
              <CardDescription>
                Gastos Fixos e Parcelas comparados à sua Renda Atual ({formatCurrency(expectedIncome)})
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="h-[300px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart
                    data={chartData}
                    margin={{ top: 20, right: 30, left: 20, bottom: 5 }}
                  >
                    <XAxis 
                      dataKey="name" 
                      axisLine={false}
                      tickLine={false}
                      tick={{ fill: 'currentColor', fontSize: 12, opacity: 0.7 }}
                      dy={10}
                      style={{ textTransform: 'capitalize' }}
                    />
                    <YAxis 
                      axisLine={false}
                      tickLine={false}
                      tick={{ fill: 'currentColor', fontSize: 12, opacity: 0.7 }}
                      tickFormatter={(value) =>
                        new Intl.NumberFormat('pt-BR', {
                          notation: 'compact',
                          compactDisplay: 'short',
                          style: 'currency',
                          currency: 'BRL',
                        }).format(value / 100)
                      }
                      dx={-10}
                    />
                    <Tooltip
                      cursor={{ fill: 'currentColor', opacity: 0.05 }}
                      content={({ active, payload, label }) => {
                        if (active && payload && payload.length) {
                          const data = payload[0].payload
                          return (
                            <div className="rounded-lg border bg-card p-3 shadow-lg">
                              <p className="mb-2 text-sm font-medium capitalize border-b pb-2">
                                {label}
                              </p>
                              <div className="flex flex-col gap-1 text-sm">
                                <div className="flex justify-between gap-4">
                                  <span className="flex items-center gap-2">
                                    <div className="size-2 rounded-full bg-slate-800 dark:bg-slate-200" />
                                    Gastos Fixos
                                  </span>
                                  <span className="font-semibold">{formatCurrency(data.fixo)}</span>
                                </div>
                                <div className="flex justify-between gap-4">
                                  <span className="flex items-center gap-2">
                                    <div className="size-2 rounded-full bg-slate-400 dark:bg-slate-600" />
                                    Parcelas
                                  </span>
                                  <span className="font-semibold">{formatCurrency(data.parcelas)}</span>
                                </div>
                                <div className="mt-2 flex justify-between gap-4 border-t pt-2">
                                  <span className="font-medium text-muted-foreground">Renda Estimada</span>
                                  <span className="font-semibold">{formatCurrency(data.renda)}</span>
                                </div>
                                <div className="flex justify-between gap-4">
                                  <span className="font-medium text-muted-foreground">Comprometido</span>
                                  <span className={`font-semibold ${data.percentage > 80 ? 'text-destructive' : ''}`}>
                                    {data.percentage.toFixed(1)}%
                                  </span>
                                </div>
                              </div>
                            </div>
                          )
                        }
                        return null
                      }}
                    />
                    <Legend 
                      verticalAlign="top" 
                      height={36}
                      iconType="circle"
                      formatter={(value) => <span className="text-sm capitalize ml-1">{value}</span>}
                    />
                    <Bar dataKey="fixo" name="Gastos Fixos" stackId="a" fill="currentColor" className="fill-slate-800 dark:fill-slate-200" radius={[0, 0, 4, 4]} />
                    <Bar dataKey="parcelas" name="Parcelas" stackId="a" fill="currentColor" className="fill-slate-400 dark:fill-slate-600" radius={[4, 4, 0, 0]} />
                    
                    {expectedIncome > 0 && (
                      <ReferenceLine 
                        y={expectedIncome} 
                        stroke="currentColor" 
                        strokeDasharray="3 3"
                        className="text-primary opacity-50"
                      />
                    )}
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Finishing Installments Column */}
        <div className="flex flex-col gap-6">
          <Card className="flex-1">
            <CardHeader className="pb-4">
              <CardTitle className="flex items-center gap-2 text-base">
                <CheckSquare className="size-5 text-primary" />
                Respiro Financeiro
              </CardTitle>
              <CardDescription>
                Parcelas finalizando nestes meses
              </CardDescription>
            </CardHeader>
            <CardContent>
              {summary.finishing_installments.length > 0 ? (
                <div className="flex flex-col gap-4">
                  {summary.finishing_installments.map((inst, idx) => (
                    <div key={`${inst.id}-${idx}`} className="flex items-start justify-between rounded-lg border p-3 transition-colors hover:bg-muted/50">
                      <div className="flex flex-col gap-1">
                        <span className="text-sm font-medium leading-none">{inst.description}</span>
                        <span className="text-xs text-muted-foreground">
                          Termina em <strong className="capitalize text-foreground">{inst.month}</strong>
                        </span>
                        <div className="mt-1 flex items-center gap-1.5">
                          <div className="h-1.5 w-16 overflow-hidden rounded-full bg-muted">
                            <div 
                              className="h-full bg-primary" 
                              style={{ width: `${(inst.installment_index / inst.installments_count) * 100}%` }}
                            />
                          </div>
                          <span className="text-[10px] text-muted-foreground font-medium">
                            {inst.installment_index}/{inst.installments_count}
                          </span>
                        </div>
                      </div>
                      <span className="font-semibold tabular-nums text-sm">
                        {formatCurrency(inst.amount_cents)}
                      </span>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center gap-2 py-8 text-center text-muted-foreground">
                  <CheckCircle2 className="size-8 opacity-20" />
                  <p className="text-sm">Nenhuma parcela finalizando<br/>neste semestre.</p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Details List */}
      <div className="flex flex-col gap-4">
        <h2 className="text-lg font-semibold">Detalhamento Mês a Mês</h2>
        <Card>
          <CardContent className="p-0">
            <Accordion type="single" collapsible className="w-full">
              {summary.months.map((m, idx) => (
                <AccordionItem key={idx} value={`month-${idx}`} className={idx === summary.months.length - 1 ? "border-0" : ""}>
                  <AccordionTrigger className="px-6 hover:no-underline hover:bg-muted/30">
                    <div className="flex w-full items-center justify-between pr-4">
                      <div className="flex items-center gap-3">
                        <span className="font-medium capitalize">{m.month}</span>
                        {m.is_current_month && (
                          <span className="rounded-full bg-primary/10 px-2 py-0.5 text-xs font-medium text-primary">
                            Atual
                          </span>
                        )}
                        <span className="text-sm text-muted-foreground hidden sm:inline-block">
                          {m.items.length} itens
                        </span>
                      </div>
                      <div className="flex items-center gap-6">
                        <div className="flex flex-col items-end text-sm">
                          <span className="text-muted-foreground text-xs">Comprometido</span>
                          <span className={`font-semibold ${m.committed_percentage > 80 ? 'text-destructive' : ''}`}>
                            {m.committed_percentage.toFixed(1)}%
                          </span>
                        </div>
                        <div className="flex flex-col items-end text-sm">
                          <span className="text-muted-foreground text-xs">Total</span>
                          <span className="font-semibold tabular-nums">
                            {formatCurrency(m.total_fixed + m.total_installments)}
                          </span>
                        </div>
                      </div>
                    </div>
                  </AccordionTrigger>
                  <AccordionContent className="px-6 pb-4">
                    <div className="space-y-4 pt-4">
                      {m.items.length > 0 ? (
                        <div className="rounded-md border">
                          <table className="w-full text-sm">
                            <thead>
                              <tr className="border-b bg-muted/50">
                                <th className="px-4 py-2 text-left font-medium text-muted-foreground">Descrição</th>
                                <th className="px-4 py-2 text-left font-medium text-muted-foreground hidden sm:table-cell">Tipo</th>
                                <th className="px-4 py-2 text-right font-medium text-muted-foreground">Valor</th>
                              </tr>
                            </thead>
                            <tbody>
                              {m.items.map((item, itemIdx) => (
                                <tr key={itemIdx} className="border-b last:border-0 hover:bg-muted/20">
                                  <td className="px-4 py-3">
                                    <div className="flex flex-col">
                                      <span className="font-medium">{item.description}</span>
                                      {item.installments_count && item.installments_count > 0 && (
                                        <span className="text-xs text-muted-foreground mt-0.5">
                                          Parcela {item.installment_index}/{item.installments_count}
                                        </span>
                                      )}
                                    </div>
                                  </td>
                                  <td className="px-4 py-3 hidden sm:table-cell">
                                    <span className="inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-semibold bg-muted/30">
                                      {item.source === 'recurring' ? 'Fixo' : 'Parcela'}
                                    </span>
                                  </td>
                                  <td className="px-4 py-3 text-right font-medium tabular-nums">
                                    {formatCurrency(item.amount_cents)}
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      ) : (
                        <p className="text-sm text-muted-foreground text-center py-2">Sem gastos projetados para este mês.</p>
                      )}
                    </div>
                  </AccordionContent>
                </AccordionItem>
              ))}
            </Accordion>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

'use client'

import { useEffect, useMemo, useState } from 'react'
import { ChevronLeft, ChevronRight, Receipt, CalendarClock, TrendingDown, Calculator } from 'lucide-react'

import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { ScrollArea } from '@/components/ui/scroll-area'
import { calendarService, paymentMethodsService, type MonthExpenseItem, type PaymentMethod, type MonthExpensesResponse } from '@/lib/api'
import { formatCurrency } from '@/lib/format'

const WEEKDAYS = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sab']
const WEEKDAYS_SHORT = ['D', 'S', 'T', 'Q', 'Q', 'S', 'S']

function getMonthName(monthIndex: number, year: number): string {
  return new Date(year, monthIndex, 1)
    .toLocaleDateString('pt-BR', { month: 'long' })
    .replace(/^\w/, c => c.toUpperCase())
}

interface DayData {
  date: Date
  dateKey: string
  realExpenses: MonthExpenseItem[]
  recurringExpenses: MonthExpenseItem[]
  total: number
  isToday: boolean
}

export default function CalendarioPage() {
  const today = new Date()
  const [currentDate, setCurrentDate] = useState(new Date(today.getFullYear(), today.getMonth(), 1))
  const [selectedDay, setSelectedDay] = useState<DayData | null>(null)
  const [monthData, setMonthData] = useState<MonthExpensesResponse | null>(null)
  const [items, setItems] = useState<MonthExpenseItem[]>([])
  const [paymentMethods, setPaymentMethods] = useState<PaymentMethod[]>([])
  const [loading, setLoading] = useState(true)
  const [maxInstallmentMonth, setMaxInstallmentMonth] = useState<string | null>(null)

  const [isSimulatorOpen, setIsSimulatorOpen] = useState(false)
  const [simulatedValue, setSimulatedValue] = useState('')

  const year = currentDate.getFullYear()
  const month = currentDate.getMonth()
  const currentMonthKey = `${year}-${String(month + 1).padStart(2, '0')}`

  useEffect(() => {
    void loadCalendarMonth()
  }, [year, month])

  useEffect(() => {
    void loadMaxInstallmentMonth()
  }, [])

  const loadMaxInstallmentMonth = async () => {
    try {
      const maxMonth = await calendarService.getMaxInstallmentMonth()
      setMaxInstallmentMonth(maxMonth)
    } catch {
      setMaxInstallmentMonth(currentMonthKey)
    }
  }

  const loadCalendarMonth = async () => {
    try {
      setLoading(true)
      const [monthDataRes, pmData] = await Promise.all([
        calendarService.getMonthExpenses(year, month + 1),
        paymentMethodsService.list(),
      ])
      setMonthData(monthDataRes)
      setItems(monthDataRes.items)
      setPaymentMethods(pmData)
      setSelectedDay(null)
    } finally {
      setLoading(false)
    }
  }

  const calendarDays = useMemo(() => {
    const firstDayOfMonth = new Date(year, month, 1)
    const lastDayOfMonth = new Date(year, month + 1, 0)
    const startWeekday = firstDayOfMonth.getDay()
    const daysInMonth = lastDayOfMonth.getDate()

    const days: Array<DayData | null> = []

    for (let i = 0; i < startWeekday; i++) {
      days.push(null)
    }

    for (let day = 1; day <= daysInMonth; day++) {
      const date = new Date(year, month, day)
      const dateKey = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`
      const isToday =
        date.getDate() === today.getDate() &&
        date.getMonth() === today.getMonth() &&
        date.getFullYear() === today.getFullYear()

      const dayItems = items.filter((item) => item.date === dateKey)
      const realExpenses = dayItems.filter((item) => item.source === 'expense')
      const recurringExpenses = dayItems.filter((item) => item.source === 'recurring')
      const total = dayItems.reduce((sum, item) => sum + item.amount_cents, 0)

      days.push({ date, dateKey, realExpenses, recurringExpenses, total, isToday })
    }

    return days
  }, [items, month, today, year])

  const monthTotals = useMemo(() => {
    let expensesTotal = 0
    let recurringTotal = 0
    let expensesCount = 0
    let recurringCount = 0

    for (const day of calendarDays) {
      if (!day) continue
      expensesTotal += day.realExpenses.reduce((sum, e) => sum + e.amount_cents, 0)
      recurringTotal += day.recurringExpenses.reduce((sum, e) => sum + e.amount_cents, 0)
      expensesCount += day.realExpenses.length
      recurringCount += day.recurringExpenses.length
    }

    return { expensesTotal, recurringTotal, expensesCount, recurringCount }
  }, [calendarDays])

  const canGoNext = !maxInstallmentMonth || currentMonthKey < maxInstallmentMonth

  const goToPreviousMonth = () => {
    setCurrentDate(new Date(year, month - 1, 1))
  }

  const goToNextMonth = () => {
    if (!canGoNext) return
    setCurrentDate(new Date(year, month + 1, 1))
  }

  const goToToday = () => {
    const now = new Date()
    setCurrentDate(new Date(now.getFullYear(), now.getMonth(), 1))
    setSelectedDay(null)
  }

  const getPaymentMethodLabel = (id?: string) => {
    if (!id) return 'N/A'
    return paymentMethods.find((pm) => pm.id === id)?.label || id
  }

  const getIntensityClass = (total: number) => {
    if (total === 0) return ''
    if (total < 5000) return 'bg-chart-1/20'
    if (total < 15000) return 'bg-chart-1/40'
    if (total < 30000) return 'bg-chart-1/60'
    return 'bg-chart-1/80'
  }

  // Simulation calculations
  const daysInMonth = new Date(year, month + 1, 0).getDate()
  const parsedSimulatedValue = parseFloat(simulatedValue.replace(/\./g, '').replace(',', '.')) || 0
  const simulatedExpenseCents = parsedSimulatedValue * 100

  const currentBalance = monthData?.balance || 0
  const currentDailyBudget = currentBalance / daysInMonth
  const simulatedBalance = currentBalance - simulatedExpenseCents
  const simulatedDailyBudget = simulatedBalance / daysInMonth
  const dailyImpact = currentDailyBudget - simulatedDailyBudget

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-foreground">Calendario</h1>
          <p className="text-sm text-muted-foreground">
            Visualize gastos por dia (gastos, parcelas e recorrentes).
          </p>
        </div>
        <Button 
          variant={isSimulatorOpen ? "secondary" : "outline"}
          onClick={() => setIsSimulatorOpen(!isSimulatorOpen)}
          className="gap-2"
        >
          <Calculator className="size-4" />
          Simulador
        </Button>
      </div>

      {isSimulatorOpen && (
        <Card className="bg-primary/5 border-primary/20 animate-in fade-in slide-in-from-top-2">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Calculator className="size-4 text-primary" />
              Simulador de Orçamento
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4 items-end">
              <div className="space-y-1">
                <p className="text-xs text-muted-foreground">Saldo do Mês</p>
                <p className="text-sm font-semibold">{formatCurrency(currentBalance)}</p>
              </div>
              <div className="space-y-1">
                <p className="text-xs text-muted-foreground">Disponível por Dia ({daysInMonth} dias)</p>
                <p className="text-sm font-semibold text-primary">{formatCurrency(currentDailyBudget)}/dia</p>
              </div>
              
              <div className="space-y-2 col-span-full sm:col-span-2 lg:col-span-2">
                <p className="text-xs font-medium">Simular novo gasto (R$)</p>
                <div className="flex gap-4 items-center">
                  <Input 
                    className="max-w-[150px]"
                    placeholder="0,00"
                    value={simulatedValue}
                    onChange={(e) => {
                      let val = e.target.value.replace(/[^\d,]/g, '')
                      const parts = val.split(',')
                      if (parts.length > 2) val = parts[0] + ',' + parts.slice(1).join('')
                      setSimulatedValue(val)
                    }}
                  />
                  {simulatedExpenseCents > 0 && (
                    <div className="flex flex-col">
                      <span className="text-xs font-medium text-destructive">
                        Novo saldo: {formatCurrency(simulatedBalance)}
                      </span>
                      <span className="text-xs text-muted-foreground">
                        Novo disponível: <strong className="text-foreground">{formatCurrency(simulatedDailyBudget)}/dia</strong>
                      </span>
                      <span className="text-[10px] text-destructive">
                        (Impacto de -{formatCurrency(dailyImpact)} por dia)
                      </span>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      <div className="grid gap-3 grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardContent className="p-3 sm:p-4">
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:gap-3">
              <div className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-chart-1/10 sm:size-10">
                <Receipt className="size-4 text-chart-1 sm:size-5" />
              </div>
              <div className="min-w-0">
                <p className="text-[10px] text-muted-foreground sm:text-xs">Gastos variaveis</p>
                <p className="text-sm font-semibold sm:text-lg">{formatCurrency(monthTotals.expensesTotal)}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-3 sm:p-4">
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:gap-3">
              <div className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-chart-2/10 sm:size-10">
                <CalendarClock className="size-4 text-chart-2 sm:size-5" />
              </div>
              <div className="min-w-0">
                <p className="text-[10px] text-muted-foreground sm:text-xs">Gastos fixos</p>
                <p className="text-sm font-semibold sm:text-lg">{formatCurrency(monthTotals.recurringTotal)}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-3 sm:p-4">
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:gap-3">
              <div className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-chart-4/10 sm:size-10">
                <Receipt className="size-4 text-chart-4 sm:size-5" />
              </div>
              <div className="min-w-0">
                <p className="text-[10px] text-muted-foreground sm:text-xs">Transacoes</p>
                <p className="text-sm font-semibold sm:text-lg">
                  {monthTotals.expensesCount + monthTotals.recurringCount}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="col-span-2 lg:col-span-1 bg-destructive/5 border-destructive/20">
          <CardContent className="p-3 sm:p-4">
            <div className="flex items-center gap-3">
              <div className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-destructive/10 sm:size-10">
                <TrendingDown className="size-4 text-destructive sm:size-5" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-[10px] text-muted-foreground sm:text-xs">Total do mes</p>
                <p className="text-base font-bold text-destructive sm:text-xl">
                  {formatCurrency(monthTotals.expensesTotal + monthTotals.recurringTotal)}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader className="flex flex-row items-center justify-between gap-2 pb-2">
            <CardTitle className="text-base font-medium sm:text-lg">
              {getMonthName(month, year)} {year}
            </CardTitle>
            <div className="flex items-center gap-1 sm:gap-2">
              <Button variant="ghost" size="sm" onClick={goToToday} className="hidden text-xs sm:inline-flex">
                Hoje
              </Button>
              <Button variant="outline" size="icon" className="size-8" onClick={goToPreviousMonth}>
                <ChevronLeft className="size-4" />
              </Button>
              <Button variant="outline" size="icon" className="size-8" onClick={goToNextMonth} disabled={!canGoNext}>
                <ChevronRight className="size-4" />
              </Button>
            </div>
          </CardHeader>
          <CardContent className="px-3 sm:px-6">
            <div className="mb-1 grid grid-cols-7 gap-0.5 sm:gap-1 sm:mb-2">
              {WEEKDAYS.map((day, i) => (
                <div key={day} className="py-1.5 text-center text-[10px] font-medium text-muted-foreground sm:py-2 sm:text-xs">
                  <span className="hidden sm:inline">{day}</span>
                  <span className="sm:hidden">{WEEKDAYS_SHORT[i]}</span>
                </div>
              ))}
            </div>

            <div className="grid grid-cols-7 gap-0.5 sm:gap-1">
              {calendarDays.map((day, index) => (
                <button
                  key={index}
                  onClick={() => day && setSelectedDay(day)}
                  disabled={!day}
                  className={`
                    relative flex min-h-[52px] flex-col items-start rounded-md border p-1 text-left transition-all sm:min-h-[72px] sm:rounded-lg sm:p-1.5
                    ${!day ? 'cursor-default border-transparent bg-transparent' : 'border-border/50 hover:border-primary/50 hover:bg-accent/50'}
                    ${day && selectedDay?.dateKey === day.dateKey ? 'border-primary bg-primary/5 ring-1 ring-primary' : ''}
                    ${day && day.isToday ? 'ring-2 ring-primary/50 ring-offset-1 ring-offset-background' : ''}
                    ${day ? getIntensityClass(day.total) : ''}
                  `}
                >
                  {day && (
                    <>
                      <span
                        className={`text-[10px] font-medium sm:text-xs ${
                          day.isToday ? 'flex size-5 items-center justify-center rounded-full bg-primary text-primary-foreground sm:size-6' : ''
                        }`}
                      >
                        {day.date.getDate()}
                      </span>
                      {day.total > 0 && (
                        <span className="mt-auto hidden text-[9px] font-medium text-foreground/70 sm:block sm:text-[10px]">
                          {formatCurrency(day.total).replace('R$', '').trim()}
                        </span>
                      )}
                      {(day.realExpenses.length > 0 || day.recurringExpenses.length > 0) && (
                        <div className="absolute bottom-0.5 right-0.5 flex gap-0.5 sm:bottom-1 sm:right-1">
                          {day.realExpenses.length > 0 && <span className="size-1 rounded-full bg-chart-1 sm:size-1.5" />}
                          {day.recurringExpenses.length > 0 && <span className="size-1 rounded-full bg-chart-2 sm:size-1.5" />}
                        </div>
                      )}
                    </>
                  )}
                </button>
              ))}
            </div>

            <div className="mt-3 flex flex-wrap items-center justify-center gap-3 text-[10px] text-muted-foreground sm:mt-4 sm:gap-4 sm:text-xs">
              <div className="flex items-center gap-1.5">
                <span className="size-1.5 rounded-full bg-chart-1 sm:size-2" />
                <span>Variaveis</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="size-1.5 rounded-full bg-chart-2 sm:size-2" />
                <span>Recorrentes</span>
              </div>
              {maxInstallmentMonth && (
                <div className="text-[10px] sm:text-xs">Limite futuro por parcelas: {maxInstallmentMonth}</div>
              )}
            </div>
          </CardContent>
        </Card>

        <Card className="flex flex-col">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center justify-between text-base font-medium">
              <span>
                {selectedDay ? `${selectedDay.date.getDate()} de ${getMonthName(selectedDay.date.getMonth(), selectedDay.date.getFullYear())}` : 'Selecione um dia'}
              </span>
              {selectedDay?.isToday && <Badge variant="secondary" className="text-[10px]">Hoje</Badge>}
            </CardTitle>
          </CardHeader>
          <CardContent className="flex-1">
            {loading ? (
              <div className="flex h-full min-h-[200px] flex-col items-center justify-center text-center">
                <p className="text-sm text-muted-foreground">Carregando...</p>
              </div>
            ) : !selectedDay ? (
              <div className="flex h-full min-h-[200px] flex-col items-center justify-center text-center">
                <CalendarClock className="mb-3 size-10 text-muted-foreground/50" />
                <p className="text-sm text-muted-foreground">Clique em um dia para ver os detalhes.</p>
              </div>
            ) : selectedDay.realExpenses.length === 0 && selectedDay.recurringExpenses.length === 0 ? (
              <div className="flex h-full min-h-[200px] flex-col items-center justify-center text-center">
                <Receipt className="mb-3 size-10 text-muted-foreground/50" />
                <p className="text-sm font-medium text-muted-foreground">Nenhum gasto</p>
              </div>
            ) : (
              <div className="flex flex-col gap-4">
                <ScrollArea className="max-h-[320px] pr-3 lg:max-h-[400px]">
                  <div className="space-y-4">
                    {selectedDay.realExpenses.length > 0 && (
                      <div>
                        <h4 className="mb-2 flex items-center gap-2 text-xs font-medium text-muted-foreground">
                          <Receipt className="size-3" />
                          Gastos e parcelas ({selectedDay.realExpenses.length})
                        </h4>
                        <div className="space-y-2">
                          {selectedDay.realExpenses.map((expense) => (
                            <div
                              key={`${expense.id}-${expense.source}-${expense.installment_index || 0}`}
                              className="flex items-start justify-between gap-2 rounded-lg border border-border bg-card p-2.5 sm:p-3"
                            >
                              <div className="flex items-start gap-2 sm:gap-3 min-w-0">
                                <div className="mt-1 size-2 shrink-0 rounded-full bg-chart-1" />
                                <div className="min-w-0">
                                  <p className="text-sm font-medium truncate">{expense.description}</p>
                                  <p className="text-[10px] text-muted-foreground sm:text-xs">
                                    {expense.category || 'Sem categoria'}
                                  </p>
                                  <p className="text-[10px] text-muted-foreground/70">
                                    {getPaymentMethodLabel(expense.payment_method_id)}
                                    {expense.installments_count && expense.installment_index
                                      ? ` - ${expense.installment_index}/${expense.installments_count}x`
                                      : ''}
                                  </p>
                                </div>
                              </div>
                              <span className="shrink-0 text-xs font-semibold text-destructive sm:text-sm">
                                {formatCurrency(expense.amount_cents)}
                              </span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {selectedDay.recurringExpenses.length > 0 && (
                      <div>
                        <h4 className="mb-2 flex items-center gap-2 text-xs font-medium text-muted-foreground">
                          <CalendarClock className="size-3" />
                          Gastos fixos ({selectedDay.recurringExpenses.length})
                        </h4>
                        <div className="space-y-2">
                          {selectedDay.recurringExpenses.map((recurring) => (
                            <div
                              key={`${recurring.recurring_id || recurring.id}-${recurring.date}`}
                              className="flex items-start justify-between gap-2 rounded-lg border border-dashed border-chart-2/50 bg-chart-2/5 p-2.5 sm:p-3"
                            >
                              <div className="flex items-start gap-2 sm:gap-3 min-w-0">
                                <div className="mt-1 size-2 shrink-0 rounded-full bg-chart-2" />
                                <div className="min-w-0">
                                  <p className="text-sm font-medium truncate">{recurring.description}</p>
                                  <p className="text-[10px] text-muted-foreground sm:text-xs">
                                    {recurring.category || 'Sem categoria'}
                                  </p>
                                  <p className="text-[10px] text-muted-foreground/70">
                                    {getPaymentMethodLabel(recurring.payment_method_id)}
                                  </p>
                                </div>
                              </div>
                              <span className="shrink-0 text-xs font-semibold text-chart-2 sm:text-sm">
                                {formatCurrency(recurring.amount_cents)}
                              </span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </ScrollArea>

                <div className="border-t border-border pt-3 mt-auto">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium">Total do dia</span>
                    <span className="text-base font-bold text-foreground">{formatCurrency(selectedDay.total)}</span>
                  </div>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}


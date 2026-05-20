'use client'

import { useEffect, useMemo, useState } from 'react'
import { ChevronLeft, ChevronRight } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { calendarService, type MonthExpenseItem, type MonthExpensesResponse } from '@/lib/api'
import { formatCurrency } from '@/lib/format'

const WEEKDAYS = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb']

function getMonthName(monthIndex: number, year: number): string {
  return new Date(year, monthIndex, 1)
    .toLocaleDateString('pt-BR', { month: 'long' })
    .replace(/^\w/, (c) => c.toUpperCase())
}

interface DayData {
  date: Date
  dateKey: string
  allExpenses: MonthExpenseItem[]
  hasRecurring: boolean
  total: number
  isToday: boolean
  isFuture: boolean
}

export default function CalendarioPage() {
  const today = new Date()
  const [currentDate, setCurrentDate] = useState(new Date(today.getFullYear(), today.getMonth(), 1))
  const [selectedDate, setSelectedDate] = useState<Date>(today)
  const [monthData, setMonthData] = useState<MonthExpensesResponse | null>(null)
  const [loading, setLoading] = useState(true)

  const year = currentDate.getFullYear()
  const month = currentDate.getMonth()

  useEffect(() => {
    void loadMonth()
  }, [year, month])

  const loadMonth = async () => {
    try {
      setLoading(true)
      const data = await calendarService.getMonthExpenses(year, month + 1)
      setMonthData(data)
    } finally {
      setLoading(false)
    }
  }

  const items = monthData?.items ?? []

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
      const isFuture = date > today

      const dayItems = items.filter((item) => item.date === dateKey)
      const hasRecurring = dayItems.some((item) => item.source === 'recurring')
      const total = dayItems.reduce((sum, item) => sum + item.amount_cents, 0)

      days.push({ date, dateKey, allExpenses: dayItems, hasRecurring, total, isToday, isFuture })
    }

    return days
  }, [items, month, year])

  const maxDayTotal = useMemo(() => {
    return calendarDays.reduce((max, day) => {
      if (!day || day.isFuture) return max
      return Math.max(max, day.total)
    }, 1)
  }, [calendarDays])

  const dailyAverage = useMemo(() => {
    const pastDays = calendarDays.filter((d) => d && !d.isFuture && d.total > 0)
    if (pastDays.length === 0) return 0
    const sum = pastDays.reduce((acc, d) => acc + (d?.total ?? 0), 0)
    return sum / pastDays.length
  }, [calendarDays])

  const selectedDateKey = `${selectedDate.getFullYear()}-${String(selectedDate.getMonth() + 1).padStart(2, '0')}-${String(selectedDate.getDate()).padStart(2, '0')}`
  const selectedDayData = calendarDays.find((d) => d?.dateKey === selectedDateKey) ?? null

  const goToPreviousMonth = () => setCurrentDate(new Date(year, month - 1, 1))
  const goToNextMonth = () => setCurrentDate(new Date(year, month + 1, 1))
  const goToToday = () => {
    const now = new Date()
    setCurrentDate(new Date(now.getFullYear(), now.getMonth(), 1))
    setSelectedDate(now)
  }

  const isCurrentMonth =
    year === today.getFullYear() && month === today.getMonth()

  return (
    <div className="grid gap-6" style={{ gridTemplateColumns: '1fr 360px' }}>
      {/* Card Calendário */}
      <div className="rounded-xl border border-border bg-card p-5">
        {/* Header */}
        <div className="mb-4 flex items-center justify-between">
          <span className="text-base font-semibold tracking-tight">
            {getMonthName(month, year)} · {year}
          </span>
          <div className="flex items-center gap-1">
            <button
              onClick={goToToday}
              className="rounded-full border border-border px-3 py-0.5 text-xs font-medium hover:bg-accent transition-colors"
            >
              Hoje
            </button>
            <Button variant="ghost" size="icon" className="size-8" onClick={goToPreviousMonth}>
              <ChevronLeft className="size-4" />
            </Button>
            <Button variant="ghost" size="icon" className="size-8" onClick={goToNextMonth}>
              <ChevronRight className="size-4" />
            </Button>
          </div>
        </div>

        {/* Weekday headers */}
        <div className="mb-1 grid grid-cols-7">
          {WEEKDAYS.map((day) => (
            <div
              key={day}
              className="py-1 text-center text-[10px] font-medium uppercase tracking-wider text-muted-foreground"
            >
              {day}
            </div>
          ))}
        </div>

        {/* Day grid */}
        <div className="grid grid-cols-7 gap-1">
          {calendarDays.map((day, index) => {
            if (!day) {
              return <div key={`empty-${index}`} />
            }

            const intensity = day.isFuture || day.total === 0
              ? 0
              : (day.total / maxDayTotal) * 60

            const isSelected = day.dateKey === selectedDateKey

            return (
              <button
                key={day.dateKey}
                onClick={() => setSelectedDate(day.date)}
                style={{
                  aspectRatio: '1 / 1.15',
                  backgroundColor:
                    day.isToday
                      ? 'var(--primary)'
                      : intensity > 0
                      ? `color-mix(in srgb, var(--accent) ${intensity}%, var(--card))`
                      : undefined,
                  opacity: day.isFuture ? 0.55 : 1,
                  outline: isSelected && !day.isToday ? '1.5px solid var(--foreground)' : undefined,
                  outlineOffset: '-1.5px',
                }}
                className="relative flex flex-col items-start rounded-md p-1 text-left transition-colors hover:bg-accent/40"
              >
                {/* Bolinha gasto fixo */}
                {day.hasRecurring && (
                  <span
                    className="absolute right-1 top-1 size-[5px] rounded-full"
                    style={{ backgroundColor: 'var(--primary)' }}
                  />
                )}

                {/* Número do dia */}
                <span
                  className="text-[11px] font-medium leading-none"
                  style={{ color: day.isToday ? 'var(--primary-foreground)' : undefined }}
                >
                  {day.date.getDate()}
                </span>

                {/* Valor mono pequeno */}
                {day.total > 0 && !day.isFuture && (
                  <span
                    className="mt-auto font-mono text-[9px] leading-none"
                    style={{ color: day.isToday ? 'var(--primary-foreground)' : 'var(--muted-foreground)' }}
                  >
                    {(day.total / 100).toLocaleString('pt-BR', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
                  </span>
                )}
              </button>
            )
          })}
        </div>

        {/* Legenda */}
        <div className="mt-4 flex items-center gap-4 text-[11px] text-muted-foreground">
          <div className="flex items-center gap-1.5">
            <span
              className="size-3 rounded-sm"
              style={{ backgroundColor: `color-mix(in srgb, var(--accent) 45%, var(--card))` }}
            />
            <span>Variáveis (intensidade = valor)</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span
              className="size-[5px] rounded-full"
              style={{ backgroundColor: 'var(--primary)' }}
            />
            <span>Gasto fixo no dia</span>
          </div>
        </div>
      </div>

      {/* Card Detalhe */}
      <div className="sticky top-4 self-start rounded-xl border border-border bg-card p-5">
        {loading ? (
          <p className="text-sm text-muted-foreground">Carregando...</p>
        ) : (
          <>
            {/* Header painel */}
            <div className="mb-4">
              <p className="text-[10px] font-medium uppercase tracking-widest text-muted-foreground">
                {getMonthName(selectedDate.getMonth(), selectedDate.getFullYear())} {selectedDate.getFullYear()}
              </p>
              <div className="mt-0.5 flex items-end gap-2">
                <span className="font-serif text-[48px] font-light leading-none">
                  {selectedDate.getDate()}
                </span>
                {selectedDayData?.isToday && (
                  <span className="mb-1 rounded-full border border-border px-2 py-0.5 text-[10px] font-medium">
                    hoje
                  </span>
                )}
              </div>
              {selectedDayData && selectedDayData.total > 0 && (
                <p className="mt-1 font-mono text-base font-semibold">
                  {formatCurrency(selectedDayData.total)}
                </p>
              )}
            </div>

            {/* Lista de transações */}
            {!selectedDayData || selectedDayData.allExpenses.length === 0 ? (
              <p className="text-sm text-muted-foreground">Nenhum gasto neste dia.</p>
            ) : (
              <div className="space-y-2">
                {selectedDayData.allExpenses.map((expense) => (
                  <div
                    key={`${expense.id}-${expense.source}-${expense.installment_index ?? 0}`}
                    className="flex items-center justify-between gap-2"
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      <span
                        className="size-2 shrink-0 rounded-full"
                        style={{
                          backgroundColor:
                            expense.source === 'recurring'
                              ? 'var(--chart-2)'
                              : 'var(--chart-1)',
                        }}
                      />
                      <span className="truncate text-sm">{expense.description}</span>
                    </div>
                    <span className="shrink-0 font-mono text-sm font-medium">
                      {formatCurrency(expense.amount_cents)}
                    </span>
                  </div>
                ))}
              </div>
            )}

            {/* Insight: acima da média */}
            {selectedDayData &&
              selectedDayData.total > 0 &&
              !selectedDayData.isFuture &&
              dailyAverage > 0 &&
              selectedDayData.total > dailyAverage && (
                <div
                  className="mt-4 rounded-lg p-3 text-xs"
                  style={{ backgroundColor: 'color-mix(in srgb, var(--accent) 60%, var(--card))' }}
                >
                  Este dia ficou{' '}
                  <strong>
                    {Math.round(((selectedDayData.total - dailyAverage) / dailyAverage) * 100)}%
                  </strong>{' '}
                  acima da média diária do mês ({formatCurrency(Math.round(dailyAverage))})
                </div>
              )}
          </>
        )}
      </div>
    </div>
  )
}

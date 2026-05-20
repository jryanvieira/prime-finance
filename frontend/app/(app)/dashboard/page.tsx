'use client'

import { useState } from 'react'
import Link from 'next/link'
import { ArrowRight, Bell, Eye, EyeOff, Plus, TrendingUp, TrendingDown } from 'lucide-react'

import { toast } from 'sonner'
import { cn } from '@/lib/utils'
import { formatCurrency } from '@/lib/format'
import { OnboardingWizard } from '@/components/onboarding-wizard'
import { Button } from '@/components/ui/button'
import { ExpenseCard } from '@/components/expense-card'
import { ExpenseChart } from '@/components/expense-chart'
import { Sparkline } from '@/components/sparkline'
import { DonutChart } from '@/components/donut-chart'
import {
  useDashboardExpenses,
  useDashboardRecurring,
  useDashboardRecurringTotal,
  useDashboardPaymentMethods,
  useDashboardEvolution,
  useDashboardIncomes,
  useDashboardCategorySummary,
  useDashboardCategories,
  useDashboardBudgets,
  useDashboardGoals,
  useDashboardMe,
  useDashboardInvalidate,
} from '@/hooks/use-dashboard'

const MONTH_NAMES = [
  'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
  'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro',
]

const MONTH_ABBR = [
  'Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun',
  'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez',
]

// Cores das categorias por slug/nome aproximado
const CAT_COLOR_MAP: Record<string, string> = {
  alimentação: 'var(--cat-alim)',
  compras: 'var(--cat-comp)',
  transporte: 'var(--cat-tran)',
  educação: 'var(--cat-educ)',
  assinaturas: 'var(--cat-assi)',
  saúde: 'var(--cat-saud)',
  lazer: 'var(--cat-lazr)',
  outros: 'var(--cat-outros)',
}

function catColor(name?: string): string {
  if (!name) return 'var(--cat-outros)'
  const lower = name.toLowerCase()
  for (const [key, color] of Object.entries(CAT_COLOR_MAP)) {
    if (lower.includes(key)) return color
  }
  return 'var(--cat-outros)'
}

export default function DashboardPage() {
  const [showOnboarding, setShowOnboarding] = useState(false)
  const [privacyMode, setPrivacyMode] = useState(false)
  const invalidateDashboard = useDashboardInvalidate()

  const meQuery = useDashboardMe()
  const expensesQuery = useDashboardExpenses()
  const recurringQuery = useDashboardRecurring()
  const recurringTotalQuery = useDashboardRecurringTotal()
  const paymentMethodsQuery = useDashboardPaymentMethods()
  const evolutionQuery = useDashboardEvolution()
  const incomesQuery = useDashboardIncomes()
  const categorySummaryQuery = useDashboardCategorySummary()
  const categoriesQuery = useDashboardCategories()
  const goalsQuery = useDashboardGoals()

  const me = meQuery.data
  const userName = (() => {
    const saved = typeof window !== 'undefined' ? localStorage.getItem('prime-finance-auth') : null
    if (saved) {
      try { return JSON.parse(saved)?.name || JSON.parse(saved)?.email || 'Usuário' } catch { return 'Usuário' }
    }
    return me?.name || me?.email || 'Usuário'
  })()

  if (me && !me.onboarding_completed && !showOnboarding) {
    setShowOnboarding(true)
  }

  const primeiroNome = userName.split(' ')[0]

  const expenses = expensesQuery.data ?? []
  const recurringExpenses = recurringQuery.data ?? []
  const recurringExpensesTotal = recurringTotalQuery.data ?? 0
  const paymentMethods = paymentMethodsQuery.data ?? []
  const chartData = evolutionQuery.data ?? []
  const incomes = incomesQuery.data ?? []
  const categorySummary = categorySummaryQuery.data ?? []
  const goals = goalsQuery.data ?? []

  const today = new Date()
  const currentDay = today.getDate()
  const currentMonth = today.getMonth()
  const currentYear = today.getFullYear()
  const lastDayOfMonth = new Date(currentYear, currentMonth + 1, 0).getDate()
  const diasRestantes = lastDayOfMonth - currentDay + 1

  const monthIncomes = incomes.reduce((sum, inc) => sum + inc.amount_cents, 0)
  const totalMonth = expenses.reduce((acc, exp) => acc + exp.amount_cents, 0)
  const lastMonthTotal = chartData[chartData.length - 2]?.total || 0
  const percentChange = lastMonthTotal
    ? Math.round(((totalMonth - lastMonthTotal) / lastMonthTotal) * 100)
    : 0
  const saldo = monthIncomes - totalMonth

  // Gastos fixos pendentes (vencimento após hoje)
  const gastosFixosPendentes = recurringExpenses
    .filter((r) => r.day_of_month > currentDay)
    .reduce((s, r) => s + r.amount_cents, 0)

  const dailyAllowance = Math.max(
    0,
    Math.round((saldo - gastosFixosPendentes) / diasRestantes),
  )

  // Gastos de hoje
  const todayStr = today.toISOString().slice(0, 10)
  const gastosHoje = expenses
    .filter((e) => e.date === todayStr)
    .reduce((s, e) => s + e.amount_cents, 0)
  const percentGastoHoje = dailyAllowance > 0 ? (gastosHoje / dailyAllowance) * 100 : 0

  // Próximos gastos fixos
  const upcomingRecurring = recurringExpenses
    .filter((r) => r.day_of_month >= currentDay)
    .sort((a, b) => a.day_of_month - b.day_of_month)
    .slice(0, 3)

  // Donut data
  const donutData = categorySummary
    .filter((c) => c.total_cents > 0)
    .sort((a, b) => b.total_cents - a.total_cents)
    .slice(0, 6)
    .map((c) => ({
      label: c.category_name,
      value: c.total_cents,
      color: catColor(c.category_name),
    }))

  const mesAno = `${MONTH_NAMES[currentMonth]} · ${currentYear}`
  const mesAbrev = MONTH_ABBR[currentMonth]

  return (
    <>
      {showOnboarding && (
        <OnboardingWizard onComplete={() => { setShowOnboarding(false); invalidateDashboard() }} />
      )}

      <div className="flex flex-col gap-6 pb-10" style={{ background: 'var(--bg)', minHeight: '100%', padding: '2rem' }}>

        {/* 1. Topbar */}
        <div className="flex items-start justify-between mb-2">
          <div>
            <div className="eyebrow text-[--ink-3] mb-1">Painel · {mesAno}</div>
            <h1 className="serif text-[34px] leading-[1.15] text-[--ink]">
              Olá, <em className="serif-i text-[--accent-deep]">{primeiroNome}.</em>
            </h1>
            <p className="text-sm text-[--ink-2] mt-1">Aqui está um resumo das suas finanças.</p>
          </div>
          <div className="flex items-center gap-2 mt-1">
            <Button
              variant="ghost"
              size="icon"
              className="relative text-[--ink-2] hover:text-[--ink]"
              aria-label="Notificações"
            >
              <Bell className="size-5" />
              <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-[--accent-color]" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="text-[--ink-2] hover:text-[--ink]"
              onClick={() => setPrivacyMode((v) => !v)}
              aria-label={privacyMode ? 'Mostrar valores' : 'Ocultar valores'}
            >
              {privacyMode ? <EyeOff className="size-5" /> : <Eye className="size-5" />}
            </Button>
            <Link href="/gastos/novo">
              <Button
                size="sm"
                className="gap-1.5 rounded-full px-4 text-sm"
                style={{ background: 'var(--accent-color)', color: '#fff' }}
              >
                <Plus className="size-4" /> Nova transação
              </Button>
            </Link>
          </div>
        </div>

        {/* 2. Hero row */}
        <div className="grid gap-4" style={{ gridTemplateColumns: '1.5fr 1fr' }}>
          {/* Card hero escuro — saldo */}
          <div
            style={{ background: 'var(--ink)' }}
            className="rounded-[20px] p-7 relative overflow-hidden"
          >
            {/* gradiente radial accent */}
            <div
              style={{
                position: 'absolute',
                bottom: -40,
                right: -40,
                width: 180,
                height: 180,
                borderRadius: '50%',
                background: 'radial-gradient(circle, rgba(201,95,45,0.35) 0%, transparent 70%)',
                pointerEvents: 'none',
              }}
            />
            <div className="eyebrow text-[--bg-2] mb-3">
              SALDO · {MONTH_ABBR[currentMonth].toUpperCase()} · {currentYear}
            </div>
            <div className="flex items-start justify-between gap-4">
              <div>
                <div
                  className={cn('text-[56px] leading-none mono-num', saldo >= 0 ? 'text-[--bg]' : 'text-[--bad]')}
                >
                  <span className={privacyMode ? 'blur-[10px] saturate-50 select-none' : ''}>
                    {formatCurrency(saldo)}
                  </span>
                </div>
                <div className="mt-2 flex items-center gap-2">
                  <span
                    className={cn(
                      'text-xs px-2 py-0.5 rounded-full',
                      saldo >= 0 ? 'bg-[--ok]/20 text-[--ok]' : 'bg-[--bad]/20 text-[--bad]',
                    )}
                  >
                    ● {saldo >= 0 ? 'positivo' : 'negativo'}
                  </span>
                  {percentChange !== 0 && (
                    <span className="text-xs text-[--ink-3] flex items-center gap-0.5">
                      {percentChange > 0
                        ? <TrendingUp className="size-3 text-[--bad]" />
                        : <TrendingDown className="size-3 text-[--ok]" />}
                      {Math.abs(percentChange)}% vs mês anterior
                    </span>
                  )}
                </div>
              </div>
              <Sparkline data={chartData} width={180} height={56} />
            </div>
          </div>

          {/* Card envelope — pode gastar hoje */}
          <div
            style={{ background: 'var(--accent-tint)' }}
            className="rounded-[20px] p-7 flex flex-col justify-between"
          >
            <div className="eyebrow text-[--accent-deep]">PODE GASTAR HOJE</div>
            <div className={cn('serif text-[44px] leading-none text-[--ink] my-3', privacyMode ? 'blur-[10px] saturate-50 select-none' : '')}>
              {formatCurrency(dailyAllowance)}
            </div>
            <div className="text-xs text-[--ink-2] mb-3">{diasRestantes} dias restantes no mês</div>
            <div className="h-1.5 rounded-full overflow-hidden" style={{ background: 'var(--line)' }}>
              <div
                className="h-full rounded-full transition-all duration-400"
                style={{ width: `${Math.min(percentGastoHoje, 100)}%`, background: 'var(--accent-color)' }}
              />
            </div>
          </div>
        </div>

        {/* 3. KPIs */}
        <div className="grid grid-cols-3 gap-4">
          {/* Receitas */}
          <div
            style={{ background: 'var(--surface)', border: '1px solid var(--line)' }}
            className="rounded-[16px] p-5"
          >
            <div className="eyebrow text-[--ink-3] mb-2">Receitas · {mesAbrev}</div>
            <div className={cn('mono-num text-[28px] leading-none text-[--ok]', privacyMode ? 'blur-[10px] saturate-50 select-none' : '')}>
              {formatCurrency(monthIncomes)}
            </div>
          </div>

          {/* Total gasto */}
          <div
            style={{ background: 'var(--surface)', border: '1px solid var(--line)' }}
            className="rounded-[16px] p-5"
          >
            <div className="eyebrow text-[--ink-3] mb-2">Total gasto · {mesAbrev}</div>
            <div className={cn('mono-num text-[28px] leading-none text-[--ink]', privacyMode ? 'blur-[10px] saturate-50 select-none' : '')}>
              {formatCurrency(totalMonth)}
            </div>
            {percentChange !== 0 && (
              <div className="flex items-center gap-1 mt-1.5">
                {percentChange > 0
                  ? <TrendingUp className="size-3.5 text-[--bad]" />
                  : <TrendingDown className="size-3.5 text-[--ok]" />}
                <span className={cn('text-xs', percentChange > 0 ? 'text-[--bad]' : 'text-[--ok]')}>
                  {percentChange > 0 ? '+' : ''}{percentChange}%
                </span>
              </div>
            )}
          </div>

          {/* Gastos fixos */}
          <div
            style={{ background: 'var(--surface)', border: '1px solid var(--line)' }}
            className="rounded-[16px] p-5"
          >
            <div className="eyebrow text-[--ink-3] mb-2">Gastos fixos</div>
            <div className={cn('mono-num text-[28px] leading-none text-[--ink]', privacyMode ? 'blur-[10px] saturate-50 select-none' : '')}>
              {formatCurrency(recurringExpensesTotal)}
            </div>
            <div className="text-xs text-[--ink-3] mt-1.5">
              {upcomingRecurring.length} próximos a vencer
            </div>
          </div>
        </div>

        {/* 4. Evolução + Metas */}
        <div className="grid gap-4" style={{ gridTemplateColumns: '2fr 1fr' }}>
          {/* Evolução */}
          <div
            style={{ background: 'var(--surface)', border: '1px solid var(--line)' }}
            className="rounded-[20px] overflow-hidden"
          >
            <ExpenseChart data={chartData} />
          </div>

          {/* Metas */}
          <div
            style={{ background: 'var(--surface)', border: '1px solid var(--line)' }}
            className="rounded-[20px] p-6 flex flex-col"
          >
            <div className="flex items-center justify-between mb-4">
              <span className="eyebrow text-[--ink-3]">Metas</span>
              <Link href="/metas">
                <Button variant="ghost" size="sm" className="gap-1 text-xs text-[--ink-2]">
                  Ver todas <ArrowRight className="size-3" />
                </Button>
              </Link>
            </div>

            {goals.length === 0 ? (
              <p className="text-sm text-[--ink-3] mt-2">Nenhuma meta cadastrada.</p>
            ) : (
              <div className="flex flex-col gap-1">
                {goals.slice(0, 3).map((goal) => {
                  const pct = Math.round((goal.current_amount_cents / goal.target_amount_cents) * 100)
                  return (
                    <div
                      key={goal.id}
                      className="flex items-center justify-between py-2.5"
                      style={{ borderBottom: '1px solid var(--line)' }}
                    >
                      <span className="text-sm text-[--ink] truncate flex-1 mr-3">{goal.name}</span>
                      <div className="flex items-center gap-2 shrink-0">
                        <div className="w-20 h-1.5 rounded-full overflow-hidden" style={{ background: 'var(--line)' }}>
                          <div
                            className="h-full rounded-full"
                            style={{ width: `${Math.min(pct, 100)}%`, background: 'var(--ink)' }}
                          />
                        </div>
                        <span className="serif-i text-sm text-[--ink-2] w-8 text-right">{pct}%</span>
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        </div>

        {/* 5. Categorias + Gastos fixos próximos */}
        <div className="grid gap-4" style={{ gridTemplateColumns: '2fr 1fr' }}>
          {/* Donut categorias */}
          <div
            style={{ background: 'var(--surface)', border: '1px solid var(--line)' }}
            className="rounded-[20px] p-6"
          >
            <div className="eyebrow text-[--ink-3] mb-4">Categorias · {mesAbrev}</div>
            {donutData.length > 0 ? (
              <DonutChart data={donutData} size={160} />
            ) : (
              <p className="text-sm text-[--ink-3]">Sem gastos por categoria este mês.</p>
            )}
          </div>

          {/* Próximos gastos fixos */}
          <div
            style={{ background: 'var(--surface)', border: '1px solid var(--line)' }}
            className="rounded-[20px] p-6"
          >
            <div className="flex items-center justify-between mb-4">
              <span className="eyebrow text-[--ink-3]">Próximos fixos</span>
              <Link href="/gastos-fixos">
                <Button variant="ghost" size="sm" className="gap-1 text-xs text-[--ink-2]">
                  Ver todos <ArrowRight className="size-3" />
                </Button>
              </Link>
            </div>

            {upcomingRecurring.length === 0 ? (
              <p className="text-sm text-[--ink-3]">Nenhum nos próximos dias.</p>
            ) : (
              <div className="flex flex-col">
                {upcomingRecurring.map((r, idx) => {
                  const dueDay = r.day_of_month
                  return (
                    <div
                      key={r.id || idx}
                      className="flex items-center gap-3 py-2.5"
                      style={{ borderBottom: idx < upcomingRecurring.length - 1 ? '1px solid var(--line)' : undefined }}
                    >
                      <div className="text-center w-10 shrink-0">
                        <div className="serif text-[22px] leading-none text-[--ink]">{dueDay}</div>
                        <div className="eyebrow text-[--ink-3]">{mesAbrev}</div>
                      </div>
                      <div className="flex-1 text-sm text-[--ink] truncate">{r.description}</div>
                      <div className={cn('mono-num text-sm text-[--ink-2]', privacyMode ? 'blur-[8px] select-none' : '')}>
                        {formatCurrency(r.amount_cents)}
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        </div>

        {/* 6. Movimentação recente */}
        <div className="flex flex-col gap-4">
          <div className="flex items-center justify-between">
            <span className="eyebrow text-[--ink-3]">Últimas transações</span>
            <Link href="/gastos">
              <Button variant="ghost" size="sm" className="gap-1 text-xs text-[--ink-2]">
                Ver todas <ArrowRight className="size-3" />
              </Button>
            </Link>
          </div>

          <div className="flex flex-col gap-2">
            {expenses.slice(0, 5).map((expense, index) => (
              <ExpenseCard
                key={expense.id || `recent-${index}`}
                date={expense.date}
                description={expense.description}
                amount_cents={expense.amount_cents}
                category={expense.category || 'Sem categoria'}
                payment_method_name={paymentMethods.find((pm) => pm.id === expense.payment_method_id)?.label}
                installments={expense.installments_count}
                current_installment={expense.installment_index}
              />
            ))}
          </div>
        </div>
      </div>
    </>
  )
}

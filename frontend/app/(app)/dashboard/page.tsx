'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { ArrowRight, CalendarClock, Receipt, TrendingDown, TrendingUp, Wallet, AlertTriangle, Target } from 'lucide-react'

import { dashboardService, expensesService, paymentMethodsService, recurringExpensesService, incomesService, categoriesService, budgetsService, goalsService, usersService, type Expense, type Income, type CategorySummaryItem, type Category, type Budget, type Goal, type RecurringExpense, type PaymentMethod } from '@/lib/api'
import { toast } from 'sonner'
import { OnboardingWizard } from '@/components/onboarding-wizard'
import { formatCurrency } from '@/lib/format'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { StatsCard } from '@/components/stats-card'
import { ExpenseCard } from '@/components/expense-card'
import { ExpenseChart } from '@/components/expense-chart'
import { CategoryChart } from '@/components/category-chart'

export default function DashboardPage() {
  const [userName, setUserName] = useState('')
  const [expenses, setExpenses] = useState<Expense[]>([])
  const [recurringExpensesTotal, setRecurringExpensesTotal] = useState(0)
  const [recurringExpenses, setRecurringExpenses] = useState<RecurringExpense[]>([])
  const [paymentMethods, setPaymentMethods] = useState<PaymentMethod[]>([])
  const [monthIncomes, setMonthIncomes] = useState(0)
  const [chartData, setChartData] = useState<Array<{ month: string; total: number }>>([])
  const [categorySummary, setCategorySummary] = useState<CategorySummaryItem[]>([])
  const [categories, setCategories] = useState<Category[]>([])
  const [budgets, setBudgets] = useState<Budget[]>([])
  const [goals, setGoals] = useState<Goal[]>([])
  const [showOnboarding, setShowOnboarding] = useState(false)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    void loadDashboard()
  }, [])

  const loadDashboard = async () => {
    try {
      setLoading(true)
      const savedAuth = localStorage.getItem('prime-finance-auth')
      if (savedAuth) {
        const user = JSON.parse(savedAuth)
        setUserName(user.name || user.email || 'Usuario')
      }

      const now = new Date()
      const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().slice(0, 10)
      const monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0).toISOString().slice(0, 10)

      const monthKey = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`
      const me = await usersService.getMe().catch(() => null)
      if (me && !me.onboarding_completed) setShowOnboarding(true)

      const [monthExpenses, recurringList, recurring, pmList, evolution, incomes, catSummary, cats, budgetsData, goalsData] = await Promise.all([
        expensesService.getByMonth(now.getFullYear(), now.getMonth() + 1),
        recurringExpensesService.list(),
        recurringExpensesService.getMonthlyTotal(),
        paymentMethodsService.list(),
        dashboardService.getMonthlyEvolution(6),
        incomesService.list({ from: monthStart, to: monthEnd }),
        dashboardService.getCategorySummary(monthKey),
        categoriesService.list('expense'),
        budgetsService.list(monthKey),
        goalsService.list(),
      ])
      setExpenses(monthExpenses)
      setRecurringExpenses(recurringList)
      setRecurringExpensesTotal(recurring)
      setPaymentMethods(pmList)
      setChartData(evolution)
      setMonthIncomes(incomes.reduce((sum, inc) => sum + inc.amount_cents, 0))
      setCategorySummary(catSummary)
      setCategories(cats)
      setBudgets(budgetsData)
      setGoals(goalsData)
    } catch {
      toast.error('Não foi possível carregar os dados do dashboard. Tente recarregar a página.')
      setExpenses([])
      setRecurringExpenses([])
      setRecurringExpensesTotal(0)
      setChartData([])
      setMonthIncomes(0)
      setCategorySummary([])
      setCategories([])
      setBudgets([])
      setGoals([])
    } finally {
      setLoading(false)
    }
  }

  // Calcular estatísticas
  const totalMonth = expenses.reduce((acc, exp) => acc + exp.amount_cents, 0)
  const totalRecurring = recurringExpensesTotal
  const lastMonthTotal = chartData[chartData.length - 2]?.total || 0
  const percentChange = lastMonthTotal
    ? Math.round(((totalMonth - lastMonthTotal) / lastMonthTotal) * 100)
    : 0
  const balance = monthIncomes - totalMonth

  // Próximos gastos fixos (próximos 7 dias pelo day_of_month)
  const today = new Date()
  const currentDay = today.getDate()
  const upcomingRecurring = recurringExpenses
    .filter((exp) => {
      const diff = exp.day_of_month - currentDay
      return diff > 0 && diff <= 7
    })
    .sort((a, b) => a.day_of_month - b.day_of_month)
    .slice(0, 3)

  return (
    <>
    {showOnboarding && (
      <OnboardingWizard onComplete={() => { setShowOnboarding(false); void loadDashboard() }} />
    )}
    <div className="flex flex-col gap-8">
      {/* Header */}
      <div className="flex flex-col gap-1">
        <h1 className="text-2xl font-semibold tracking-tight text-foreground">
          Olá, {userName || 'Usuário'}
        </h1>
        <p className="text-muted-foreground">
          Aqui está um resumo das suas finanças deste mês.
        </p>
      </div>

      {/* Stats Grid */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatsCard
          title="Total do mês"
          value={formatCurrency(totalMonth)}
          icon={Receipt}
          trend={{
            value: Math.abs(percentChange),
            isPositive: percentChange < 0,
          }}
        />
        <StatsCard
          title="Receitas"
          value={formatCurrency(monthIncomes)}
          description="Entradas do mês"
          icon={Wallet}
        />
        <StatsCard
          title="Saldo"
          value={(balance >= 0 ? '+' : '') + formatCurrency(balance)}
          description={balance >= 0 ? 'Positivo' : 'Em déficit'}
          icon={balance >= 0 ? TrendingUp : TrendingDown}
          className={balance >= 0 ? 'border-emerald-500/30' : 'border-red-500/30'}
        />
        <StatsCard
          title="Gastos fixos"
          value={formatCurrency(totalRecurring)}
          description="Despesas recorrentes"
          icon={CalendarClock}
        />
      </div>

      {/* Budget Alerts */}
      {budgets.filter((b) => b.percentage >= 80).length > 0 && (
        <div className="flex flex-col gap-2">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-semibold flex items-center gap-2">
              <AlertTriangle className="size-4 text-amber-500" />
              Alertas de orçamento
            </h2>
            <Link href="/orcamentos">
              <Button variant="ghost" size="sm" className="gap-1 text-xs">
                Ver todos <ArrowRight className="size-3" />
              </Button>
            </Link>
          </div>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {budgets.filter((b) => b.percentage >= 80).map((b) => (
              <Card key={b.id} className={b.percentage >= 100 ? 'border-red-500/50' : 'border-amber-500/50'}>
                <CardContent className="pt-4 pb-3 flex flex-col gap-2">
                  <div className="flex items-center justify-between text-sm">
                    <span className="font-medium">{b.category_name}</span>
                    <span className={b.percentage >= 100 ? 'text-red-500 font-semibold' : 'text-amber-500 font-semibold'}>
                      {b.percentage.toFixed(0)}%
                    </span>
                  </div>
                  <div className="h-1.5 rounded-full bg-muted overflow-hidden">
                    <div
                      className={`h-full rounded-full ${b.percentage >= 100 ? 'bg-red-500' : 'bg-amber-500'}`}
                      style={{ width: `${Math.min(b.percentage, 100)}%` }}
                    />
                  </div>
                  <span className="text-xs text-muted-foreground">
                    {formatCurrency(b.spent_cents)} de {formatCurrency(b.amount_cents)}
                  </span>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}

      {/* Goals widget */}
      {goals.length > 0 && (
        <div className="flex flex-col gap-2">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-semibold flex items-center gap-2">
              <Target className="size-4 text-primary" />
              Metas financeiras
            </h2>
            <Link href="/metas">
              <Button variant="ghost" size="sm" className="gap-1 text-xs">
                Ver todas <ArrowRight className="size-3" />
              </Button>
            </Link>
          </div>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {goals.slice(0, 3).map((g) => (
              <Card key={g.id} className={g.percentage >= 100 ? 'border-emerald-500/50' : ''}>
                <CardContent className="pt-4 pb-3 flex flex-col gap-2">
                  <div className="flex items-center justify-between text-sm">
                    <span className="font-medium truncate">{g.name}</span>
                    <span className={`shrink-0 ml-2 font-semibold ${g.percentage >= 100 ? 'text-emerald-500' : 'text-primary'}`}>
                      {g.percentage.toFixed(0)}%
                    </span>
                  </div>
                  <div className="h-1.5 rounded-full bg-muted overflow-hidden">
                    <div
                      className={`h-full rounded-full ${g.percentage >= 100 ? 'bg-emerald-500' : 'bg-primary'}`}
                      style={{ width: `${Math.min(g.percentage, 100)}%` }}
                    />
                  </div>
                  <span className="text-xs text-muted-foreground">
                    {formatCurrency(g.current_amount_cents)} de {formatCurrency(g.target_amount_cents)}
                  </span>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}

      {/* Chart and Upcoming */}
      <div className="grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <ExpenseChart data={chartData} />
        </div>

        <Card>
          <CardHeader className="pb-4">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base font-medium">
                Próximos gastos fixos
              </CardTitle>
              <Link href="/gastos-fixos">
                <Button variant="ghost" size="sm" className="gap-1 text-xs">
                  Ver todos
                  <ArrowRight className="size-3" />
                </Button>
              </Link>
            </div>
          </CardHeader>
          <CardContent className="flex flex-col gap-3">
            {loading ? (
              <p className="py-4 text-center text-sm text-muted-foreground">Carregando...</p>
            ) : upcomingRecurring.length > 0 ? (
              upcomingRecurring.map((expense, index) => (
                <div
                  key={expense.id || `upcoming-${index}`}
                  className="flex items-center justify-between rounded-lg bg-muted/50 p-3"
                >
                  <div className="flex flex-col gap-0.5">
                    <span className="text-sm font-medium">{expense.description}</span>
                    <span className="text-xs text-muted-foreground">
                      Dia {expense.day_of_month}
                    </span>
                  </div>
                  <span className="font-semibold tabular-nums">
                    {formatCurrency(expense.amount_cents)}
                  </span>
                </div>
              ))
            ) : (
              <p className="py-4 text-center text-sm text-muted-foreground">
                Nenhum gasto fixo nos próximos 7 dias
              </p>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Category Breakdown */}
      <CategoryChart data={categorySummary} categories={categories} />

      {/* Recent Transactions */}
      <div className="flex flex-col gap-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold">Últimas transações</h2>
          <Link href="/gastos">
            <Button variant="ghost" size="sm" className="gap-1">
              Ver todas
              <ArrowRight className="size-4" />
            </Button>
          </Link>
        </div>

        <div className="flex flex-col gap-3">
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

'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { ArrowRight, CalendarClock, CreditCard, Receipt, TrendingDown, TrendingUp, Wallet } from 'lucide-react'

import { dashboardService, expensesService, paymentMethodsService, recurringExpensesService, incomesService, type Expense, type Income } from '@/lib/api'
import { formatCurrency } from '@/lib/mock-data'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { StatsCard } from '@/components/stats-card'
import { ExpenseCard } from '@/components/expense-card'
import { ExpenseChart } from '@/components/expense-chart'

export default function DashboardPage() {
  const [userName, setUserName] = useState('')
  const [expenses, setExpenses] = useState<Expense[]>([])
  const [recurringExpensesTotal, setRecurringExpensesTotal] = useState(0)
  const [paymentMethodsCount, setPaymentMethodsCount] = useState(0)
  const [monthIncomes, setMonthIncomes] = useState(0)
  const [chartData, setChartData] = useState<Array<{ month: string; total: number }>>([])
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

      const [monthExpenses, recurring, paymentMethods, evolution, incomes] = await Promise.all([
        expensesService.getByMonth(now.getFullYear(), now.getMonth() + 1),
        recurringExpensesService.getMonthlyTotal(),
        paymentMethodsService.list(),
        dashboardService.getMonthlyEvolution(6),
        incomesService.list({ from: monthStart, to: monthEnd }),
      ])
      setExpenses(monthExpenses)
      setRecurringExpensesTotal(recurring)
      setPaymentMethodsCount(paymentMethods.length)
      setChartData(evolution)
      setMonthIncomes(incomes.reduce((sum, inc) => sum + inc.amount_cents, 0))
    } catch (error) {
      console.error('Erro ao carregar dashboard', error)
      setExpenses([])
      setRecurringExpensesTotal(0)
      setPaymentMethodsCount(0)
      setChartData([])
      setMonthIncomes(0)
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

  // Próximos gastos fixos (próximos 7 dias)
  const today = new Date()
  const currentDay = today.getDate()
  const upcomingRecurring = expenses
    .filter((exp) => exp.installment_index === undefined)
    .filter((exp) => {
      const date = new Date(exp.date + 'T00:00:00')
      const diff = date.getDate() - currentDay
      return diff > 0 && diff <= 7
    })
    .slice(0, 3)

  return (
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
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
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
          value={formatCurrency(Math.abs(balance))}
          description={balance >= 0 ? 'Positivo' : 'Negativo'}
          icon={balance >= 0 ? TrendingUp : TrendingDown}
        />
        <StatsCard
          title="Gastos fixos"
          value={formatCurrency(totalRecurring)}
          description="Despesas recorrentes"
          icon={CalendarClock}
        />
        <StatsCard
          title="Meios de pagamento"
          value={String(paymentMethodsCount)}
          description="Cadastrados"
          icon={CreditCard}
        />
      </div>

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
                      {expense.date}
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
              payment_method_id={expense.payment_method_id || ''}
              installments={expense.installments_count}
              current_installment={expense.installment_index}
            />
          ))}
        </div>
      </div>
    </div>
  )
}

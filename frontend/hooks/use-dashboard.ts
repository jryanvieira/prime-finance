'use client'

import { useQuery, useQueryClient } from '@tanstack/react-query'
import {
  dashboardService,
  expensesService,
  paymentMethodsService,
  recurringExpensesService,
  incomesService,
  categoriesService,
  budgetsService,
  goalsService,
  usersService,
} from '@/lib/api'

function getCurrentMonthKey() {
  const now = new Date()
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`
}

function getCurrentMonthRange() {
  const now = new Date()
  const from = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().slice(0, 10)
  const to = new Date(now.getFullYear(), now.getMonth() + 1, 0).toISOString().slice(0, 10)
  return { from, to }
}

export function useDashboardMe() {
  return useQuery({
    queryKey: ['me'],
    queryFn: () => usersService.getMe().catch(() => null),
    staleTime: 10 * 60 * 1000,
  })
}

export function useDashboardExpenses() {
  const now = new Date()
  return useQuery({
    queryKey: ['expenses', 'month', getCurrentMonthKey()],
    queryFn: () => expensesService.getByMonth(now.getFullYear(), now.getMonth() + 1),
  })
}

export function useDashboardRecurring() {
  return useQuery({
    queryKey: ['recurring', 'list'],
    queryFn: () => recurringExpensesService.list(),
  })
}

export function useDashboardRecurringTotal() {
  return useQuery({
    queryKey: ['recurring', 'monthly-total'],
    queryFn: () => recurringExpensesService.getMonthlyTotal(),
  })
}

export function useDashboardPaymentMethods() {
  return useQuery({
    queryKey: ['payment-methods'],
    queryFn: () => paymentMethodsService.list(),
  })
}

export function useDashboardEvolution() {
  return useQuery({
    queryKey: ['dashboard', 'evolution'],
    queryFn: async () => {
      const now = new Date()
      const months = Array.from({ length: 6 }, (_, i) => {
        const d = new Date(now.getFullYear(), now.getMonth() - (5 - i), 1)
        return d
      })
      const results = await Promise.all(
        months.map((d) => expensesService.getByMonth(d.getFullYear(), d.getMonth() + 1))
      )
      return months.map((d, i) => ({
        month: d.toLocaleDateString('pt-BR', { month: 'short' }),
        total: results[i].reduce((sum, e) => sum + e.amount_cents, 0),
      }))
    },
    staleTime: 10 * 60 * 1000,
  })
}

export function useDashboardIncomes() {
  const { from, to } = getCurrentMonthRange()
  return useQuery({
    queryKey: ['incomes', 'month', getCurrentMonthKey()],
    queryFn: () => incomesService.list({ from, to }),
  })
}

export function useDashboardCategorySummary() {
  const monthKey = getCurrentMonthKey()
  return useQuery({
    queryKey: ['dashboard', 'category-summary', monthKey],
    queryFn: () => dashboardService.getCategorySummary(monthKey),
  })
}

export function useDashboardCategories() {
  return useQuery({
    queryKey: ['categories', 'expense'],
    queryFn: () => categoriesService.list('expense'),
  })
}

export function useDashboardBudgets() {
  const monthKey = getCurrentMonthKey()
  return useQuery({
    queryKey: ['budgets', monthKey],
    queryFn: () => budgetsService.list(monthKey),
  })
}

export function useDashboardGoals() {
  return useQuery({
    queryKey: ['goals'],
    queryFn: () => goalsService.list(),
  })
}

export function useDashboardInvalidate() {
  const qc = useQueryClient()
  return () => {
    const monthKey = getCurrentMonthKey()
    qc.invalidateQueries({ queryKey: ['expenses', 'month', monthKey] })
    qc.invalidateQueries({ queryKey: ['dashboard', 'evolution'] })
    qc.invalidateQueries({ queryKey: ['dashboard', 'category-summary', monthKey] })
    qc.invalidateQueries({ queryKey: ['budgets', monthKey] })
    qc.invalidateQueries({ queryKey: ['goals'] })
    qc.invalidateQueries({ queryKey: ['recurring'] })
    qc.invalidateQueries({ queryKey: ['incomes', 'month', monthKey] })
    qc.invalidateQueries({ queryKey: ['me'] })
  }
}

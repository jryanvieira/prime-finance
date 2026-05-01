import { api } from '../client'
import type { Expense, MonthExpenseItem, MonthExpensesResponse } from '../types'

export const calendarService = {
  async getMonthExpenses(year: number, month: number): Promise<MonthExpensesResponse> {
    const monthKey = `${year}-${String(month).padStart(2, '0')}`
    const response = await api.get<MonthExpensesResponse & { items: MonthExpenseItem[] | null }>(
      `/v1/months/${monthKey}/expenses`
    )
    return {
      ...response,
      items: Array.isArray(response.items) ? response.items : [],
    }
  },

  async getMaxInstallmentMonth(): Promise<string> {
    const now = new Date()
    const currentMonthKey = formatMonthKey(now)
    const from = `${currentMonthKey}-01`
    const toDate = new Date(now.getFullYear() + 10, now.getMonth() + 1, 0)
    const to = formatDate(toDate)

    const response = await api.get<{ items: Expense[] | null }>(`/v1/expenses?from=${from}&to=${to}`)
    const items = Array.isArray(response.items) ? response.items : []

    const installmentItems = items.filter(
      (item) =>
        (item.installments_count ?? 0) > 1 &&
        typeof item.date === 'string' &&
        item.date.length >= 7
    )

    if (installmentItems.length === 0) {
      return currentMonthKey
    }

    let maxMonth = currentMonthKey
    for (const item of installmentItems) {
      const monthKey = item.date.slice(0, 7)
      if (monthKey > maxMonth) {
        maxMonth = monthKey
      }
    }
    return maxMonth
  },
}

function formatMonthKey(date: Date): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`
}

function formatDate(date: Date): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(
    date.getDate()
  ).padStart(2, '0')}`
}


import { api } from '../client'
import type {
  DashboardSummary,
  MonthlyReport,
  CategoryTotal,
  PaymentMethodTotal,
} from '../types'

const USE_MOCK = false

import {
  mockExpenses,
  mockRecurringExpenses,
  mockMonthlyData,
  mockCategoryData,
  mockCategories,
} from '@/lib/mock-data'

export const dashboardService = {
  /**
   * Obter resumo do dashboard
   */
  async getSummary(month?: string): Promise<DashboardSummary> {
    if (USE_MOCK) {
      await new Promise((r) => setTimeout(r, 300))
      
      const totalVariable = mockExpenses.reduce((sum, e) => sum + e.amount_cents, 0)
      const totalFixed = mockRecurringExpenses
        .filter((e) => e.active)
        .reduce((sum, e) => sum + e.amount_cents, 0)
      
      return {
        total_month: totalVariable + totalFixed,
        total_fixed: totalFixed,
        total_variable: totalVariable,
        comparison_last_month: -8.5, // mockado: 8.5% a menos que o mês anterior
      }
    }

    const m = month || new Date().toISOString().slice(0, 7)
    const data = await api.get<{ items: Array<{ source: string; amount_cents: number }> | null }>(`/v1/months/${m}/expenses`)
    const items = Array.isArray(data.items) ? data.items : []
    const totalMonth = items.reduce((acc, item) => acc + item.amount_cents, 0)
    const totalFixed = items.filter((i) => i.source === 'recurring').reduce((acc, item) => acc + item.amount_cents, 0)
    return {
      total_month: totalMonth,
      total_fixed: totalFixed,
      total_variable: totalMonth - totalFixed,
      comparison_last_month: 0,
    }
  },

  /**
   * Obter relatório mensal
   */
  async getMonthlyReport(year: number, month: number): Promise<MonthlyReport> {
    if (USE_MOCK) {
      await new Promise((r) => setTimeout(r, 300))
      
      const total = mockExpenses.reduce((sum, e) => sum + e.amount_cents, 0)
      
      return {
        month: `${year}-${String(month).padStart(2, '0')}`,
        total,
        by_category: mockCategoryData.map((c) => ({
          category_id: mockCategories.find((cat) => cat.name === c.category)?.id || '',
          category_name: c.category,
          total: c.total,
          percentage: c.percentage,
          color: mockCategories.find((cat) => cat.name === c.category)?.color || '',
        })),
        by_payment_method: [],
      }
    }

    const monthKey = `${year}-${String(month).padStart(2, '0')}`
    const data = await api.get<{ items: Array<{ amount_cents: number; payment_method_id?: string; category?: string }> | null }>(
      `/v1/months/${monthKey}/expenses`
    )
    const items = Array.isArray(data.items) ? data.items : []
    const total = items.reduce((sum, x) => sum + x.amount_cents, 0)

    const byCategoryMap = new Map<string, number>()
    const byPaymentMap = new Map<string, number>()
    for (const item of items) {
      const cat = item.category || 'Sem categoria'
      byCategoryMap.set(cat, (byCategoryMap.get(cat) || 0) + item.amount_cents)
      const pm = item.payment_method_id || 'Sem meio'
      byPaymentMap.set(pm, (byPaymentMap.get(pm) || 0) + item.amount_cents)
    }

    const by_category: CategoryTotal[] = Array.from(byCategoryMap.entries()).map(([category_name, value]) => ({
      category_name,
      total: value,
      percentage: total > 0 ? (value / total) * 100 : 0,
    }))
    const by_payment_method: PaymentMethodTotal[] = Array.from(byPaymentMap.entries()).map(([payment_method_label, value]) => ({
      payment_method_label,
      total: value,
      percentage: total > 0 ? (value / total) * 100 : 0,
    }))

    return { month: monthKey, total, by_category, by_payment_method }
  },

  /**
   * Obter evolução mensal (últimos N meses)
   */
  async getMonthlyEvolution(months: number = 6): Promise<{ month: string; total: number }[]> {
    if (USE_MOCK) {
      await new Promise((r) => setTimeout(r, 250))
      return mockMonthlyData
    }

    const out: { month: string; total: number }[] = []
    const now = new Date()
    for (let i = months - 1; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1)
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
      const data = await api.get<{ items: Array<{ amount_cents: number }> | null }>(`/v1/months/${key}/expenses`)
      const items = Array.isArray(data.items) ? data.items : []
      out.push({
        month: d.toLocaleDateString('pt-BR', { month: 'short' }),
        total: items.reduce((acc, item) => acc + item.amount_cents, 0),
      })
    }
    return out
  },

  /**
   * Obter gastos por categoria
   */
  async getCategoryBreakdown(month?: string): Promise<CategoryTotal[]> {
    if (USE_MOCK) {
      await new Promise((r) => setTimeout(r, 250))
      return mockCategoryData.map((c) => ({
        category_id: mockCategories.find((cat) => cat.name === c.category)?.id || '',
        category_name: c.category,
        total: c.total,
        percentage: c.percentage,
        color: mockCategories.find((cat) => cat.name === c.category)?.color || '',
      }))
    }

    const m = month || new Date().toISOString().slice(0, 7)
    const data = await api.get<{ items: Array<{ category?: string; amount_cents: number }> | null }>(`/v1/months/${m}/expenses`)
    const items = Array.isArray(data.items) ? data.items : []
    const total = items.reduce((acc, x) => acc + x.amount_cents, 0)
    const grouped = new Map<string, number>()
    for (const item of items) {
      const cat = item.category || 'Sem categoria'
      grouped.set(cat, (grouped.get(cat) || 0) + item.amount_cents)
    }
    return Array.from(grouped.entries()).map(([category_name, value]) => ({
      category_name,
      total: value,
      percentage: total > 0 ? (value / total) * 100 : 0,
    }))
  },
}

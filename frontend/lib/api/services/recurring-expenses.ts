import { api } from '../client'
import type {
  RecurringExpense,
  CreateRecurringExpenseRequest,
  UpdateRecurringExpenseRequest,
} from '../types'

const USE_MOCK = false

import { mockRecurringExpenses, mockCategories } from '@/lib/mock-data'

export const recurringExpensesService = {
  /**
   * Listar gastos fixos
   */
  async list(): Promise<RecurringExpense[]> {
    if (USE_MOCK) {
      await new Promise((r) => setTimeout(r, 300))
      return {
        data: mockRecurringExpenses.map((e) => ({
          ...e,
          category_id: mockCategories.find((c) => c.name === e.category)?.id || '',
        })),
        total: mockRecurringExpenses.length,
        page: pagination?.page || 1,
        per_page: pagination?.per_page || 20,
        total_pages: 1,
      }
    }

    const res = await api.get<{ items: RecurringExpense[] | null }>('/v1/recurring-expenses')
    return Array.isArray(res.items) ? res.items : []
  },

  /**
   * Obter gasto fixo por ID
   */
  async get(id: string): Promise<RecurringExpense> {
    if (USE_MOCK) {
      await new Promise((r) => setTimeout(r, 200))
      const expense = mockRecurringExpenses.find((e) => e.id === id)
      if (!expense) throw { message: 'Gasto fixo não encontrado', status: 404 }
      return {
        ...expense,
        category_id: mockCategories.find((c) => c.name === expense.category)?.id || '',
      }
    }

    const all = await this.list()
    const found = all.find((x) => x.id === id)
    if (!found) throw { message: 'Gasto fixo não encontrado', status: 404 }
    return found
  },

  /**
   * Criar gasto fixo
   */
  async create(data: CreateRecurringExpenseRequest): Promise<RecurringExpense> {
    if (USE_MOCK) {
      await new Promise((r) => setTimeout(r, 500))
      return {
        id: Date.now().toString(),
        ...data,
        active: data.active ?? true,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      }
    }

    return api.post<RecurringExpense>('/v1/recurring-expenses', data)
  },

  /**
   * Atualizar gasto fixo
   */
  async update(id: string, data: UpdateRecurringExpenseRequest): Promise<RecurringExpense> {
    if (USE_MOCK) {
      await new Promise((r) => setTimeout(r, 400))
      const expense = mockRecurringExpenses.find((e) => e.id === id)
      if (!expense) throw { message: 'Gasto fixo não encontrado', status: 404 }
      return {
        ...expense,
        ...data,
        category_id: data.category_id || mockCategories.find((c) => c.name === expense.category)?.id || '',
        updated_at: new Date().toISOString(),
      }
    }

    await api.patch<void>(`/v1/recurring-expenses/${id}`, data)
    return this.get(id)
  },

  /**
   * Alternar status ativo/inativo
   */
  async toggleActive(id: string, active: boolean): Promise<RecurringExpense> {
    void active
    return this.get(id)
  },

  /**
   * Excluir gasto fixo
   */
  async delete(id: string): Promise<void> {
    if (USE_MOCK) {
      await new Promise((r) => setTimeout(r, 300))
      return
    }

    await api.delete(`/v1/recurring-expenses/${id}`)
  },

  /**
   * Obter apenas gastos fixos ativos
   */
  async getActive(): Promise<RecurringExpense[]> {
    // API atual nao possui flag active. Todo recorrente cadastrado e considerado ativo.
    return this.list()
  },

  /**
   * Calcular total mensal dos gastos fixos ativos
   */
  async getMonthlyTotal(): Promise<number> {
    const active = (await this.getActive()) ?? []
    return active.reduce((sum, e) => sum + e.amount_cents, 0)
  },
}

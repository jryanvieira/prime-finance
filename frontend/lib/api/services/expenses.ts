import { api } from '../client'
import type {
  Expense,
  CreateExpenseRequest,
  UpdateExpenseRequest,
  ExpenseFilters,
} from '../types'

// Flag para usar dados mockados
const USE_MOCK = false

// Import mock data apenas se necessário
import {
  mockExpenses,
  mockPaymentMethods,
  mockCategories,
} from '@/lib/mock-data'

export const expensesService = {
  /**
   * Listar gastos com filtros e paginação
   */
  async list(filters?: ExpenseFilters): Promise<Expense[]> {
    if (USE_MOCK) {
      await new Promise((r) => setTimeout(r, 300))
      
      let filtered = [...mockExpenses]
      
      // Aplicar filtros
      if (filters?.search) {
        const search = filters.search.toLowerCase()
        filtered = filtered.filter((e) =>
          e.description.toLowerCase().includes(search)
        )
      }
      if (filters?.category_id) {
        const cat = mockCategories.find((c) => c.id === filters.category_id)
        if (cat) filtered = filtered.filter((e) => e.category === cat.name)
      }
      
      return {
        data: filtered.map((e) => ({
          ...e,
          category_id: mockCategories.find((c) => c.name === e.category)?.id || '',
        })),
        total: filtered.length,
        page: pagination?.page || 1,
        per_page: pagination?.per_page || 20,
        total_pages: 1,
      }
    }

    const params = new URLSearchParams()
    if (filters) {
      Object.entries(filters).forEach(([key, value]) => {
        if (value !== undefined) params.append(key, String(value))
      })
    }
    if (!params.get('from')) params.set('from', new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().slice(0, 10))
    if (!params.get('to')) params.set('to', new Date().toISOString().slice(0, 10))
    const query = params.toString() ? `?${params.toString()}` : ''
    const res = await api.get<{ items: Expense[] | null }>(`/v1/expenses${query}`)
    let items = Array.isArray(res.items) ? res.items : []
    if (filters?.search) {
      const s = filters.search.toLowerCase()
      items = items.filter((i) => i.description.toLowerCase().includes(s))
    }
    return items
  },

  /**
   * Obter gasto por ID
   */
  async get(id: string): Promise<Expense> {
    if (USE_MOCK) {
      await new Promise((r) => setTimeout(r, 200))
      const expense = mockExpenses.find((e) => e.id === id)
      if (!expense) throw { message: 'Gasto não encontrado', status: 404 }
      return {
        ...expense,
        category_id: mockCategories.find((c) => c.name === expense.category)?.id || '',
      }
    }

    const from = '2000-01-01'
    const to = '2100-12-31'
    const all = await this.list({ from, to })
    const found = all.find((x) => x.id === id)
    if (!found) throw { message: 'Gasto não encontrado', status: 404 }
    return found
  },

  /**
   * Criar novo gasto
   */
  async create(data: CreateExpenseRequest): Promise<Expense> {
    if (USE_MOCK) {
      await new Promise((r) => setTimeout(r, 500))
      const newExpense: Expense = {
        id: Date.now().toString(),
        ...data,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      }
      return newExpense
    }

    const res = await api.post<Expense | { items: Expense[] }>('/v1/expenses', data)
    if ('id' in res) return res
    return res.items[0]
  },

  /**
   * Atualizar gasto
   */
  async update(id: string, data: UpdateExpenseRequest): Promise<Expense> {
    if (USE_MOCK) {
      await new Promise((r) => setTimeout(r, 400))
      const expense = mockExpenses.find((e) => e.id === id)
      if (!expense) throw { message: 'Gasto não encontrado', status: 404 }
      return {
        ...expense,
        ...data,
        category_id: data.category_id || mockCategories.find((c) => c.name === expense.category)?.id || '',
        updated_at: new Date().toISOString(),
      }
    }

    await api.patch<void>(`/v1/expenses/${id}`, data)
    return this.get(id)
  },

  /**
   * Excluir gasto
   */
  async delete(id: string): Promise<void> {
    if (USE_MOCK) {
      await new Promise((r) => setTimeout(r, 300))
      return
    }

    await api.delete(`/v1/expenses/${id}`)
  },

  /**
   * Atualizar todas as parcelas de um grupo
   */
  async updateGroup(groupID: string, data: {
    description: string
    amount_cents: number
    category?: string | null
    payment_method_id?: string | null
  }): Promise<void> {
    await api.patch<void>(`/v1/installment-groups/${groupID}`, data)
  },

  /**
   * Obter gastos de um mês específico
   */
  async getByMonth(year: number, month: number): Promise<Expense[]> {
    const monthStr = `${year}-${String(month).padStart(2, '0')}`
    const response = await api.get<{ items: Array<Expense & { source: string }> | null }>(`/v1/months/${monthStr}/expenses`)
    return Array.isArray(response.items) ? response.items : []
  },
}

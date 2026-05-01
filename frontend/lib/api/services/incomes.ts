import { api } from '../client'
import type {
  Income,
  CreateIncomeRequest,
  UpdateIncomeRequest,
} from '../types'

export const incomesService = {
  /**
   * Listar receitas por período
   */
  async list(filters?: { from?: string; to?: string }): Promise<Income[]> {
    const params = new URLSearchParams()
    if (filters?.from) params.set('from', filters.from)
    else params.set('from', new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().slice(0, 10))
    if (filters?.to) params.set('to', filters.to)
    else params.set('to', new Date().toISOString().slice(0, 10))
    const query = params.toString() ? `?${params.toString()}` : ''
    const res = await api.get<{ items: Income[] | null }>(`/v1/incomes${query}`)
    return Array.isArray(res.items) ? res.items : []
  },

  /**
   * Criar receita
   */
  async create(data: CreateIncomeRequest): Promise<Income> {
    return api.post<Income>('/v1/incomes', data)
  },

  /**
   * Atualizar receita
   */
  async update(id: string, data: UpdateIncomeRequest): Promise<void> {
    await api.patch<void>(`/v1/incomes/${id}`, data)
  },

  /**
   * Excluir receita
   */
  async delete(id: string): Promise<void> {
    await api.delete(`/v1/incomes/${id}`)
  },
}

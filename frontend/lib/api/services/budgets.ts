import { api } from '../client'
import type { Budget, UpsertBudgetRequest } from '../types'

export const budgetsService = {
  async list(month?: string): Promise<Budget[]> {
    const m = month || new Date().toISOString().slice(0, 7)
    const data = await api.get<{ items: Budget[] | null }>(`/v1/budgets?month=${m}`)
    return Array.isArray(data.items) ? data.items : []
  },

  async upsert(req: UpsertBudgetRequest): Promise<Budget> {
    return api.put<Budget>('/v1/budgets', req)
  },

  async delete(id: string): Promise<void> {
    return api.delete(`/v1/budgets/${id}`)
  },
}

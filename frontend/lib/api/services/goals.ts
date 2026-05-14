import { api } from '../client'
import type { Goal, CreateGoalRequest, UpdateGoalRequest, ContributeGoalRequest } from '../types'

export const goalsService = {
  async list(): Promise<Goal[]> {
    const data = await api.get<{ items: Goal[] | null }>('/v1/goals')
    return Array.isArray(data.items) ? data.items : []
  },

  async create(req: CreateGoalRequest): Promise<Goal> {
    return api.post<Goal>('/v1/goals', req)
  },

  async update(id: string, req: UpdateGoalRequest): Promise<Goal> {
    return api.put<Goal>(`/v1/goals/${id}`, req)
  },

  async contribute(id: string, req: ContributeGoalRequest): Promise<Goal> {
    return api.post<Goal>(`/v1/goals/${id}/contribute`, req)
  },

  async delete(id: string): Promise<void> {
    return api.delete(`/v1/goals/${id}`)
  },
}

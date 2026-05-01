import { api } from '../client'
import type { Category, CreateCategoryRequest } from '../types'

export const categoriesService = {
  /**
   * Listar categorias (globais + custom do user)
   */
  async list(type?: 'expense' | 'income'): Promise<Category[]> {
    const params = type ? `?type=${type}` : ''
    const res = await api.get<{ items: Category[] | null }>(`/v1/categories${params}`)
    return Array.isArray(res.items) ? res.items : []
  },

  /**
   * Criar categoria custom
   */
  async create(data: CreateCategoryRequest): Promise<Category> {
    return api.post<Category>('/v1/categories', data)
  },

  /**
   * Deletar categoria custom
   */
  async delete(id: string): Promise<void> {
    await api.delete(`/v1/categories/${id}`)
  },
}

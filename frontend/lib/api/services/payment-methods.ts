import { api } from '../client'
import type {
  PaymentMethod,
  CreatePaymentMethodRequest,
  UpdatePaymentMethodRequest,
} from '../types'

const USE_MOCK = false

import { mockPaymentMethods } from '@/lib/mock-data'

export const paymentMethodsService = {
  /**
   * Listar meios de pagamento
   */
  async list(): Promise<PaymentMethod[]> {
    if (USE_MOCK) {
      await new Promise((r) => setTimeout(r, 200))
      return mockPaymentMethods
    }

    const res = await api.get<{ items: PaymentMethod[] | null }>('/v1/payment-methods')
    const items = Array.isArray(res.items) ? res.items : []
    return items.map((item) => ({
      ...item,
      color: item.color || defaultColor(item.type),
    }))
  },

  /**
   * Obter meio de pagamento por ID
   */
  async get(id: string): Promise<PaymentMethod> {
    if (USE_MOCK) {
      await new Promise((r) => setTimeout(r, 150))
      const pm = mockPaymentMethods.find((p) => p.id === id)
      if (!pm) throw { message: 'Meio de pagamento não encontrado', status: 404 }
      return pm
    }

    const items = await this.list()
    const found = items.find((it) => it.id === id)
    if (!found) throw { message: 'Meio de pagamento não encontrado', status: 404 }
    return found
  },

  /**
   * Criar meio de pagamento
   */
  async create(data: CreatePaymentMethodRequest): Promise<PaymentMethod> {
    if (USE_MOCK) {
      await new Promise((r) => setTimeout(r, 400))
      return {
        id: Date.now().toString(),
        ...data,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      }
    }

    return api.post<PaymentMethod>('/v1/payment-methods', {
      type: data.type,
      label: data.label,
      color: data.color || defaultColor(data.type),
    })
  },

  /**
   * Atualizar meio de pagamento
   */
  async update(id: string, data: UpdatePaymentMethodRequest): Promise<PaymentMethod> {
    if (USE_MOCK) {
      await new Promise((r) => setTimeout(r, 300))
      const pm = mockPaymentMethods.find((p) => p.id === id)
      if (!pm) throw { message: 'Meio de pagamento não encontrado', status: 404 }
      return {
        ...pm,
        ...data,
        updated_at: new Date().toISOString(),
      }
    }

    await api.patch<void>(`/v1/payment-methods/${id}`, {
      type: data.type,
      label: data.label,
      color: data.color || defaultColor(data.type),
    })
    return this.get(id)
  },

  /**
   * Excluir meio de pagamento
   */
  async delete(id: string): Promise<void> {
    if (USE_MOCK) {
      await new Promise((r) => setTimeout(r, 300))
      return
    }

    await api.delete(`/v1/payment-methods/${id}`)
  },
}

function defaultColor(type: PaymentMethod['type']): string {
  if (type === 'cash') return '#22c55e'
  if (type === 'pix') return '#32bcad'
  if (type === 'transfer') return '#3b82f6'
  return '#820ad1'
}

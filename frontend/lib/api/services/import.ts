import type { ImportResult } from '../types'

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8080'

export const importService = {
  /**
   * Upload CSV do Nubank e importar gastos
   */
  async uploadCSV(file: File, paymentMethodId?: string): Promise<ImportResult> {
    const formData = new FormData()
    formData.append('file', file)
    if (paymentMethodId) {
      formData.append('payment_method_id', paymentMethodId)
    }

    const token = typeof window !== 'undefined' ? localStorage.getItem('prime-finance-token') : null
    const headers: HeadersInit = {}
    if (token) {
      headers['Authorization'] = `Bearer ${token}`
    }

    const response = await fetch(`${API_URL}/v1/import/csv`, {
      method: 'POST',
      headers,
      body: formData,
    })

    if (!response.ok) {
      const data = await response.json().catch(() => ({}))
      throw {
        message: data.error || data.message || 'Erro ao importar CSV',
        status: response.status,
      }
    }

    return response.json()
  },
}

import { api } from '../client'
import type { CashflowResponse } from '../types'

export const cashflowService = {
  async get(month: string): Promise<CashflowResponse> {
    return api.get<CashflowResponse>(`/v1/cashflow?month=${month}`)
  },
}

'use client'

import { useQuery } from '@tanstack/react-query'
import { paymentMethodsService } from '@/lib/api'

export function usePaymentMethods() {
  return useQuery({
    queryKey: ['payment-methods'],
    queryFn: () => paymentMethodsService.list(),
  })
}

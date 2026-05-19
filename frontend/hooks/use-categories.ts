'use client'

import { useQuery } from '@tanstack/react-query'
import { categoriesService } from '@/lib/api'

export function useCategories(type?: 'expense' | 'income') {
  return useQuery({
    queryKey: ['categories', type ?? 'all'],
    queryFn: () => categoriesService.list(type),
  })
}

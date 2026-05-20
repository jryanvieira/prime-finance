'use client'

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { budgetsService } from '@/lib/api'

export function useBudgets(month: string) {
  return useQuery({
    queryKey: ['budgets', month],
    queryFn: () => budgetsService.list(month),
  })
}

export function useUpsertBudget(month: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: budgetsService.upsert,
    onSuccess: () => qc.invalidateQueries({ queryKey: ['budgets', month] }),
  })
}

export function useDeleteBudget() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => budgetsService.delete(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['budgets'] }),
  })
}

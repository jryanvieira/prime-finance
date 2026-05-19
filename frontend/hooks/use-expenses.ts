'use client'

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { expensesService } from '@/lib/api'

export function useExpenses(filters: { from: string; to: string }) {
  return useQuery({
    queryKey: ['expenses', filters],
    queryFn: () => expensesService.list(filters),
  })
}

export function useCreateExpense() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: expensesService.create,
    onSuccess: () => qc.invalidateQueries({ queryKey: ['expenses'] }),
  })
}

export function useUpdateExpense() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: Parameters<typeof expensesService.update>[1] }) =>
      expensesService.update(id, data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['expenses'] }),
  })
}

export function useDeleteExpense() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => expensesService.delete(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['expenses'] }),
  })
}

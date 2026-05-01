/**
 * API Services - Prime Finance
 * 
 * Este módulo exporta todos os serviços para comunicação com a API Go.
 * 
 * CONFIGURAÇÃO:
 * 1. Defina NEXT_PUBLIC_API_URL no .env.local para a URL da sua API
 * 2. Use NEXT_PUBLIC_USE_MOCK=true para usar dados mockados durante desenvolvimento
 * 
 * EXEMPLO DE USO:
 * ```tsx
 * import { expensesService, dashboardService } from '@/lib/api'
 * 
 * // Em um componente ou Server Action
 * const expenses = await expensesService.list({ category_id: '1' })
 * const summary = await dashboardService.getSummary()
 * ```
 * 
 * COM SWR (recomendado para Client Components):
 * ```tsx
 * import useSWR from 'swr'
 * import { expensesService } from '@/lib/api'
 * 
 * function MyComponent() {
 *   const { data, error, isLoading } = useSWR('expenses', () => 
 *     expensesService.list()
 *   )
 * }
 * ```
 */

export { api, type ApiError } from './client'
export * from './types'
export { authService } from './services/auth'
export { expensesService } from './services/expenses'
export { recurringExpensesService } from './services/recurring-expenses'
export { paymentMethodsService } from './services/payment-methods'
export { dashboardService } from './services/dashboard'
export { calendarService } from './services/calendar'
export { categoriesService } from './services/categories'
export { incomesService } from './services/incomes'
export { importService } from './services/import'
export { projectionsService } from './services/projections'

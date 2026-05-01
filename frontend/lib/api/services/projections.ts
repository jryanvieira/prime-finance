import { api } from '../client'
import type { 
  ProjectionsSummary, 
  FutureMonthProjection, 
  FinishingInstallment,
  MonthExpensesResponse,
  MonthExpenseItem
} from '../types'

export const projectionsService = {
  /**
   * Obtém projeções para os próximos meses
   * @param monthsAhead Número de meses para projetar no futuro (padrão 6)
   */
  async getFutureProjections(monthsAhead: number = 6): Promise<ProjectionsSummary> {
    const now = new Date()
    // 1. Obter renda base (mês atual)
    const currentMonthKey = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`
    const currentData = await api.get<MonthExpensesResponse>(`/v1/months/${currentMonthKey}/expenses`)
    
    // A renda estimada será o total de receitas do mês atual
    // Fallback para 0 se não houver
    const expectedIncome = currentData.total_incomes || 0

    const months: FutureMonthProjection[] = []
    const finishingInstallments: FinishingInstallment[] = []

    // Fazer as chamadas para os próximos N meses
    // Começa do mês SEGUINTE ao atual
    const promises = []
    for (let i = 1; i <= monthsAhead; i++) {
      const d = new Date(now.getFullYear(), now.getMonth() + i, 1)
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
      promises.push(
        api.get<MonthExpensesResponse>(`/v1/months/${key}/expenses`).then(res => ({
          monthKey: key,
          dateObj: d,
          data: res
        }))
      )
    }

    const results = await Promise.all(promises)

    let totalCommitmentPercentage = 0

    for (const res of results) {
      const items = Array.isArray(res.data.items) ? res.data.items : []
      
      const fixedItems = items.filter(i => i.source === 'recurring')
      const installmentItems = items.filter(i => i.installments_count && i.installments_count > 0)
      
      const totalFixed = fixedItems.reduce((acc, item) => acc + item.amount_cents, 0)
      const totalInstallments = installmentItems.reduce((acc, item) => acc + item.amount_cents, 0)
      
      const committedPercentage = expectedIncome > 0 
        ? ((totalFixed + totalInstallments) / expectedIncome) * 100 
        : 0

      totalCommitmentPercentage += committedPercentage

      months.push({
        month: res.dateObj.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' }),
        total_fixed: totalFixed,
        total_installments: totalInstallments,
        expected_income: expectedIncome,
        committed_percentage: committedPercentage,
        items
      })

      // Identificar parcelas finalizando (<= 3 meses restantes)
      // Para evitar duplicidade na lista de finalizando (já que uma parcela que acaba em 2 meses aparece
      // tanto no mês 1 quanto no mês 2), vamos registrar apenas a instância em que ela ACABA (index === count)
      // ou registrar no primeiro mês e calcular os meses restantes.
      // Melhor: Se installment_index === installments_count, nós adicionamos.
      for (const inst of installmentItems) {
        if (inst.installment_index === inst.installments_count) {
          // Garante que não foi adicionada antes (apesar de index === count acontecer apenas no último mês)
          if (!finishingInstallments.some(f => f.id === inst.id)) {
            finishingInstallments.push({
              id: inst.id,
              description: inst.description,
              amount_cents: inst.amount_cents,
              month: res.dateObj.toLocaleDateString('pt-BR', { month: 'short' }),
              installment_index: inst.installment_index,
              installments_count: inst.installments_count
            })
          }
        }
      }
    }

    const averageCommitment = months.length > 0 ? totalCommitmentPercentage / months.length : 0

    // Ordenar parcelas finalizando por mês mais próximo (como percorremos cronologicamente, já está ordenado)

    return {
      months,
      finishing_installments: finishingInstallments,
      average_commitment: averageCommitment
    }
  }
}

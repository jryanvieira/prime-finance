'use client'

import { useState } from 'react'
import { PlusIcon, Trash2Icon, Target } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { FieldGroup, Field, FieldLabel } from '@/components/ui/field'
import { formatCurrency } from '@/lib/format'
import { useBudgets, useUpsertBudget, useDeleteBudget } from '@/hooks/use-budgets'
import { useCategories } from '@/hooks/use-categories'

function getDiasRestantes(monthStr: string): number {
  const [y, m] = monthStr.split('-').map(Number)
  const today = new Date()
  const isCurrentMonth = today.getFullYear() === y && today.getMonth() + 1 === m
  if (!isCurrentMonth) return 1
  const lastDay = new Date(y, m, 0).getDate()
  return Math.max(1, lastDay - today.getDate())
}

function StatusPill({ percentage }: { percentage: number }) {
  if (percentage > 100) {
    return (
      <span className="inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400">
        estourou
      </span>
    )
  }
  if (percentage >= 80) {
    return (
      <span className="inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400">
        atenção
      </span>
    )
  }
  return (
    <span className="inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400">
      ok
    </span>
  )
}

function ProgressBar({ percentage }: { percentage: number }) {
  const capped = Math.min(percentage, 100)
  const colorClass =
    percentage > 100
      ? 'bg-red-500'
      : percentage >= 80
        ? 'bg-amber-500'
        : 'bg-emerald-500'

  return (
    <div className="h-1.5 w-full rounded-full bg-muted overflow-hidden">
      <div
        className={`h-full rounded-full transition-all ${colorClass}`}
        style={{ width: `${capped}%` }}
      />
    </div>
  )
}

export default function OrcamentosPage() {
  const [currentMonth, setCurrentMonth] = useState(() => new Date().toISOString().slice(0, 7))
  const [isCreateOpen, setIsCreateOpen] = useState(false)
  const [isSuggestOpen, setIsSuggestOpen] = useState(false)
  const [formData, setFormData] = useState({ category_id: '', amount: '' })

  const budgetsQuery = useBudgets(currentMonth)
  const categoriesQuery = useCategories('expense')
  const upsertBudget = useUpsertBudget(currentMonth)
  const deleteBudget = useDeleteBudget()

  const budgets = budgetsQuery.data ?? []
  const categories = categoriesQuery.data ?? []
  const loading = budgetsQuery.isPending

  const diasRestantes = getDiasRestantes(currentMonth)

  const totalLimit = budgets.reduce((s, b) => s + b.amount_cents, 0)
  const totalSpent = budgets.reduce((s, b) => s + b.spent_cents, 0)
  const folga = totalLimit - totalSpent

  // Categorias sem orçamento definido
  const budgetedCategoryIds = new Set(budgets.map((b) => b.category_id))
  const categoriesSemOrcamento = categories.filter((c) => !budgetedCategoryIds.has(c.id))

  const handleSave = async () => {
    if (!formData.category_id || !formData.amount) return
    try {
      await upsertBudget.mutateAsync({
        category_id: formData.category_id,
        month: currentMonth,
        amount_cents: Math.round(parseFloat(formData.amount) * 100),
      })
      setIsCreateOpen(false)
      setFormData({ category_id: '', amount: '' })
    } catch {
      toast.error('Não foi possível salvar o orçamento.')
    }
  }

  const handleDelete = async (id: string) => {
    try {
      await deleteBudget.mutateAsync(id)
    } catch {
      toast.error('Não foi possível remover o orçamento.')
    }
  }

  const formatMonth = (m: string) => {
    const [y, mo] = m.split('-')
    return new Date(Number(y), Number(mo) - 1, 1).toLocaleDateString('pt-BR', {
      month: 'long',
      year: 'numeric',
    })
  }

  const prevMonth = () => {
    const [y, m] = currentMonth.split('-').map(Number)
    const d = new Date(y, m - 2, 1)
    setCurrentMonth(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`)
  }

  const nextMonth = () => {
    const [y, m] = currentMonth.split('-').map(Number)
    const d = new Date(y, m, 1)
    setCurrentMonth(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`)
  }

  return (
    <div className="flex flex-col gap-8">
      <div className="flex flex-col gap-1">
        <h1 className="text-2xl font-semibold tracking-tight">Orçamentos</h1>
        <p className="text-muted-foreground">Defina limites de gasto por categoria.</p>
      </div>

      {/* Month nav */}
      <div className="flex items-center gap-4">
        <Button variant="outline" size="sm" onClick={prevMonth}>‹</Button>
        <span className="font-medium capitalize">{formatMonth(currentMonth)}</span>
        <Button variant="outline" size="sm" onClick={nextMonth}>›</Button>
        <div className="ml-auto">
          <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
            <DialogTrigger asChild>
              <Button size="sm">
                <PlusIcon className="mr-2 size-4" />
                Novo orçamento
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-sm">
              <DialogHeader>
                <DialogTitle>Novo orçamento</DialogTitle>
              </DialogHeader>
              <FieldGroup>
                <Field>
                  <FieldLabel>Categoria</FieldLabel>
                  <Select value={formData.category_id} onValueChange={(v) => setFormData((f) => ({ ...f, category_id: v }))}>
                    <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                    <SelectContent>
                      {categories.map((c) => (
                        <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </Field>
                <Field>
                  <FieldLabel>Limite (R$)</FieldLabel>
                  <Input
                    type="number"
                    min="0"
                    step="0.01"
                    placeholder="0,00"
                    value={formData.amount}
                    onChange={(e) => setFormData((f) => ({ ...f, amount: e.target.value }))}
                  />
                </Field>
              </FieldGroup>
              <DialogFooter>
                <Button onClick={() => void handleSave()} disabled={upsertBudget.isPending}>
                  {upsertBudget.isPending ? 'Salvando...' : 'Salvar'}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* KPI strip */}
      {budgets.length > 0 && (
        <div className="grid gap-4 sm:grid-cols-3">
          <Card>
            <CardContent className="pt-4">
              <p className="text-sm text-muted-foreground">Limite total</p>
              <p className="text-xl font-semibold tabular-nums">{formatCurrency(totalLimit)}</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4">
              <p className="text-sm text-muted-foreground">Já gasto</p>
              <p className="text-xl font-semibold tabular-nums">{formatCurrency(totalSpent)}</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4">
              <p className="text-sm text-muted-foreground">Folga até fim do mês</p>
              <p className={`text-xl font-semibold tabular-nums ${folga < 0 ? 'text-red-500' : ''}`}>
                {formatCurrency(folga)}
              </p>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Banner de sugestões */}
      {categoriesSemOrcamento.length > 0 && (
        <div className="flex items-center justify-between rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 dark:border-amber-800/40 dark:bg-amber-900/10">
          <p className="text-sm text-amber-800 dark:text-amber-300">
            Sugerimos limites para{' '}
            <span className="font-medium">
              {categoriesSemOrcamento.map((c) => c.name).join(', ')}
            </span>{' '}
            com base no seu histórico
          </p>
          <Button
            variant="outline"
            size="sm"
            className="ml-4 shrink-0 border-amber-300 text-amber-800 hover:bg-amber-100 dark:border-amber-700 dark:text-amber-300"
            onClick={() => setIsSuggestOpen(true)}
          >
            Ver sugestões
          </Button>
        </div>
      )}

      {/* Modal placeholder de sugestões */}
      <Dialog open={isSuggestOpen} onOpenChange={setIsSuggestOpen}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Sugestões de limites</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">Em breve você verá sugestões personalizadas com base no seu histórico de gastos.</p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsSuggestOpen(false)}>Fechar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Limites por categoria */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base font-medium">Limites por categoria</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <p className="py-8 text-center text-sm text-muted-foreground">Carregando...</p>
          ) : budgets.length === 0 ? (
            <div className="flex flex-col items-center gap-3 py-12 text-muted-foreground">
              <Target className="size-10 opacity-30" />
              <p className="text-sm">Nenhum orçamento para este mês.</p>
              <Button variant="outline" size="sm" onClick={() => setIsCreateOpen(true)}>
                Criar primeiro orçamento
              </Button>
            </div>
          ) : (
            <div className="flex flex-col divide-y">
              {budgets.map((b) => {
                const saldo = b.amount_cents - b.spent_cents
                const dailyAllowance = b.percentage > 100 ? null : Math.max(0, saldo) / diasRestantes

                return (
                  <div
                    key={b.id}
                    className="grid items-center gap-x-4 gap-y-1 py-4"
                    style={{ gridTemplateColumns: '180px 1fr 130px 120px' }}
                  >
                    {/* Col 1: categoria */}
                    <div className="flex flex-col gap-0.5 min-w-0">
                      <span className="truncate text-sm font-medium">{b.category_name}</span>
                      <span className="text-xs text-muted-foreground">
                        {b.percentage.toFixed(0)}% usado
                      </span>
                    </div>

                    {/* Col 2: progress bar + valores */}
                    <div className="flex flex-col gap-1">
                      <ProgressBar percentage={b.percentage} />
                      <span className="text-xs tabular-nums text-muted-foreground">
                        {formatCurrency(b.spent_cents)} de {formatCurrency(b.amount_cents)}
                      </span>
                    </div>

                    {/* Col 3: daily allowance */}
                    <div className="text-right">
                      {dailyAllowance !== null ? (
                        <span className="text-[22px] font-semibold tabular-nums leading-none">
                          {formatCurrency(Math.round(dailyAllowance))}
                          <span className="text-xs font-normal text-muted-foreground"> /dia</span>
                        </span>
                      ) : (
                        <span className="text-[22px] font-semibold text-muted-foreground leading-none">—</span>
                      )}
                    </div>

                    {/* Col 4: status pill + delete */}
                    <div className="flex items-center justify-end gap-2">
                      <StatusPill percentage={b.percentage} />
                      <Button
                        variant="ghost"
                        size="icon"
                        className="size-8 text-muted-foreground hover:text-destructive"
                        onClick={() => void handleDelete(b.id)}
                        disabled={deleteBudget.isPending}
                      >
                        <Trash2Icon className="size-4" />
                      </Button>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

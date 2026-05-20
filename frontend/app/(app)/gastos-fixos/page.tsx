'use client'

import { useMemo, useState } from 'react'
import {
  PlusIcon,
  PencilIcon,
  Trash2Icon,
  CalendarClockIcon,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Dialog,
  DialogContent,
  DialogDescription,
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
import { recurringExpensesService, categoriesService, type RecurringExpense, type Category } from '@/lib/api'
import { formatCurrency } from '@/lib/format'
import { useDashboardRecurring, useDashboardPaymentMethods } from '@/hooks/use-dashboard'
import { useQuery, useQueryClient } from '@tanstack/react-query'

type RecurringExpenseWithActive = RecurringExpense & { is_active?: boolean }

function getBorderColor(paymentMethodLabel?: string): string {
  const l = paymentMethodLabel?.toLowerCase() ?? ''
  if (l.includes('pix')) return 'var(--pix)'
  if (l.includes('inter')) return 'var(--inter)'
  if (l.includes('nubank') || l.includes('nu')) return 'var(--nu)'
  if (l.includes('mercado') || l.includes('mp')) return 'var(--mp)'
  return 'var(--line)'
}

function getDotColor(paymentMethodLabel?: string): string {
  return getBorderColor(paymentMethodLabel)
}

export default function GastosFixosPage() {
  const recurringQuery = useDashboardRecurring()
  const paymentMethodsQuery = useDashboardPaymentMethods()
  const categoriesQuery = useQuery({
    queryKey: ['categories', 'expense'],
    queryFn: () => categoriesService.list('expense'),
  })
  const qc = useQueryClient()

  const expenses = (recurringQuery.data ?? []) as RecurringExpenseWithActive[]
  const paymentMethods = paymentMethodsQuery.data ?? []
  const categories = (categoriesQuery.data ?? []) as Category[]
  const loading = recurringQuery.isLoading

  const today = new Date().getDate()

  const activeExpenses = expenses.filter((e) => e.is_active !== false)
  const pausedExpenses = expenses.filter((e) => e.is_active === false)

  const totalMensal = useMemo(
    () => activeExpenses.reduce((sum, e) => sum + e.amount_cents, 0),
    [activeExpenses],
  )
  const pagosMes = activeExpenses.filter((e) => e.day_of_month <= today).length
  const proximoVencimento = activeExpenses
    .filter((e) => e.day_of_month > today)
    .sort((a, b) => a.day_of_month - b.day_of_month)[0]

  const [isCreateOpen, setIsCreateOpen] = useState(false)
  const [editingExpense, setEditingExpense] = useState<RecurringExpense | null>(null)
  const [formData, setFormData] = useState({
    description: '',
    amount: '',
    day_of_month: '1',
    category: '',
    payment_method_id: '',
  })

  const resetForm = () => {
    setFormData({ description: '', amount: '', day_of_month: '1', category: '', payment_method_id: '' })
    setEditingExpense(null)
  }

  const handleCreateOrUpdate = async () => {
    const amountCents = Math.round(parseFloat(formData.amount) * 100)
    const currentMonth = new Date().toISOString().slice(0, 7)

    if (editingExpense) {
      await recurringExpensesService.update(editingExpense.id, {
        description: formData.description,
        amount_cents: amountCents,
        day_of_month: parseInt(formData.day_of_month),
        start_month: editingExpense.start_month || currentMonth,
        payment_method_id: formData.payment_method_id || undefined,
        category: formData.category || undefined,
      })
    } else {
      await recurringExpensesService.create({
        description: formData.description,
        amount_cents: amountCents,
        day_of_month: parseInt(formData.day_of_month),
        start_month: currentMonth,
        payment_method_id: formData.payment_method_id || undefined,
        category: formData.category || undefined,
      })
    }

    await qc.invalidateQueries({ queryKey: ['recurring'] })
    resetForm()
    setIsCreateOpen(false)
  }

  const handleEdit = (expense: RecurringExpense) => {
    setEditingExpense(expense)
    setFormData({
      description: expense.description,
      amount: (expense.amount_cents / 100).toFixed(2),
      day_of_month: expense.day_of_month.toString(),
      category: expense.category || '',
      payment_method_id: expense.payment_method_id || '',
    })
    setIsCreateOpen(true)
  }

  const handleDelete = async (id: string) => {
    await recurringExpensesService.delete(id)
    await qc.invalidateQueries({ queryKey: ['recurring'] })
  }

  const renderCard = (expense: RecurringExpenseWithActive) => {
    const pm = paymentMethods.find((p) => p.id === expense.payment_method_id)
    const borderColor = getBorderColor(pm?.label)
    const isPaid = expense.is_active !== false && expense.day_of_month <= today
    const isPaused = expense.is_active === false

    return (
      <div
        key={expense.id}
        className="bg-card rounded-[var(--radius)] border flex flex-col overflow-hidden"
        style={{ borderTop: `3px solid ${borderColor}` }}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-4 pt-4 pb-2">
          <span className="font-medium text-sm">{expense.description}</span>
          {isPaused ? (
            <span
              className="eyebrow text-xs px-2 py-0.5 rounded-full bg-muted"
              style={{ color: 'var(--ink-3)' }}
            >
              PAUSADO
            </span>
          ) : isPaid ? (
            <span
              className="eyebrow text-xs px-2 py-0.5 rounded-full bg-muted"
              style={{ color: 'var(--ok)' }}
            >
              PAGO
            </span>
          ) : null}
        </div>

        {/* Valor */}
        <div className="px-4 pb-3">
          <p className="serif mono-num" style={{ fontSize: '30px', lineHeight: 1.1 }}>
            {formatCurrency(expense.amount_cents)}
          </p>
        </div>

        {/* Footer */}
        <div className="mt-auto border-t px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-1.5 text-muted-foreground text-sm">
            <CalendarClockIcon className="size-4 shrink-0" />
            <span>Dia {expense.day_of_month}</span>
            {pm && (
              <>
                <span className="mx-1 opacity-30">·</span>
                <span
                  className="size-2 rounded-full shrink-0"
                  style={{ background: getDotColor(pm.label) }}
                />
                <span>{pm.label}</span>
              </>
            )}
          </div>
          <div className="flex items-center gap-1">
            <Button variant="ghost" size="sm" onClick={() => handleEdit(expense)}>
              <PencilIcon className="size-3.5" />
            </Button>
            <Button variant="ghost" size="sm" onClick={() => handleDelete(expense.id)}>
              <Trash2Icon className="size-3.5 text-destructive" />
            </Button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-6">
      {/* Page header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Gastos Fixos</h1>
          <p className="text-muted-foreground text-sm">Gerencie suas despesas recorrentes mensais</p>
        </div>

        <Dialog
          open={isCreateOpen}
          onOpenChange={(open) => {
            setIsCreateOpen(open)
            if (!open) resetForm()
          }}
        >
          <DialogTrigger asChild>
            <Button>
              <PlusIcon className="mr-2 size-4" />
              Novo gasto fixo
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>{editingExpense ? 'Editar gasto fixo' : 'Novo gasto fixo'}</DialogTitle>
              <DialogDescription>
                {editingExpense ? 'Edite as informações do gasto fixo' : 'Adicione uma despesa recorrente mensal'}
              </DialogDescription>
            </DialogHeader>

            <FieldGroup className="gap-4">
              <Field>
                <FieldLabel>Descrição</FieldLabel>
                <Input
                  placeholder="Ex: Netflix, Aluguel, etc."
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                />
              </Field>

              <div className="grid grid-cols-2 gap-4">
                <Field>
                  <FieldLabel>Valor (R$)</FieldLabel>
                  <Input
                    type="number"
                    step="0.01"
                    placeholder="0,00"
                    value={formData.amount}
                    onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                  />
                </Field>

                <Field>
                  <FieldLabel>Dia do vencimento</FieldLabel>
                  <Select
                    value={formData.day_of_month}
                    onValueChange={(value) => setFormData({ ...formData, day_of_month: value })}
                  >
                    <SelectTrigger className="w-full">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {Array.from({ length: 28 }, (_, i) => i + 1).map((day) => (
                        <SelectItem key={day} value={day.toString()}>
                          Dia {day}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </Field>
              </div>

              <Field>
                <FieldLabel>Categoria</FieldLabel>
                <Select
                  value={formData.category}
                  onValueChange={(value) => setFormData({ ...formData, category: value })}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Selecione uma categoria" />
                  </SelectTrigger>
                  <SelectContent>
                    {categories.map((cat) => (
                      <SelectItem key={cat.id} value={cat.name}>
                        {cat.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </Field>

              <Field>
                <FieldLabel>Meio de pagamento</FieldLabel>
                <Select
                  value={formData.payment_method_id}
                  onValueChange={(value) => setFormData({ ...formData, payment_method_id: value })}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Selecione um meio de pagamento" />
                  </SelectTrigger>
                  <SelectContent>
                    {paymentMethods.map((pm) => (
                      <SelectItem key={pm.id} value={pm.id}>
                        {pm.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </Field>
            </FieldGroup>

            <DialogFooter>
              <Button variant="outline" onClick={() => { setIsCreateOpen(false); resetForm() }}>
                Cancelar
              </Button>
              <Button
                onClick={handleCreateOrUpdate}
                disabled={!formData.description || !formData.amount || !formData.category || !formData.payment_method_id}
              >
                {editingExpense ? 'Salvar alterações' : 'Adicionar'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {/* KPIs */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-muted-foreground text-sm font-medium">Total mensal</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-semibold mono-num">{formatCurrency(totalMensal)}</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-muted-foreground text-sm font-medium">Pagos · mês</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-semibold">{pagosMes}</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-muted-foreground text-sm font-medium">Próximo vencimento</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-semibold">
              {proximoVencimento ? `Dia ${proximoVencimento.day_of_month}` : '—'}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-muted-foreground text-sm font-medium">Pausados</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-semibold">{pausedExpenses.length}</p>
          </CardContent>
        </Card>
      </div>

      {/* Ativos */}
      <div className="flex flex-col gap-3">
        <p className="eyebrow text-muted-foreground">Ativos</p>
        {loading && (
          <p className="text-sm text-muted-foreground">Carregando gastos fixos...</p>
        )}
        {!loading && activeExpenses.length === 0 && (
          <p className="text-sm text-muted-foreground">Nenhum gasto fixo ativo.</p>
        )}
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {activeExpenses.map(renderCard)}
        </div>
      </div>

      {/* Pausados */}
      {pausedExpenses.length > 0 && (
        <div className="flex flex-col gap-3" style={{ opacity: 0.55 }}>
          <p className="eyebrow text-muted-foreground">Pausados</p>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {pausedExpenses.map(renderCard)}
          </div>
        </div>
      )}
    </div>
  )
}

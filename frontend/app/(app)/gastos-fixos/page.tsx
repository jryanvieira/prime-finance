'use client'

import { useEffect, useMemo, useState } from 'react'
import {
  PlusIcon,
  PencilIcon,
  Trash2Icon,
  CalendarIcon,
  CreditCardIcon,
  BanknoteIcon,
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
import { Badge } from '@/components/ui/badge'
import { FieldGroup, Field, FieldLabel } from '@/components/ui/field'
import { recurringExpensesService, paymentMethodsService, categoriesService, type RecurringExpense, type PaymentMethod, type Category } from '@/lib/api'
import { formatCurrency } from '@/lib/format'

export default function GastosFixosPage() {
  const [expenses, setExpenses] = useState<RecurringExpense[]>([])
  const [paymentMethods, setPaymentMethods] = useState<PaymentMethod[]>([])
  const [categories, setCategories] = useState<Category[]>([])
  const [loading, setLoading] = useState(true)
  const [isCreateOpen, setIsCreateOpen] = useState(false)
  const [editingExpense, setEditingExpense] = useState<RecurringExpense | null>(null)

  const [formData, setFormData] = useState({
    description: '',
    amount: '',
    day_of_month: '1',
    category: '',
    payment_method_id: '',
  })

  useEffect(() => {
    void loadData()
  }, [])

  const loadData = async () => {
    try {
      setLoading(true)
      const [recData, pmData, catData] = await Promise.all([recurringExpensesService.list(), paymentMethodsService.list(), categoriesService.list('expense')])
      setExpenses(recData)
      setPaymentMethods(pmData)
      setCategories(catData)
    } finally {
      setLoading(false)
    }
  }

  const totalActive = useMemo(() => expenses.reduce((sum, exp) => sum + exp.amount_cents, 0), [expenses])

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

    await loadData()
    resetForm()
    setIsCreateOpen(false)
    setEditingExpense(null)
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
    await loadData()
  }

  const resetForm = () => {
    setFormData({
      description: '',
      amount: '',
      day_of_month: '1',
      category: '',
      payment_method_id: '',
    })
    setEditingExpense(null)
  }

  const getPaymentIcon = (type: string) => {
    switch (type) {
      case 'card':
        return <CreditCardIcon className="size-4" />
      case 'cash':
        return <BanknoteIcon className="size-4" />
      default:
        return <CreditCardIcon className="size-4" />
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Gastos Fixos</h1>
          <p className="text-muted-foreground text-sm">
            Gerencie suas despesas recorrentes mensais
          </p>
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
              <DialogTitle>
                {editingExpense ? 'Editar gasto fixo' : 'Novo gasto fixo'}
              </DialogTitle>
              <DialogDescription>
                {editingExpense
                  ? 'Edite as informações do gasto fixo'
                  : 'Adicione uma despesa recorrente mensal'}
              </DialogDescription>
            </DialogHeader>

            <FieldGroup className="gap-4">
              <Field>
                <FieldLabel>Descrição</FieldLabel>
                <Input
                  placeholder="Ex: Netflix, Aluguel, etc."
                  value={formData.description}
                  onChange={(e) =>
                    setFormData({ ...formData, description: e.target.value })
                  }
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
                    onChange={(e) =>
                      setFormData({ ...formData, amount: e.target.value })
                    }
                  />
                </Field>

                <Field>
                  <FieldLabel>Dia do vencimento</FieldLabel>
                  <Select
                    value={formData.day_of_month}
                    onValueChange={(value) =>
                      setFormData({ ...formData, day_of_month: value })
                    }
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
                  onValueChange={(value) =>
                    setFormData({ ...formData, category: value })
                  }
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
                  onValueChange={(value) =>
                    setFormData({ ...formData, payment_method_id: value })
                  }
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
              <Button
                variant="outline"
                onClick={() => {
                  setIsCreateOpen(false)
                  resetForm()
                }}
              >
                Cancelar
              </Button>
              <Button
                onClick={handleCreateOrUpdate}
                disabled={
                  !formData.description ||
                  !formData.amount ||
                  !formData.category ||
                  !formData.payment_method_id
                }
              >
                {editingExpense ? 'Salvar alterações' : 'Adicionar'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-muted-foreground text-sm font-medium">
              Total mensal
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-semibold">{formatCurrency(totalActive)}</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-muted-foreground text-sm font-medium">
              Despesas ativas
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-semibold">
              {expenses.length}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-muted-foreground text-sm font-medium">
              Despesas pausadas
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-semibold">
              0
            </p>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {loading && (
          <Card className="col-span-full">
            <CardContent className="py-8 text-center text-sm text-muted-foreground">
              Carregando gastos fixos...
            </CardContent>
          </Card>
        )}
        {expenses.map((expense) => {
          const paymentMethod = paymentMethods.find((p) => p.id === expense.payment_method_id)
          return (
            <Card key={expense.id}>
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between">
                  <div className="flex flex-col gap-1">
                    <CardTitle className="text-base font-medium">
                      {expense.description}
                    </CardTitle>
                    <Badge variant="secondary" className="w-fit">
                      {expense.category || 'Sem categoria'}
                    </Badge>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="flex flex-col gap-3">
                  <p className="text-2xl font-semibold">
                    {formatCurrency(expense.amount_cents)}
                  </p>

                  <div className="flex items-center gap-4 text-sm">
                    <div className="text-muted-foreground flex items-center gap-1">
                      <CalendarIcon className="size-4" />
                      <span>Dia {expense.day_of_month}</span>
                    </div>

                    {paymentMethod && (
                      <div className="text-muted-foreground flex items-center gap-1">
                        {getPaymentIcon(paymentMethod.type)}
                        <span>{paymentMethod.label}</span>
                      </div>
                    )}
                  </div>

                  <div className="flex items-center justify-end gap-1 border-t pt-3">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleEdit(expense)}
                    >
                      <PencilIcon className="mr-1 size-4" />
                      Editar
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleDelete(expense.id)}
                    >
                      <Trash2Icon className="text-destructive mr-1 size-4" />
                      Excluir
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          )
        })}
      </div>
    </div>
  )
}

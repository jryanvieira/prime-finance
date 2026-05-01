'use client'

import { useEffect, useMemo, useState } from 'react'
import {
  PlusIcon,
  SearchIcon,
  PencilIcon,
  Trash2Icon,
  RepeatIcon,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
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
import { incomesService, categoriesService, type Income, type Category } from '@/lib/api'
import { formatCurrency, formatDate } from '@/lib/mock-data'

export default function ReceitasPage() {
  const [incomes, setIncomes] = useState<Income[]>([])
  const [categories, setCategories] = useState<Category[]>([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [isCreateOpen, setIsCreateOpen] = useState(false)
  const [editingIncome, setEditingIncome] = useState<Income | null>(null)

  const [formData, setFormData] = useState({
    description: '',
    amount: '',
    date: new Date().toISOString().split('T')[0],
    category: '',
    is_recurring: false,
  })

  useEffect(() => {
    void loadData()
  }, [])

  const loadData = async () => {
    try {
      setLoading(true)
      const [incData, catData] = await Promise.all([
        incomesService.list({
          from: '2000-01-01',
          to: '2100-12-31',
        }),
        categoriesService.list('income'),
      ])
      setIncomes(incData)
      setCategories(catData)
    } finally {
      setLoading(false)
    }
  }

  const filteredIncomes = incomes.filter((income) => {
    const matchesSearch = income.description
      .toLowerCase()
      .includes(searchQuery.toLowerCase())
    return matchesSearch
  })

  const totalFiltered = useMemo(
    () => filteredIncomes.reduce((sum, inc) => sum + inc.amount_cents, 0),
    [filteredIncomes]
  )

  const handleCreateOrUpdate = async () => {
    const amountCents = Math.round(parseFloat(formData.amount) * 100)

    if (editingIncome) {
      await incomesService.update(editingIncome.id, {
        description: formData.description,
        amount_cents: amountCents,
        date: formData.date,
        category: formData.category || undefined,
        is_recurring: formData.is_recurring,
      })
    } else {
      await incomesService.create({
        description: formData.description,
        date: formData.date,
        amount_cents: amountCents,
        category: formData.category || undefined,
        is_recurring: formData.is_recurring,
      })
    }

    await loadData()
    resetForm()
    setIsCreateOpen(false)
    setEditingIncome(null)
  }

  const handleEdit = (income: Income) => {
    setEditingIncome(income)
    setFormData({
      description: income.description,
      amount: (income.amount_cents / 100).toFixed(2),
      date: income.date,
      category: income.category || '',
      is_recurring: income.is_recurring,
    })
    setIsCreateOpen(true)
  }

  const handleDelete = async (id: string) => {
    await incomesService.delete(id)
    await loadData()
  }

  const resetForm = () => {
    setFormData({
      description: '',
      amount: '',
      date: new Date().toISOString().split('T')[0],
      category: '',
      is_recurring: false,
    })
    setEditingIncome(null)
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Receitas</h1>
          <p className="text-muted-foreground text-sm">
            Gerencie suas receitas e entradas
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
              Nova receita
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>
                {editingIncome ? 'Editar receita' : 'Nova receita'}
              </DialogTitle>
              <DialogDescription>
                {editingIncome
                  ? 'Edite as informações da receita'
                  : 'Adicione uma nova receita ao seu controle financeiro'}
              </DialogDescription>
            </DialogHeader>

            <FieldGroup className="gap-4">
              <Field>
                <FieldLabel>Descrição</FieldLabel>
                <Input
                  placeholder="Ex: Salário, Freelance, etc."
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
                  <FieldLabel>Data</FieldLabel>
                  <Input
                    type="date"
                    value={formData.date}
                    onChange={(e) =>
                      setFormData({ ...formData, date: e.target.value })
                    }
                  />
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
                        <div className="flex items-center gap-2">
                          <span
                            className="size-2.5 rounded-full"
                            style={{ backgroundColor: cat.color }}
                          />
                          {cat.name}
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </Field>

              <Field>
                <label className="flex items-center gap-2 text-sm cursor-pointer">
                  <input
                    type="checkbox"
                    checked={formData.is_recurring}
                    onChange={(e) =>
                      setFormData({ ...formData, is_recurring: e.target.checked })
                    }
                    className="size-4 rounded border-input"
                  />
                  Receita recorrente (ex: salário mensal)
                </label>
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
                  !formData.amount
                }
              >
                {editingIncome ? 'Salvar alterações' : 'Adicionar'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      <Card>
        <CardHeader className="pb-4">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <CardTitle className="text-base font-medium">
              Total: {formatCurrency(totalFiltered)}
            </CardTitle>

            <div className="relative">
              <SearchIcon className="text-muted-foreground absolute top-1/2 left-3 size-4 -translate-y-1/2" />
              <Input
                placeholder="Buscar receitas..."
                className="pl-9"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
          </div>
        </CardHeader>

        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Data</TableHead>
                <TableHead>Descrição</TableHead>
                <TableHead>Categoria</TableHead>
                <TableHead className="text-right">Valor</TableHead>
                <TableHead className="w-20"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-muted-foreground py-8 text-center">
                    Carregando receitas...
                  </TableCell>
                </TableRow>
              ) : filteredIncomes.length === 0 ? (
                <TableRow>
                  <TableCell
                    colSpan={5}
                    className="text-muted-foreground py-8 text-center"
                  >
                    Nenhuma receita encontrada
                  </TableCell>
                </TableRow>
              ) : (
                filteredIncomes.map((income) => (
                  <TableRow key={income.id}>
                    <TableCell className="text-muted-foreground">
                      {formatDate(income.date)}
                    </TableCell>
                    <TableCell className="font-medium">
                      <div className="flex items-center gap-2">
                        {income.description}
                        {income.is_recurring && (
                          <span title="Recorrente">
                            <RepeatIcon className="size-3.5 text-muted-foreground" />
                          </span>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant="secondary">{income.category || 'Sem categoria'}</Badge>
                    </TableCell>
                    <TableCell className="text-right font-medium text-emerald-600 dark:text-emerald-400">
                      +{formatCurrency(income.amount_cents)}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center justify-end gap-1">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleEdit(income)}
                        >
                          <PencilIcon className="size-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDelete(income.id)}
                        >
                          <Trash2Icon className="text-destructive size-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  )
}

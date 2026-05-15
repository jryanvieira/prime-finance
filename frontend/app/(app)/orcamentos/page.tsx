'use client'

import { useEffect, useState } from 'react'
import { PlusIcon, Trash2Icon, Target } from 'lucide-react'
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
import { budgetsService, categoriesService, type Budget, type Category } from '@/lib/api'
import { formatCurrency } from '@/lib/format'

function BudgetProgressBar({ percentage }: { percentage: number }) {
  const capped = Math.min(percentage, 100)
  const color =
    percentage >= 100 ? 'bg-red-500' : percentage >= 80 ? 'bg-amber-500' : 'bg-emerald-500'

  return (
    <div className="flex items-center gap-3">
      <div className="flex-1 h-2 rounded-full bg-muted overflow-hidden">
        <div
          className={`h-full rounded-full transition-all ${color}`}
          style={{ width: `${capped}%` }}
        />
      </div>
      <span className="text-xs tabular-nums w-10 text-right text-muted-foreground">
        {percentage.toFixed(0)}%
      </span>
    </div>
  )
}

export default function OrcamentosPage() {
  const [budgets, setBudgets] = useState<Budget[]>([])
  const [categories, setCategories] = useState<Category[]>([])
  const [loading, setLoading] = useState(true)
  const [currentMonth, setCurrentMonth] = useState(() => new Date().toISOString().slice(0, 7))

  const [isCreateOpen, setIsCreateOpen] = useState(false)
  const [formData, setFormData] = useState({ category_id: '', amount: '' })
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    void load()
  }, [currentMonth])

  const load = async () => {
    try {
      setLoading(true)
      const [b, cats] = await Promise.all([
        budgetsService.list(currentMonth),
        categoriesService.list('expense'),
      ])
      setBudgets(b)
      setCategories(cats)
    } finally {
      setLoading(false)
    }
  }

  const handleSave = async () => {
    if (!formData.category_id || !formData.amount) return
    try {
      setSaving(true)
      await budgetsService.upsert({
        category_id: formData.category_id,
        month: currentMonth,
        amount_cents: Math.round(parseFloat(formData.amount) * 100),
      })
      setIsCreateOpen(false)
      setFormData({ category_id: '', amount: '' })
      await load()
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async (id: string) => {
    await budgetsService.delete(id)
    await load()
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

  const totalBudget = budgets.reduce((s, b) => s + b.amount_cents, 0)
  const totalSpent = budgets.reduce((s, b) => s + b.spent_cents, 0)
  const overBudget = budgets.filter((b) => b.percentage >= 100)

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
                <Button onClick={() => void handleSave()} disabled={saving}>
                  {saving ? 'Salvando...' : 'Salvar'}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Summary cards */}
      {budgets.length > 0 && (
        <div className="grid gap-4 sm:grid-cols-3">
          <Card>
            <CardContent className="pt-4">
              <p className="text-sm text-muted-foreground">Total orçado</p>
              <p className="text-xl font-semibold">{formatCurrency(totalBudget)}</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4">
              <p className="text-sm text-muted-foreground">Total gasto</p>
              <p className="text-xl font-semibold">{formatCurrency(totalSpent)}</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4">
              <p className="text-sm text-muted-foreground">Categorias no limite</p>
              <p className="text-xl font-semibold text-red-500">{overBudget.length}</p>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Budget list */}
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
              {budgets.map((b) => (
                <div key={b.id} className="flex flex-col gap-2 py-4">
                  <div className="flex items-center justify-between">
                    <div className="flex flex-col gap-0.5">
                      <span className="font-medium text-sm">{b.category_name}</span>
                      <span className="text-xs text-muted-foreground">
                        {formatCurrency(b.spent_cents)} de {formatCurrency(b.amount_cents)}
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      {b.percentage >= 100 && (
                        <span className="text-xs text-red-500 font-medium">Excedido</span>
                      )}
                      {b.percentage >= 80 && b.percentage < 100 && (
                        <span className="text-xs text-amber-500 font-medium">Atenção</span>
                      )}
                      <Button
                        variant="ghost"
                        size="icon"
                        className="size-8 text-muted-foreground hover:text-destructive"
                        onClick={() => void handleDelete(b.id)}
                      >
                        <Trash2Icon className="size-4" />
                      </Button>
                    </div>
                  </div>
                  <BudgetProgressBar percentage={b.percentage} />
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

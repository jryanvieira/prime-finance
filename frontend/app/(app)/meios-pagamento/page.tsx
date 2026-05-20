'use client'

import { useState } from 'react'
import { PlusIcon, CreditCard } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
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
import { paymentMethodsService, type PaymentMethod } from '@/lib/api'
import { useDashboardExpenses, useDashboardPaymentMethods } from '@/hooks/use-dashboard'
import { useQueryClient } from '@tanstack/react-query'

const paymentTypes = [
  { value: 'card', label: 'Cartão' },
  { value: 'cash', label: 'Dinheiro' },
  { value: 'pix', label: 'Pix' },
  { value: 'transfer', label: 'Transferência' },
] as const

const colorPresets = [
  { value: '#820ad1', label: 'Roxo (Nubank)' },
  { value: '#ff7a00', label: 'Laranja (Inter)' },
  { value: '#22c55e', label: 'Verde' },
  { value: '#32bcad', label: 'Turquesa (Pix)' },
  { value: '#3b82f6', label: 'Azul' },
  { value: '#ef4444', label: 'Vermelho' },
  { value: '#f59e0b', label: 'Amarelo' },
  { value: '#8b5cf6', label: 'Violeta' },
  { value: '#ec4899', label: 'Rosa' },
  { value: '#14b8a6', label: 'Teal' },
]

function getMethodColor(label: string): string {
  const l = label.toLowerCase()
  if (l.includes('pix')) return 'var(--pix)'
  if (l.includes('inter')) return 'var(--inter)'
  if (l.includes('nubank') || l.includes('nu')) return 'var(--nu)'
  if (l.includes('mercado') || l.includes('mp')) return 'var(--mp)'
  return 'var(--line)'
}

function formatCents(cents: number): string {
  return (cents / 100).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
}

export default function MeiosPagamentoPage() {
  const { data: methods = [], isLoading } = useDashboardPaymentMethods()
  const { data: expenses = [] } = useDashboardExpenses()
  const qc = useQueryClient()

  const [isCreateOpen, setIsCreateOpen] = useState(false)
  const [editingMethod, setEditingMethod] = useState<PaymentMethod | null>(null)
  const [formData, setFormData] = useState({
    type: 'card' as PaymentMethod['type'],
    label: '',
    color: '#3b82f6',
  })

  const resetForm = () => {
    setFormData({ type: 'card', label: '', color: '#3b82f6' })
    setEditingMethod(null)
  }

  const handleCreateOrUpdate = async () => {
    if (editingMethod) {
      await paymentMethodsService.update(editingMethod.id, formData)
    } else {
      await paymentMethodsService.create(formData)
    }
    await qc.invalidateQueries({ queryKey: ['payment-methods'] })
    resetForm()
    setIsCreateOpen(false)
  }

  const handleEdit = (method: PaymentMethod) => {
    setEditingMethod(method)
    setFormData({
      type: method.type,
      label: method.label,
      color: method.color || '#3b82f6',
    })
    setIsCreateOpen(true)
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Meios de Pagamento</h1>
          <p className="text-muted-foreground text-sm">Gerencie seus cartões e formas de pagamento</p>
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
              Novo meio de pagamento
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>
                {editingMethod ? 'Editar meio de pagamento' : 'Novo meio de pagamento'}
              </DialogTitle>
              <DialogDescription>
                {editingMethod
                  ? 'Edite as informações do meio de pagamento'
                  : 'Adicione um novo cartão ou forma de pagamento'}
              </DialogDescription>
            </DialogHeader>

            <FieldGroup className="gap-4">
              <Field>
                <FieldLabel>Tipo</FieldLabel>
                <Select
                  value={formData.type}
                  onValueChange={(value) =>
                    setFormData({ ...formData, type: value as PaymentMethod['type'] })
                  }
                >
                  <SelectTrigger className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {paymentTypes.map((type) => (
                      <SelectItem key={type.value} value={type.value}>
                        {type.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </Field>

              <Field>
                <FieldLabel>Nome</FieldLabel>
                <Input
                  placeholder="Ex: Nubank, Itaú, Dinheiro, etc."
                  value={formData.label}
                  onChange={(e) => setFormData({ ...formData, label: e.target.value })}
                />
              </Field>

              <Field>
                <FieldLabel>Cor</FieldLabel>
                <Select
                  value={formData.color}
                  onValueChange={(value) => setFormData({ ...formData, color: value })}
                >
                  <SelectTrigger className="w-full">
                    <div className="flex items-center gap-2">
                      <div className="size-4 rounded-full" style={{ backgroundColor: formData.color }} />
                      <SelectValue />
                    </div>
                  </SelectTrigger>
                  <SelectContent>
                    {colorPresets.map((color) => (
                      <SelectItem key={color.value} value={color.value}>
                        <div className="flex items-center gap-2">
                          <div className="size-4 rounded-full" style={{ backgroundColor: color.value }} />
                          {color.label}
                        </div>
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
              <Button onClick={handleCreateOrUpdate} disabled={!formData.label}>
                {editingMethod ? 'Salvar alterações' : 'Adicionar'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {isLoading ? (
        <p className="text-muted-foreground text-sm">Carregando meios de pagamento...</p>
      ) : methods.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <CreditCard className="text-muted-foreground mb-4 size-12" />
          <h3 className="text-lg font-medium">Nenhum meio de pagamento cadastrado</h3>
          <p className="text-muted-foreground mt-1 text-sm">
            Adicione seus cartões e formas de pagamento para começar
          </p>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {methods.map((pm) => {
            const color = getMethodColor(pm.label)
            const pmExpenses = expenses.filter((e) => e.payment_method_id === pm.id)
            const totalCents = pmExpenses.reduce((sum, e) => sum + e.amount_cents, 0)
            const count = pmExpenses.length

            return (
              <div
                key={pm.id}
                className="bg-card rounded-xl border overflow-hidden flex flex-col"
                style={{ borderTop: `4px solid ${color}` }}
              >
                {/* Body */}
                <div className="relative p-5 flex-1">
                  {/* Floating icon */}
                  <div
                    className="absolute top-4 right-4 flex size-10 items-center justify-center rounded-lg"
                    style={{ backgroundColor: `color-mix(in srgb, ${color} 15%, transparent)` }}
                  >
                    <CreditCard className="size-5" style={{ color }} />
                  </div>

                  {/* Eyebrow */}
                  <p
                    className="eyebrow text-xs uppercase tracking-widest font-semibold mb-1"
                    style={{ color }}
                  >
                    {paymentTypes.find((t) => t.value === pm.type)?.label ?? pm.type}
                  </p>

                  {/* Name */}
                  <p className="serif text-[28px] leading-tight font-medium">{pm.label}</p>

                  {/* Stats */}
                  <div className="mt-4 flex gap-6">
                    <div>
                      <p className="text-muted-foreground text-xs">Gasto · mês</p>
                      <p className="mono-num text-sm font-semibold">{formatCents(totalCents)}</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground text-xs">Transações</p>
                      <p className="mono-num text-sm font-semibold">{count}</p>
                    </div>
                  </div>
                </div>

                {/* Footer pills */}
                <div className="border-t px-5 py-3 flex gap-2">
                  <button className="text-xs px-3 py-1 rounded-full border text-muted-foreground hover:bg-accent transition-colors">
                    Detalhar
                  </button>
                  <button
                    className="text-xs px-3 py-1 rounded-full border hover:bg-accent transition-colors"
                    onClick={() => handleEdit(pm)}
                  >
                    Editar
                  </button>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

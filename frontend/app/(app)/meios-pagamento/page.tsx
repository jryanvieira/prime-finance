'use client'

import { useEffect, useState } from 'react'
import {
  PlusIcon,
  PencilIcon,
  Trash2Icon,
  CreditCardIcon,
  BanknoteIcon,
  SmartphoneIcon,
  ArrowRightLeftIcon,
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
import { paymentMethodsService, type PaymentMethod } from '@/lib/api'

const paymentTypes = [
  { value: 'card', label: 'Cartão', icon: CreditCardIcon },
  { value: 'cash', label: 'Dinheiro', icon: BanknoteIcon },
  { value: 'pix', label: 'Pix', icon: SmartphoneIcon },
  { value: 'transfer', label: 'Transferência', icon: ArrowRightLeftIcon },
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

export default function MeiosPagamentoPage() {
  const [methods, setMethods] = useState<PaymentMethod[]>([])
  const [loading, setLoading] = useState(true)
  const [isCreateOpen, setIsCreateOpen] = useState(false)
  const [editingMethod, setEditingMethod] = useState<PaymentMethod | null>(null)

  const [formData, setFormData] = useState({
    type: 'card' as PaymentMethod['type'],
    label: '',
    color: '#3b82f6',
  })

  useEffect(() => {
    void loadMethods()
  }, [])

  const loadMethods = async () => {
    try {
      setLoading(true)
      const data = await paymentMethodsService.list()
      setMethods(data)
    } finally {
      setLoading(false)
    }
  }

  const handleCreateOrUpdate = async () => {
    if (editingMethod) {
      await paymentMethodsService.update(editingMethod.id, {
        type: formData.type,
        label: formData.label,
        color: formData.color,
      })
    } else {
      await paymentMethodsService.create({
        type: formData.type,
        label: formData.label,
        color: formData.color,
      })
    }

    await loadMethods()

    resetForm()
    setIsCreateOpen(false)
    setEditingMethod(null)
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

  const handleDelete = async (id: string) => {
    await paymentMethodsService.delete(id)
    await loadMethods()
  }

  const resetForm = () => {
    setFormData({
      type: 'card',
      label: '',
      color: '#3b82f6',
    })
    setEditingMethod(null)
  }

  const getIcon = (type: PaymentMethod['type']) => {
    const found = paymentTypes.find((t) => t.value === type)
    if (found) {
      const Icon = found.icon
      return <Icon className="size-5" />
    }
    return <CreditCardIcon className="size-5" />
  }

  const getTypeLabel = (type: PaymentMethod['type']) => {
    return paymentTypes.find((t) => t.value === type)?.label || type
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">
            Meios de Pagamento
          </h1>
          <p className="text-muted-foreground text-sm">
            Gerencie seus cartões e formas de pagamento
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
              Novo meio de pagamento
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>
                {editingMethod
                  ? 'Editar meio de pagamento'
                  : 'Novo meio de pagamento'}
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
                    setFormData({
                      ...formData,
                      type: value as PaymentMethod['type'],
                    })
                  }
                >
                  <SelectTrigger className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {paymentTypes.map((type) => (
                      <SelectItem key={type.value} value={type.value}>
                        <div className="flex items-center gap-2">
                          <type.icon className="size-4" />
                          {type.label}
                        </div>
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
                  onChange={(e) =>
                    setFormData({ ...formData, label: e.target.value })
                  }
                />
              </Field>

              <Field>
                <FieldLabel>Cor</FieldLabel>
                <Select
                  value={formData.color}
                  onValueChange={(value) =>
                    setFormData({ ...formData, color: value })
                  }
                >
                  <SelectTrigger className="w-full">
                    <div className="flex items-center gap-2">
                      <div
                        className="size-4 rounded-full"
                        style={{ backgroundColor: formData.color }}
                      />
                      <SelectValue />
                    </div>
                  </SelectTrigger>
                  <SelectContent>
                    {colorPresets.map((color) => (
                      <SelectItem key={color.value} value={color.value}>
                        <div className="flex items-center gap-2">
                          <div
                            className="size-4 rounded-full"
                            style={{ backgroundColor: color.value }}
                          />
                          {color.label}
                        </div>
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
              <Button onClick={handleCreateOrUpdate} disabled={!formData.label}>
                {editingMethod ? 'Salvar alterações' : 'Adicionar'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {loading && (
          <Card className="col-span-full">
            <CardContent className="py-8 text-center text-sm text-muted-foreground">
              Carregando meios de pagamento...
            </CardContent>
          </Card>
        )}
        {methods.map((method) => (
          <Card key={method.id} className="group relative overflow-hidden">
            <div
              className="absolute top-0 left-0 h-1 w-full"
            style={{ backgroundColor: method.color || '#3b82f6' }}
            />
            <CardHeader className="pb-3">
              <div className="flex items-start justify-between">
                <div
                  className="flex size-10 items-center justify-center rounded-lg"
                  style={{ backgroundColor: `${method.color || '#3b82f6'}20` }}
                >
                  <span style={{ color: method.color || '#3b82f6' }}>{getIcon(method.type)}</span>
                </div>
                <div className="flex items-center gap-1 opacity-0 transition-opacity group-hover:opacity-100">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleEdit(method)}
                  >
                    <PencilIcon className="size-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleDelete(method.id)}
                  >
                    <Trash2Icon className="text-destructive size-4" />
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <CardTitle className="text-lg">{method.label}</CardTitle>
              <p className="text-muted-foreground mt-1 text-sm">
                {getTypeLabel(method.type)}
              </p>
            </CardContent>
          </Card>
        ))}
      </div>

      {methods.length === 0 && (
        <Card className="py-12">
          <CardContent className="flex flex-col items-center justify-center text-center">
            <CreditCardIcon className="text-muted-foreground mb-4 size-12" />
            <h3 className="text-lg font-medium">
              Nenhum meio de pagamento cadastrado
            </h3>
            <p className="text-muted-foreground mt-1 text-sm">
              Adicione seus cartões e formas de pagamento para começar
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  )
}

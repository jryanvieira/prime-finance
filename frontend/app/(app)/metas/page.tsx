'use client'

import { useState } from 'react'
import { PlusIcon, PiggyBank } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent } from '@/components/ui/card'
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { FieldGroup, Field, FieldLabel } from '@/components/ui/field'
import { type Goal } from '@/lib/api'
import { formatCurrency } from '@/lib/format'
import { useDashboardGoals } from '@/hooks/use-dashboard'
import { useCreateGoal, useUpdateGoal, useContributeGoal, useDeleteGoal } from '@/hooks/use-goals'

const emptyGoalForm = { name: '', target: '', deadline: '' }

function formatDeadline(deadline: string) {
  return new Date(deadline + 'T00:00:00').toLocaleDateString('pt-BR', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  })
}

function GoalCard({
  g,
  onContribute,
  onEdit,
  onDelete,
}: {
  g: Goal
  onContribute: (g: Goal) => void
  onEdit: (g: Goal) => void
  onDelete: (id: string) => void
}) {
  const onTrack = g.on_track
  const pct = Math.min(100, g.percentage)
  const dailyRequired = g.monthly_required_cents > 0
    ? Math.round(g.monthly_required_cents / 30)
    : 0

  return (
    <Card className="flex flex-col gap-0 overflow-hidden">
      <div className="flex flex-col gap-1 p-4 pb-2">
        {/* Eyebrow */}
        <p className="text-[10px] uppercase tracking-widest text-muted-foreground font-medium">
          PLANEJAMENTO
        </p>

        {/* Header: nome + percentual */}
        <div className="flex items-start justify-between gap-2">
          <span className="text-[22px] font-semibold leading-tight">{g.name}</span>
          <span
            className="text-[28px] font-semibold italic leading-tight shrink-0"
            style={{ color: onTrack ? 'oklch(0.55 0.15 145)' : 'oklch(0.65 0.18 55)' }}
          >
            {pct.toFixed(0)}%
          </span>
        </div>

        {/* Prazo */}
        {g.deadline && (
          <p className="font-mono text-sm text-muted-foreground">
            prazo · {formatDeadline(g.deadline)}
          </p>
        )}

        {/* Status eyebrow */}
        <p
          className="text-[10px] uppercase tracking-widest font-semibold"
          style={{ color: onTrack ? 'oklch(0.55 0.15 145)' : 'oklch(0.65 0.18 55)' }}
        >
          {onTrack ? 'NO CAMINHO' : 'SUBIR O RITMO'}
        </p>
      </div>

      <div className="px-4 pb-1">
        {/* Progress bar */}
        <div className="h-2 w-full rounded-full bg-muted overflow-hidden">
          <div
            className="h-full rounded-full transition-all duration-400"
            style={{
              width: `${pct}%`,
              backgroundColor: onTrack ? 'oklch(0.55 0.15 145)' : 'oklch(0.65 0.18 55)',
            }}
          />
        </div>

        {/* Valores */}
        <div className="mt-1.5 flex items-center justify-between">
          <span className="font-mono text-sm text-muted-foreground">
            {formatCurrency(g.current_amount_cents)}
          </span>
          <span className="font-mono text-sm font-medium">
            {formatCurrency(g.target_amount_cents)}
          </span>
        </div>
      </div>

      {/* Insight box */}
      {g.percentage < 100 && g.monthly_required_cents > 0 && (
        <div className="mx-4 mt-3 rounded-lg border border-border bg-muted p-3">
          <p className="text-[10px] uppercase tracking-widest text-muted-foreground font-medium mb-1">
            PARA ATINGIR NO PRAZO
          </p>
          <p className="text-[18px] font-semibold leading-tight">
            {formatCurrency(g.monthly_required_cents)}/mês
          </p>
          <p className="font-mono text-sm text-muted-foreground">
            ou {formatCurrency(dailyRequired)}/dia
          </p>
        </div>
      )}

      {/* Footer pills */}
      <div className="flex items-center gap-2 p-4 pt-3">
        <Button
          variant="outline"
          size="sm"
          className="flex-1 gap-1.5"
          onClick={() => onContribute(g)}
          disabled={g.percentage >= 100}
        >
          <PiggyBank className="size-3.5" />
          Contribuir
        </Button>
        <Button
          variant="outline"
          size="sm"
          onClick={() => onEdit(g)}
        >
          Editar
        </Button>
      </div>
    </Card>
  )
}

export default function MetasPage() {
  const [isCreateOpen, setIsCreateOpen] = useState(false)
  const [createForm, setCreateForm] = useState(emptyGoalForm)

  const [editGoal, setEditGoal] = useState<Goal | null>(null)
  const [editForm, setEditForm] = useState(emptyGoalForm)

  const [contributeGoal, setContributeGoal] = useState<Goal | null>(null)
  const [contributeAmount, setContributeAmount] = useState('')

  const goalsQuery = useDashboardGoals()
  const createGoal = useCreateGoal()
  const updateGoal = useUpdateGoal()
  const contributeGoalMutation = useContributeGoal()
  const deleteGoal = useDeleteGoal()

  const goals = goalsQuery.data ?? []
  const loading = goalsQuery.isPending

  // KPI strip
  const totalInvested = goals.reduce((s, g) => s + g.current_amount_cents, 0)
  const totalRemaining = goals.reduce((s, g) => {
    const diff = g.target_amount_cents - g.current_amount_cents
    return s + (diff > 0 ? diff : 0)
  }, 0)
  const totalMonthly = goals.reduce((s, g) => s + (g.monthly_required_cents ?? 0), 0)

  const handleCreate = async () => {
    if (!createForm.name || !createForm.target) return
    try {
      await createGoal.mutateAsync({
        name: createForm.name,
        target_amount_cents: Math.round(parseFloat(createForm.target) * 100),
        deadline: createForm.deadline || null,
      })
      setIsCreateOpen(false)
      setCreateForm(emptyGoalForm)
    } catch {
      toast.error('Erro ao criar meta.')
    }
  }

  const openEdit = (g: Goal) => {
    setEditGoal(g)
    setEditForm({
      name: g.name,
      target: (g.target_amount_cents / 100).toFixed(2),
      deadline: g.deadline ?? '',
    })
  }

  const handleUpdate = async () => {
    if (!editGoal || !editForm.name || !editForm.target) return
    try {
      await updateGoal.mutateAsync({
        id: editGoal.id,
        data: {
          name: editForm.name,
          target_amount_cents: Math.round(parseFloat(editForm.target) * 100),
          deadline: editForm.deadline || null,
        },
      })
      setEditGoal(null)
    } catch {
      toast.error('Erro ao atualizar meta.')
    }
  }

  const handleContribute = async () => {
    if (!contributeGoal || !contributeAmount) return
    try {
      await contributeGoalMutation.mutateAsync({
        id: contributeGoal.id,
        data: { amount_cents: Math.round(parseFloat(contributeAmount) * 100) },
      })
      setContributeGoal(null)
      setContributeAmount('')
    } catch {
      toast.error('Erro ao registrar contribuição.')
    }
  }

  return (
    <div className="flex flex-col gap-8">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div className="flex flex-col gap-1">
          <h1 className="text-2xl font-semibold tracking-tight">Metas Financeiras</h1>
          <p className="text-muted-foreground">Acompanhe seu progresso em direção aos seus objetivos.</p>
        </div>
        <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
          <DialogTrigger asChild>
            <Button size="sm">
              <PlusIcon className="mr-2 size-4" />
              Nova meta
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-sm">
            <DialogHeader>
              <DialogTitle>Nova meta</DialogTitle>
            </DialogHeader>
            <FieldGroup>
              <Field>
                <FieldLabel>Nome</FieldLabel>
                <Input
                  placeholder="Ex: Viagem para Europa"
                  value={createForm.name}
                  onChange={(e) => setCreateForm((f) => ({ ...f, name: e.target.value }))}
                />
              </Field>
              <Field>
                <FieldLabel>Valor alvo (R$)</FieldLabel>
                <Input
                  type="number"
                  min="0"
                  step="0.01"
                  placeholder="0,00"
                  value={createForm.target}
                  onChange={(e) => setCreateForm((f) => ({ ...f, target: e.target.value }))}
                />
              </Field>
              <Field>
                <FieldLabel>Prazo (opcional)</FieldLabel>
                <Input
                  type="date"
                  value={createForm.deadline}
                  onChange={(e) => setCreateForm((f) => ({ ...f, deadline: e.target.value }))}
                />
              </Field>
            </FieldGroup>
            <DialogFooter>
              <Button onClick={() => void handleCreate()} disabled={createGoal.isPending}>
                {createGoal.isPending ? 'Salvando...' : 'Criar meta'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {/* KPI strip */}
      {goals.length > 0 && (
        <div className="grid grid-cols-3 gap-3">
          <div className="rounded-lg border border-border bg-card p-4">
            <p className="text-[10px] uppercase tracking-widest text-muted-foreground font-medium mb-1">
              Investido em metas
            </p>
            <p className="font-mono text-lg font-semibold">{formatCurrency(totalInvested)}</p>
          </div>
          <div className="rounded-lg border border-border bg-card p-4">
            <p className="text-[10px] uppercase tracking-widest text-muted-foreground font-medium mb-1">
              A juntar ainda
            </p>
            <p className="font-mono text-lg font-semibold">{formatCurrency(totalRemaining)}</p>
          </div>
          <div className="rounded-lg border border-border bg-card p-4">
            <p className="text-[10px] uppercase tracking-widest text-muted-foreground font-medium mb-1">
              Aporte mensal recomendado
            </p>
            <p className="font-mono text-lg font-semibold">{formatCurrency(totalMonthly)}</p>
          </div>
        </div>
      )}

      {/* Edit dialog */}
      <Dialog open={!!editGoal} onOpenChange={(open) => { if (!open) setEditGoal(null) }}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Editar meta</DialogTitle>
          </DialogHeader>
          <FieldGroup>
            <Field>
              <FieldLabel>Nome</FieldLabel>
              <Input
                placeholder="Ex: Viagem para Europa"
                value={editForm.name}
                onChange={(e) => setEditForm((f) => ({ ...f, name: e.target.value }))}
              />
            </Field>
            <Field>
              <FieldLabel>Valor alvo (R$)</FieldLabel>
              <Input
                type="number"
                min="0"
                step="0.01"
                placeholder="0,00"
                value={editForm.target}
                onChange={(e) => setEditForm((f) => ({ ...f, target: e.target.value }))}
              />
            </Field>
            <Field>
              <FieldLabel>Prazo (opcional)</FieldLabel>
              <Input
                type="date"
                value={editForm.deadline}
                onChange={(e) => setEditForm((f) => ({ ...f, deadline: e.target.value }))}
              />
            </Field>
          </FieldGroup>
          <DialogFooter>
            <Button onClick={() => void handleUpdate()} disabled={updateGoal.isPending}>
              {updateGoal.isPending ? 'Salvando...' : 'Salvar'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Contribute dialog */}
      <Dialog open={!!contributeGoal} onOpenChange={(open) => { if (!open) { setContributeGoal(null); setContributeAmount('') } }}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Adicionar contribuição</DialogTitle>
          </DialogHeader>
          {contributeGoal && (
            <p className="text-sm text-muted-foreground">
              Meta: <span className="font-medium text-foreground">{contributeGoal.name}</span>
              {' '}— faltam{' '}
              <span className="font-medium text-foreground">
                {formatCurrency(contributeGoal.target_amount_cents - contributeGoal.current_amount_cents)}
              </span>
            </p>
          )}
          <FieldGroup>
            <Field>
              <FieldLabel>Valor (R$)</FieldLabel>
              <Input
                type="number"
                min="0"
                step="0.01"
                placeholder="0,00"
                value={contributeAmount}
                onChange={(e) => setContributeAmount(e.target.value)}
              />
            </Field>
          </FieldGroup>
          <DialogFooter>
            <Button onClick={() => void handleContribute()} disabled={contributeGoalMutation.isPending}>
              {contributeGoalMutation.isPending ? 'Salvando...' : 'Confirmar'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Goals grid */}
      {loading ? (
        <p className="py-8 text-center text-sm text-muted-foreground">Carregando...</p>
      ) : goals.length === 0 ? (
        <div className="flex flex-col items-center gap-3 py-16 text-muted-foreground">
          <p className="text-sm font-medium">Nenhuma meta cadastrada ainda.</p>
          <p className="text-xs">Crie sua primeira meta financeira e comece a poupar.</p>
          <Button variant="outline" size="sm" onClick={() => setIsCreateOpen(true)}>
            <PlusIcon className="mr-2 size-4" />
            Criar primeira meta
          </Button>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2">
          {goals.map((g) => (
            <GoalCard
              key={g.id}
              g={g}
              onContribute={setContributeGoal}
              onEdit={openEdit}
              onDelete={(id) => void deleteGoal.mutateAsync(id).catch(() => toast.error('Erro ao deletar meta.'))}
            />
          ))}
        </div>
      )}
    </div>
  )
}

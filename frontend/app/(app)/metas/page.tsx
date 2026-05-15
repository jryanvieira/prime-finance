'use client'

import { useEffect, useState } from 'react'
import { PlusIcon, Trash2Icon, Target, PiggyBank } from 'lucide-react'
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
import { FieldGroup, Field, FieldLabel } from '@/components/ui/field'
import { goalsService, type Goal } from '@/lib/api'
import { formatCurrency } from '@/lib/format'

function GoalProgressBar({ percentage }: { percentage: number }) {
  const capped = Math.min(percentage, 100)
  const color =
    percentage >= 100 ? 'bg-emerald-500' : percentage >= 60 ? 'bg-blue-500' : 'bg-primary'

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

const emptyGoalForm = { name: '', target: '', deadline: '' }

export default function MetasPage() {
  const [goals, setGoals] = useState<Goal[]>([])
  const [loading, setLoading] = useState(true)

  const [isCreateOpen, setIsCreateOpen] = useState(false)
  const [createForm, setCreateForm] = useState(emptyGoalForm)
  const [saving, setSaving] = useState(false)

  const [editGoal, setEditGoal] = useState<Goal | null>(null)
  const [editForm, setEditForm] = useState(emptyGoalForm)
  const [editSaving, setEditSaving] = useState(false)

  const [contributeGoal, setContributeGoal] = useState<Goal | null>(null)
  const [contributeAmount, setContributeAmount] = useState('')
  const [contributeSaving, setContributeSaving] = useState(false)

  const [deleteGoalId, setDeleteGoalId] = useState<string | null>(null)
  const [deleting, setDeleting] = useState(false)

  useEffect(() => {
    void load()
  }, [])

  const load = async () => {
    try {
      setLoading(true)
      const data = await goalsService.list()
      setGoals(data)
    } catch {
      toast.error('Não foi possível carregar as metas.')
    } finally {
      setLoading(false)
    }
  }

  const handleCreate = async () => {
    if (!createForm.name || !createForm.target) return
    try {
      setSaving(true)
      await goalsService.create({
        name: createForm.name,
        target_amount_cents: Math.round(parseFloat(createForm.target) * 100),
        deadline: createForm.deadline || null,
      })
      setIsCreateOpen(false)
      setCreateForm(emptyGoalForm)
      await load()
    } catch {
      toast.error('Erro ao criar meta.')
    } finally {
      setSaving(false)
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
      setEditSaving(true)
      await goalsService.update(editGoal.id, {
        name: editForm.name,
        target_amount_cents: Math.round(parseFloat(editForm.target) * 100),
        deadline: editForm.deadline || null,
      })
      setEditGoal(null)
      await load()
    } catch {
      toast.error('Erro ao atualizar meta.')
    } finally {
      setEditSaving(false)
    }
  }

  const handleContribute = async () => {
    if (!contributeGoal || !contributeAmount) return
    try {
      setContributeSaving(true)
      await goalsService.contribute(contributeGoal.id, {
        amount_cents: Math.round(parseFloat(contributeAmount) * 100),
      })
      setContributeGoal(null)
      setContributeAmount('')
      await load()
    } catch {
      toast.error('Erro ao registrar contribuição.')
    } finally {
      setContributeSaving(false)
    }
  }

  const handleDelete = async () => {
    if (!deleteGoalId) return
    try {
      setDeleting(true)
      await goalsService.delete(deleteGoalId)
      setDeleteGoalId(null)
      await load()
    } catch {
      toast.error('Erro ao deletar meta.')
    } finally {
      setDeleting(false)
    }
  }

  return (
    <div className="flex flex-col gap-8">
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
              <Button onClick={() => void handleCreate()} disabled={saving}>
                {saving ? 'Salvando...' : 'Criar meta'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

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
            <Button onClick={() => void handleUpdate()} disabled={editSaving}>
              {editSaving ? 'Salvando...' : 'Salvar'}
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
            <Button onClick={() => void handleContribute()} disabled={contributeSaving}>
              {contributeSaving ? 'Salvando...' : 'Confirmar'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete confirm dialog */}
      <Dialog open={!!deleteGoalId} onOpenChange={(open) => { if (!open) setDeleteGoalId(null) }}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Deletar meta</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">Tem certeza que deseja deletar esta meta? Esta ação não pode ser desfeita.</p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteGoalId(null)}>Cancelar</Button>
            <Button variant="destructive" onClick={() => void handleDelete()} disabled={deleting}>
              {deleting ? 'Deletando...' : 'Deletar'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Goals list */}
      {loading ? (
        <p className="py-8 text-center text-sm text-muted-foreground">Carregando...</p>
      ) : goals.length === 0 ? (
        <Card>
          <CardContent>
            <div className="flex flex-col items-center gap-3 py-16 text-muted-foreground">
              <Target className="size-12 opacity-30" />
              <p className="text-sm font-medium">Nenhuma meta cadastrada ainda.</p>
              <p className="text-xs">Crie sua primeira meta financeira e comece a poupar.</p>
              <Button variant="outline" size="sm" onClick={() => setIsCreateOpen(true)}>
                <PlusIcon className="mr-2 size-4" />
                Criar primeira meta
              </Button>
            </div>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {goals.map((g) => (
            <Card key={g.id} className={g.percentage >= 100 ? 'border-emerald-500/50' : ''}>
              <CardHeader className="pb-2">
                <div className="flex items-start justify-between gap-2">
                  <CardTitle className="text-base font-semibold leading-tight">{g.name}</CardTitle>
                  {g.percentage >= 100 && (
                    <span className="shrink-0 rounded-full bg-emerald-500/10 px-2 py-0.5 text-xs font-medium text-emerald-600">
                      Concluída
                    </span>
                  )}
                </div>
                {g.deadline && (
                  <p className="text-xs text-muted-foreground">
                    Prazo:{' '}
                    {new Date(g.deadline + 'T00:00:00').toLocaleDateString('pt-BR', {
                      day: '2-digit',
                      month: 'short',
                      year: 'numeric',
                    })}
                  </p>
                )}
              </CardHeader>
              <CardContent className="flex flex-col gap-4">
                <div className="flex flex-col gap-1.5">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">
                      {formatCurrency(g.current_amount_cents)}
                    </span>
                    <span className="font-medium">{formatCurrency(g.target_amount_cents)}</span>
                  </div>
                  <GoalProgressBar percentage={g.percentage} />
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    className="flex-1 gap-1.5"
                    onClick={() => setContributeGoal(g)}
                    disabled={g.percentage >= 100}
                  >
                    <PiggyBank className="size-3.5" />
                    Contribuir
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => openEdit(g)}
                  >
                    Editar
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="size-8 shrink-0 text-muted-foreground hover:text-destructive"
                    onClick={() => setDeleteGoalId(g.id)}
                  >
                    <Trash2Icon className="size-4" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}

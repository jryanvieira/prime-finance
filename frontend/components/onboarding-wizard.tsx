'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { FieldGroup, Field, FieldLabel } from '@/components/ui/field'
import { paymentMethodsService, usersService } from '@/lib/api'

interface OnboardingWizardProps {
  onComplete: () => void
}

const STEPS = [
  { title: 'Bem-vindo ao Prime Finance', description: 'Vamos configurar sua conta em 3 passos rápidos.' },
  { title: 'Seu método de pagamento', description: 'Adicione o cartão ou conta que você usa com mais frequência.' },
  { title: 'Tudo pronto!' },
]

export function OnboardingWizard({ onComplete }: OnboardingWizardProps) {
  const [step, setStep] = useState(0)
  const [monthlyIncome, setMonthlyIncome] = useState('')
  const [pmLabel, setPmLabel] = useState('')
  const [pmType, setPmType] = useState<'card' | 'cash' | 'pix' | 'transfer'>('card')
  const [saving, setSaving] = useState(false)

  const handleNext = async () => {
    if (step === 0) {
      if (monthlyIncome) {
        localStorage.setItem('prime-finance-monthly-income', monthlyIncome)
      }
      setStep(1)
      return
    }

    if (step === 1) {
      try {
        setSaving(true)
        if (pmLabel.trim()) {
          await paymentMethodsService.create({ label: pmLabel.trim(), type: pmType })
        }
        setStep(2)
      } finally {
        setSaving(false)
      }
      return
    }

    if (step === 2) {
      try {
        setSaving(true)
        await usersService.completeOnboarding()
        onComplete()
      } finally {
        setSaving(false)
      }
    }
  }

  const handleSkip = async () => {
    if (step < 2) {
      setStep((s) => s + 1)
      return
    }
    try {
      setSaving(true)
      await usersService.completeOnboarding()
      onComplete()
    } finally {
      setSaving(false)
    }
  }

  return (
    <Dialog open>
      <DialogContent className="sm:max-w-md" onInteractOutside={(e) => e.preventDefault()}>
        <DialogHeader>
          <div className="flex gap-1.5 mb-2">
            {STEPS.map((_, i) => (
              <div
                key={i}
                className={`h-1 flex-1 rounded-full transition-colors ${i <= step ? 'bg-primary' : 'bg-muted'}`}
              />
            ))}
          </div>
          <DialogTitle>{STEPS[step].title}</DialogTitle>
          {STEPS[step].description && (
            <DialogDescription>{STEPS[step].description}</DialogDescription>
          )}
        </DialogHeader>

        <div className="py-2">
          {step === 0 && (
            <FieldGroup>
              <Field>
                <FieldLabel>Renda mensal (opcional)</FieldLabel>
                <Input
                  type="number"
                  min="0"
                  step="0.01"
                  placeholder="0,00"
                  value={monthlyIncome}
                  onChange={(e) => setMonthlyIncome(e.target.value)}
                  autoFocus
                />
              </Field>
            </FieldGroup>
          )}

          {step === 1 && (
            <FieldGroup>
              <Field>
                <FieldLabel>Tipo</FieldLabel>
                <Select value={pmType} onValueChange={(v) => setPmType(v as typeof pmType)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="card">Cartão</SelectItem>
                    <SelectItem value="pix">PIX</SelectItem>
                    <SelectItem value="cash">Dinheiro</SelectItem>
                    <SelectItem value="transfer">Transferência</SelectItem>
                  </SelectContent>
                </Select>
              </Field>
              <Field>
                <FieldLabel>Nome (ex: Nubank, Itaú)</FieldLabel>
                <Input
                  placeholder="Nome do método"
                  value={pmLabel}
                  onChange={(e) => setPmLabel(e.target.value)}
                  autoFocus
                />
              </Field>
            </FieldGroup>
          )}

          {step === 2 && (
            <div className="flex flex-col items-center gap-3 py-4 text-center">
              <span className="text-4xl">🎉</span>
              <p className="text-sm text-muted-foreground">
                Sua conta está configurada. Você pode editar tudo nas configurações depois.
              </p>
            </div>
          )}
        </div>

        <div className="flex justify-between gap-2">
          {step < 2 ? (
            <>
              <Button variant="ghost" size="sm" onClick={() => void handleSkip()}>
                Pular
              </Button>
              <Button onClick={() => void handleNext()} disabled={saving}>
                {saving ? 'Aguarde...' : 'Próximo'}
              </Button>
            </>
          ) : (
            <Button className="w-full" onClick={() => void handleNext()} disabled={saving}>
              {saving ? 'Finalizando...' : 'Começar a usar'}
            </Button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}

'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { CheckCircle2, DollarSign, CreditCard, ArrowRight, ArrowLeft } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent } from '@/components/ui/card'
import { Field, FieldLabel, FieldGroup } from '@/components/ui/field'
import { incomesService } from '@/lib/api'
import { paymentMethodsService } from '@/lib/api'
import { usersService } from '@/lib/api'

const STEPS = [
  { title: 'Bem-vindo!', icon: CheckCircle2 },
  { title: 'Sua renda', icon: DollarSign },
  { title: 'Forma de pagamento', icon: CreditCard },
]

export default function OnboardingPage() {
  const router = useRouter()
  const [step, setStep] = useState(0)
  const [saving, setSaving] = useState(false)

  const [incomeAmount, setIncomeAmount] = useState('')
  const [incomeDescription, setIncomeDescription] = useState('Salário')

  const [pmLabel, setPmLabel] = useState('')
  const [pmType, setPmType] = useState<'card' | 'cash' | 'pix' | 'transfer'>('card')

  const finish = async () => {
    try {
      setSaving(true)
      await usersService.completeOnboarding()
      router.push('/dashboard')
    } catch {
      toast.error('Erro ao concluir onboarding.')
    } finally {
      setSaving(false)
    }
  }

  const handleIncomeNext = async () => {
    if (incomeAmount && parseFloat(incomeAmount) > 0) {
      try {
        setSaving(true)
        await incomesService.create({
          date: new Date().toISOString().slice(0, 10),
          description: incomeDescription || 'Renda mensal',
          amount_cents: Math.round(parseFloat(incomeAmount) * 100),
          is_recurring: true,
        })
      } catch {
        // não bloqueia o fluxo
      } finally {
        setSaving(false)
      }
    }
    setStep(2)
  }

  const handlePMNext = async () => {
    if (pmLabel) {
      try {
        setSaving(true)
        await paymentMethodsService.create({ type: pmType, label: pmLabel })
      } catch {
        // não bloqueia o fluxo
      } finally {
        setSaving(false)
      }
    }
    await finish()
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-background p-4">
      {/* Progress */}
      <div className="flex items-center gap-2 mb-8">
        {STEPS.map((s, i) => (
          <div key={i} className="flex items-center gap-2">
            <div
              className={`flex items-center justify-center w-8 h-8 rounded-full text-xs font-medium transition-colors ${
                i <= step ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'
              }`}
            >
              {i + 1}
            </div>
            {i < STEPS.length - 1 && (
              <div className={`h-px w-8 ${i < step ? 'bg-primary' : 'bg-muted'}`} />
            )}
          </div>
        ))}
      </div>

      <Card className="w-full max-w-md">
        <CardContent className="pt-6">
          {step === 0 && (
            <div className="flex flex-col items-center gap-4 py-4 text-center">
              <CheckCircle2 className="size-16 text-primary" />
              <h1 className="text-2xl font-bold">Bem-vindo ao Prime Finance!</h1>
              <p className="text-muted-foreground">
                Vamos configurar sua conta em alguns passos rápidos para você começar a acompanhar suas finanças.
              </p>
              <Button className="mt-4 w-full" onClick={() => setStep(1)}>
                Começar <ArrowRight className="ml-2 size-4" />
              </Button>
              <Button variant="ghost" size="sm" onClick={finish} disabled={saving}>
                Pular configuração
              </Button>
            </div>
          )}

          {step === 1 && (
            <div className="flex flex-col gap-4">
              <div>
                <h2 className="text-xl font-semibold">Qual é sua renda mensal?</h2>
                <p className="text-sm text-muted-foreground mt-1">
                  Isso nos ajuda a calcular sua saúde financeira.
                </p>
              </div>
              <FieldGroup>
                <Field>
                  <FieldLabel>Descrição</FieldLabel>
                  <Input
                    value={incomeDescription}
                    onChange={(e) => setIncomeDescription(e.target.value)}
                    placeholder="Ex: Salário"
                  />
                </Field>
                <Field>
                  <FieldLabel>Valor mensal (R$)</FieldLabel>
                  <Input
                    type="number"
                    min="0"
                    step="0.01"
                    placeholder="0,00"
                    value={incomeAmount}
                    onChange={(e) => setIncomeAmount(e.target.value)}
                  />
                </Field>
              </FieldGroup>
              <div className="flex gap-2 mt-2">
                <Button variant="outline" onClick={() => setStep(0)} className="flex-1">
                  <ArrowLeft className="mr-2 size-4" /> Voltar
                </Button>
                <Button onClick={() => void handleIncomeNext()} disabled={saving} className="flex-1">
                  {saving ? 'Salvando...' : 'Próximo'} <ArrowRight className="ml-2 size-4" />
                </Button>
              </div>
              <Button variant="ghost" size="sm" className="self-center" onClick={() => setStep(2)}>
                Pular
              </Button>
            </div>
          )}

          {step === 2 && (
            <div className="flex flex-col gap-4">
              <div>
                <h2 className="text-xl font-semibold">Adicione uma forma de pagamento</h2>
                <p className="text-sm text-muted-foreground mt-1">
                  Cartão, Pix, dinheiro... Como você costuma pagar?
                </p>
              </div>
              <FieldGroup>
                <Field>
                  <FieldLabel>Nome</FieldLabel>
                  <Input
                    value={pmLabel}
                    onChange={(e) => setPmLabel(e.target.value)}
                    placeholder="Ex: Nubank, Pix, Dinheiro"
                  />
                </Field>
                <Field>
                  <FieldLabel>Tipo</FieldLabel>
                  <select
                    className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm"
                    value={pmType}
                    onChange={(e) => setPmType(e.target.value as typeof pmType)}
                  >
                    <option value="card">Cartão</option>
                    <option value="pix">Pix</option>
                    <option value="cash">Dinheiro</option>
                    <option value="transfer">Transferência</option>
                  </select>
                </Field>
              </FieldGroup>
              <div className="flex gap-2 mt-2">
                <Button variant="outline" onClick={() => setStep(1)} className="flex-1">
                  <ArrowLeft className="mr-2 size-4" /> Voltar
                </Button>
                <Button onClick={() => void handlePMNext()} disabled={saving} className="flex-1">
                  {saving ? 'Finalizando...' : 'Concluir'} <CheckCircle2 className="ml-2 size-4" />
                </Button>
              </div>
              <Button variant="ghost" size="sm" className="self-center" onClick={() => void finish()} disabled={saving}>
                Pular
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

'use client'

import { useState } from 'react'
import { cn } from '@/lib/utils'
import { Sheet, SheetContent } from '@/components/ui/sheet'
import {
  expensesService,
  incomesService,
  type PaymentMethod,
  type Category,
} from '@/lib/api'
import { useDashboardPaymentMethods, useDashboardCategories } from '@/hooks/use-dashboard'

interface AddTransactionSheetProps {
  open: boolean
  onClose: () => void
  onSuccess?: () => void
}

function getPaymentMethodColor(label: string): string {
  const n = label.toLowerCase()
  if (n.includes('pix')) return 'var(--pix)'
  if (n.includes('mercado') || n.includes('mp')) return 'var(--mp)'
  if (n.includes('inter')) return 'var(--inter)'
  if (n.includes('nubank') || n.includes('nu')) return 'var(--nu)'
  return 'var(--ink-3)'
}

export function AddTransactionSheet({
  open,
  onClose,
  onSuccess,
}: AddTransactionSheetProps) {
  const { data: paymentMethods = [] } = useDashboardPaymentMethods()
  const { data: categories = [] } = useDashboardCategories()
  const [tipo, setTipo] = useState<'despesa' | 'receita'>('despesa')
  const [valorDisplay, setValorDisplay] = useState('')
  const [amountCents, setAmountCents] = useState(0)
  const [descricao, setDescricao] = useState('')
  const [catId, setCatId] = useState('')
  const [metodoPagId, setMetodoPagId] = useState('')
  const [data, setData] = useState(new Date().toISOString().split('T')[0])
  const [recorrente, setRecorrente] = useState(false)
  const [loading, setLoading] = useState(false)

  function handleValorChange(raw: string) {
    const digits = raw.replace(/\D/g, '')
    const cents = parseInt(digits || '0', 10)
    setAmountCents(cents)
    const reais = cents / 100
    setValorDisplay(
      reais.toLocaleString('pt-BR', {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      }),
    )
  }

  async function handleSave() {
    if (amountCents === 0) return
    setLoading(true)
    try {
      if (tipo === 'despesa') {
        await expensesService.create({
          amount_cents: amountCents,
          description: descricao,
          category: catId || undefined,
          payment_method_id: metodoPagId || undefined,
          date: data,
        })
      } else {
        await incomesService.create({
          amount_cents: amountCents,
          description: descricao,
          date: data,
          is_recurring: recorrente,
        })
      }
      onClose()
      onSuccess?.()
      setValorDisplay('')
      setAmountCents(0)
      setDescricao('')
      setCatId('')
      setMetodoPagId('')
      setRecorrente(false)
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  const filteredCategories = categories.filter(
    (cat) => cat.type === tipo || cat.type === 'both',
  )

  return (
    <Sheet open={open} onOpenChange={(o) => !o && onClose()}>
      <SheetContent side="right" className="w-[480px] flex flex-col p-0">

        {/* Header */}
        <div className="px-7 py-6 border-b border-[--line]">
          <h2 className="serif text-[26px] text-[--ink]">Nova transação</h2>
          <p className="text-sm text-[--ink-2] mt-0.5">Registre uma despesa ou receita</p>
        </div>

        {/* Body scrollável */}
        <div className="flex-1 overflow-y-auto px-7 py-6 space-y-6">

          {/* 1. Seg control tipo */}
          <div className="flex rounded-[10px] bg-[--surface-2] p-1 gap-1">
            {(['despesa', 'receita'] as const).map((t) => (
              <button
                key={t}
                onClick={() => { setTipo(t); setCatId('') }}
                className={cn(
                  'flex-1 py-2 rounded-[8px] text-sm font-medium transition-all',
                  tipo === t
                    ? 'bg-[--ink] text-[--bg]'
                    : 'text-[--ink-2] hover:text-[--ink]',
                )}
              >
                {t === 'despesa' ? 'Despesa' : 'Receita'}
              </button>
            ))}
          </div>

          {/* 2. Input valor destacado */}
          <div className="border border-[--line] rounded-[14px] p-4 bg-[--surface]">
            <div className="eyebrow text-[--ink-3] mb-2">VALOR</div>
            <div className="flex items-baseline gap-1">
              <span className="text-[--ink-2] text-lg">R$</span>
              <input
                type="text"
                inputMode="numeric"
                value={valorDisplay}
                onChange={(e) => handleValorChange(e.target.value)}
                placeholder="0,00"
                className="flex-1 serif text-[32px] leading-none bg-transparent outline-none text-[--ink] placeholder:text-[--ink-3]"
              />
            </div>
          </div>

          {/* 3. Input descrição */}
          <div>
            <label className="eyebrow text-[--ink-3] mb-2 block">DESCRIÇÃO</label>
            <input
              type="text"
              value={descricao}
              onChange={(e) => setDescricao(e.target.value)}
              placeholder="Ex: Supermercado, Netflix..."
              className="w-full border border-[--line] rounded-[10px] px-4 py-3 text-sm bg-[--surface] text-[--ink] outline-none focus:border-[--accent] transition-colors"
            />
          </div>

          {/* 4. Chips de categoria */}
          {filteredCategories.length > 0 && (
            <div>
              <div className="eyebrow text-[--ink-3] mb-3">CATEGORIA</div>
              <div className="flex flex-wrap gap-2">
                {filteredCategories.map((cat) => (
                  <button
                    key={cat.id}
                    onClick={() => setCatId(cat.id === catId ? '' : cat.id)}
                    className={cn(
                      'px-3 py-1.5 rounded-full text-xs font-medium transition-all border',
                      catId === cat.id
                        ? 'bg-[--ink] text-[--bg] border-[--ink]'
                        : 'bg-[--surface] text-[--ink-2] border-[--line] hover:border-[--ink-2]',
                    )}
                  >
                    {cat.name}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* 5. Grid data + meio de pagamento */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="eyebrow text-[--ink-3] mb-2 block">DATA</label>
              <input
                type="date"
                value={data}
                onChange={(e) => setData(e.target.value)}
                className="w-full border border-[--line] rounded-[10px] px-3 py-2.5 text-sm bg-[--surface] text-[--ink] outline-none focus:border-[--accent]"
              />
            </div>
            {tipo === 'despesa' && paymentMethods.length > 0 && (
              <div>
                <div className="eyebrow text-[--ink-3] mb-2">MEIO DE PAGAMENTO</div>
                <div className="flex flex-col gap-1.5">
                  {paymentMethods.map((pm) => {
                    const color = getPaymentMethodColor(pm.label)
                    return (
                      <button
                        key={pm.id}
                        onClick={() =>
                          setMetodoPagId(pm.id === metodoPagId ? '' : pm.id)
                        }
                        className={cn(
                          'flex items-center gap-2 px-3 py-2 rounded-[8px] text-sm border transition-all',
                          metodoPagId === pm.id
                            ? 'border-[--ink] bg-[--surface-2]'
                            : 'border-[--line] bg-[--surface]',
                        )}
                      >
                        <span
                          className="w-2 h-2 rounded-full flex-shrink-0"
                          style={{ background: color }}
                        />
                        <span className="text-[--ink]">{pm.label}</span>
                      </button>
                    )
                  })}
                </div>
              </div>
            )}
          </div>

          {/* 6. Toggle recorrente */}
          <div className="border border-[--line] rounded-[14px] p-4 bg-[--surface]">
            <label className="flex items-center justify-between cursor-pointer">
              <div>
                <div className="text-sm font-medium text-[--ink]">Transação recorrente</div>
                <div className="text-xs text-[--ink-3] mt-0.5">Repete todo mês na mesma data</div>
              </div>
              <div
                onClick={() => setRecorrente((r) => !r)}
                className={cn(
                  'w-10 h-5 rounded-full transition-colors relative cursor-pointer',
                  recorrente ? 'bg-[--accent]' : 'bg-[--line]',
                )}
              >
                <span
                  className={cn(
                    'absolute top-0.5 w-4 h-4 rounded-full bg-white transition-transform',
                    recorrente ? 'translate-x-5' : 'translate-x-0.5',
                  )}
                />
              </div>
            </label>
          </div>

          {/* TODO ZEM-111: ai suggest chip */}

        </div>

        {/* Footer */}
        <div className="px-7 py-5 border-t border-[--line] flex gap-3">
          <button
            onClick={() => onClose()}
            className="flex-1 py-3 rounded-full border border-[--line] text-sm font-medium text-[--ink-2] hover:bg-[--surface-2] transition-colors"
          >
            Cancelar
          </button>
          <button
            onClick={handleSave}
            disabled={loading || amountCents === 0}
            className="flex-1 py-3 rounded-full text-sm font-medium transition-colors disabled:opacity-50"
            style={{ background: 'var(--accent)', color: 'white' }}
          >
            {loading ? 'Salvando...' : 'Salvar transação'}
          </button>
        </div>

      </SheetContent>
    </Sheet>
  )
}

'use client'

import { useMemo, useState, useRef, Suspense } from 'react'
import { useSearchParams } from 'next/navigation'
import {
  SearchIcon,
  UploadIcon,
  DownloadIcon,
  FileSpreadsheetIcon,
  CheckCircle2Icon,
  MoreHorizontalIcon,
  PencilIcon,
  Trash2Icon,
} from 'lucide-react'
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
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Field, FieldLabel } from '@/components/ui/field'
import {
  importService,
  exportService,
  incomesService,
  type ImportResult,
} from '@/lib/api'
import { formatCurrency } from '@/lib/format'
import { toast } from 'sonner'
import { useQueryClient } from '@tanstack/react-query'
import { useExpenses, useDeleteExpense } from '@/hooks/use-expenses'
import { usePaymentMethods } from '@/hooks/use-payment-methods'
import { useCategories } from '@/hooks/use-categories'
import { useQuery } from '@tanstack/react-query'

type TipoFiltro = 'todas' | 'saida' | 'entrada'

type TxItem = {
  id: string
  date: string
  title: string
  amount_cents: number
  tipo: 'saida' | 'entrada'
  category_id?: string
  category_name?: string
  payment_method_id?: string
  payment_method_name?: string
  installment?: string
  hour?: string
}

const CAT_COLORS: Record<string, string> = {
  alim: 'var(--cat-alim)',
  comp: 'var(--cat-comp)',
  tran: 'var(--cat-tran)',
  educ: 'var(--cat-educ)',
  assi: 'var(--cat-assi)',
  saud: 'var(--cat-saud)',
  lazr: 'var(--cat-lazr)',
  moradia: 'var(--cat-moradia)',
  outros: 'var(--cat-outros)',
}

const METH_COLORS: Record<string, { color: string; tint: string }> = {
  pix:   { color: 'var(--pix)',   tint: 'var(--pix-tint)' },
  mp:    { color: 'var(--mp)',    tint: 'var(--mp-tint)' },
  inter: { color: 'var(--inter)', tint: 'var(--inter-tint)' },
  nu:    { color: 'var(--nu)',    tint: 'var(--nu-tint)' },
}

function getCatColor(categoryName?: string): string {
  if (!categoryName) return 'var(--cat-outros)'
  const lower = categoryName.toLowerCase()
  for (const [key, color] of Object.entries(CAT_COLORS)) {
    if (lower.includes(key)) return color
  }
  return 'var(--cat-outros)'
}

function getMethColor(methodName?: string): { color: string; tint: string } {
  if (!methodName) return { color: 'var(--ink-3)', tint: 'var(--surface-2)' }
  const lower = methodName.toLowerCase()
  for (const [key, colors] of Object.entries(METH_COLORS)) {
    if (lower.includes(key)) return colors
  }
  return { color: 'var(--ink-3)', tint: 'var(--surface-2)' }
}

const DAY_NAMES = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb']
const MONTH_NAMES = ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho', 'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro']

function parseDateLabel(dateStr: string) {
  const [y, m, d] = dateStr.split('-').map(Number)
  const dt = new Date(y, m - 1, d)
  return {
    day: d,
    dayName: DAY_NAMES[dt.getDay()],
    month: MONTH_NAMES[m - 1],
    year: y,
  }
}

function TransacoesContent() {
  const searchParams = useSearchParams()
  const tipoFromUrl = searchParams.get('tipo') as TipoFiltro | null

  const [query, setQuery] = useState('')
  const [tipoFiltro, setTipoFiltro] = useState<TipoFiltro>(
    tipoFromUrl === 'saida' || tipoFromUrl === 'entrada' ? tipoFromUrl : 'todas'
  )
  const [catFiltro, setCatFiltro] = useState<string>('')
  const [methFiltro, setMethFiltro] = useState<string[]>([])

  const [exportLoading, setExportLoading] = useState(false)
  const [isImportOpen, setIsImportOpen] = useState(false)
  const [importFile, setImportFile] = useState<File | null>(null)
  const [importPaymentMethod, setImportPaymentMethod] = useState('')
  const [importLoading, setImportLoading] = useState(false)
  const [importResult, setImportResult] = useState<ImportResult | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const now = new Date()
  const y = now.getFullYear()
  const m = now.getMonth()
  const filters = useMemo(() => ({
    from: new Date(y, m, 1).toISOString().split('T')[0],
    to: new Date(y, m + 1, 0).toISOString().split('T')[0],
  }), [y, m])

  const expensesQuery = useExpenses(filters)
  const incomesQuery = useQuery({
    queryKey: ['incomes', filters],
    queryFn: () => incomesService.list(filters),
  })
  const paymentMethodsQuery = usePaymentMethods()
  const categoriesQuery = useCategories('expense')

  const expenses = expensesQuery.data ?? []
  const incomes = incomesQuery.data ?? []
  const paymentMethods = paymentMethodsQuery.data ?? []
  const categories = categoriesQuery.data ?? []
  const loading = expensesQuery.isPending || incomesQuery.isPending

  const deleteExpense = useDeleteExpense()
  const queryClient = useQueryClient()

  const allTx = useMemo<TxItem[]>(() => {
    const expTx: TxItem[] = expenses.map(e => ({
      id: e.id,
      date: e.date,
      title: e.description,
      amount_cents: e.amount_cents,
      tipo: 'saida',
      category_name: e.category,
      payment_method_id: e.payment_method_id,
      payment_method_name: paymentMethods.find(p => p.id === e.payment_method_id)?.label,
      installment: e.installments_count && e.installments_count > 1
        ? `${e.installment_index ?? 1}/${e.installments_count}`
        : undefined,
    }))

    const incTx: TxItem[] = incomes.map(i => ({
      id: i.id,
      date: i.date,
      title: i.description,
      amount_cents: i.amount_cents,
      tipo: 'entrada',
      category_name: i.category,
    }))

    return [...expTx, ...incTx]
  }, [expenses, incomes, paymentMethods])

  const filtered = useMemo(() => {
    return allTx
      .filter(tx => tipoFiltro === 'todas' || tx.tipo === tipoFiltro)
      .filter(tx => !query || tx.title.toLowerCase().includes(query.toLowerCase()))
      .filter(tx => !catFiltro || tx.category_name === catFiltro)
      .filter(tx => methFiltro.length === 0 || methFiltro.includes(tx.payment_method_id ?? ''))
  }, [allTx, tipoFiltro, query, catFiltro, methFiltro])

  const byDate = useMemo(() => {
    return filtered.reduce((acc, tx) => {
      if (!acc[tx.date]) acc[tx.date] = []
      acc[tx.date].push(tx)
      return acc
    }, {} as Record<string, TxItem[]>)
  }, [filtered])

  const sortedDates = Object.keys(byDate).sort((a, b) => b.localeCompare(a))

  const totalSaidas = filtered.filter(t => t.tipo === 'saida').reduce((s, t) => s + t.amount_cents, 0)
  const totalEntradas = filtered.filter(t => t.tipo === 'entrada').reduce((s, t) => s + t.amount_cents, 0)
  const totalPeriodo = tipoFiltro === 'saida' ? totalSaidas : tipoFiltro === 'entrada' ? totalEntradas : totalEntradas - totalSaidas
  const maiorGasto = filtered.filter(t => t.tipo === 'saida').reduce((max, t) => Math.max(max, t.amount_cents), 0)

  const toggleMeth = (id: string) => {
    setMethFiltro(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id])
  }

  const handleExportCSV = async () => {
    try {
      setExportLoading(true)
      await exportService.downloadCSV(filters.from, filters.to)
    } catch {
      toast.error('Não foi possível exportar o CSV.')
    } finally {
      setExportLoading(false)
    }
  }

  const handleImport = async () => {
    if (!importFile) return
    try {
      setImportLoading(true)
      const result = await importService.uploadCSV(importFile, importPaymentMethod || undefined)
      setImportResult(result)
      queryClient.invalidateQueries({ queryKey: ['expenses'] })
    } catch (err: any) {
      toast.error(err?.message || 'Não foi possível importar o arquivo.')
    } finally {
      setImportLoading(false)
    }
  }

  const resetImport = () => {
    setImportFile(null)
    setImportPaymentMethod('')
    setImportResult(null)
    setImportLoading(false)
  }

  const handleFileDrop = (e: React.DragEvent) => {
    e.preventDefault()
    const file = e.dataTransfer.files[0]
    if (file && file.name.endsWith('.csv')) setImportFile(file)
  }

  const handleDeleteExpense = async (id: string) => {
    await deleteExpense.mutateAsync(id)
  }

  const headingTitle =
    tipoFiltro === 'saida' ? 'Saídas' :
    tipoFiltro === 'entrada' ? 'Entradas' :
    'Todas as transações'

  const currentMonthLabel = `${MONTH_NAMES[m]} ${y}`

  return (
    <div className="flex flex-col gap-6 max-w-7xl mx-auto w-full pb-10">
      {/* PAGE HEADER */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className="eyebrow text-[--ink-3] text-xs uppercase tracking-widest mb-1">
            Transações · {currentMonthLabel}
          </p>
          <h1 className="serif text-3xl text-[--ink]">{headingTitle}</h1>
        </div>

        <div className="flex gap-2 flex-wrap">
          <Dialog
            open={isImportOpen}
            onOpenChange={(open) => {
              setIsImportOpen(open)
              if (!open) resetImport()
            }}
          >
            <DialogTrigger asChild>
              <Button variant="outline" size="sm" className="rounded-full">
                <UploadIcon className="mr-2 size-4" />
                Importar CSV
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-md">
              <DialogHeader>
                <DialogTitle>Importar do Nubank</DialogTitle>
                <DialogDescription>
                  Faça upload do extrato CSV exportado do app
                </DialogDescription>
              </DialogHeader>

              {importResult ? (
                <div className="flex flex-col items-center gap-4 py-6">
                  <CheckCircle2Icon className="size-12 text-emerald-500 animate-in zoom-in" />
                  <div className="text-center">
                    <p className="text-lg font-semibold">Importação concluída!</p>
                    <div className="mt-2 flex flex-col gap-1 text-sm text-muted-foreground">
                      <p>✅ {importResult.imported} gastos importados</p>
                      {importResult.updated > 0 && <p>🔄 {importResult.updated} atualizados</p>}
                      {importResult.skipped_duplicates > 0 && <p>⏩ {importResult.skipped_duplicates} duplicatas ignoradas</p>}
                      {importResult.skipped_ignored > 0 && <p>🚫 {importResult.skipped_ignored} linhas ignoradas</p>}
                    </div>
                  </div>
                  <Button onClick={() => { setIsImportOpen(false); resetImport() }}>Fechar</Button>
                </div>
              ) : (
                <>
                  <div className="flex flex-col gap-4">
                    <div
                      className="flex flex-col items-center gap-3 rounded-xl border-2 border-dashed border-muted-foreground/25 bg-muted/30 p-8 text-center transition-colors hover:border-primary/50 hover:bg-primary/5 cursor-pointer"
                      onDragOver={(e) => e.preventDefault()}
                      onDrop={handleFileDrop}
                      onClick={() => fileInputRef.current?.click()}
                    >
                      <FileSpreadsheetIcon className="size-10 text-muted-foreground/50" />
                      {importFile ? (
                        <div>
                          <p className="font-medium text-foreground">{importFile.name}</p>
                          <p className="text-xs text-muted-foreground">{(importFile.size / 1024).toFixed(1)} KB</p>
                        </div>
                      ) : (
                        <div>
                          <p className="text-sm font-medium">Arraste o arquivo CSV aqui</p>
                          <p className="text-xs text-muted-foreground">ou clique para selecionar</p>
                        </div>
                      )}
                      <input
                        ref={fileInputRef}
                        type="file"
                        accept=".csv"
                        className="hidden"
                        onChange={(e) => { const f = e.target.files?.[0]; if (f) setImportFile(f) }}
                      />
                    </div>

                    <Field>
                      <FieldLabel>Atribuir ao cartão (opcional)</FieldLabel>
                      <Select value={importPaymentMethod} onValueChange={setImportPaymentMethod}>
                        <SelectTrigger className="w-full">
                          <SelectValue placeholder="Vincular a um meio de pagamento..." />
                        </SelectTrigger>
                        <SelectContent>
                          {paymentMethods.map((pm) => (
                            <SelectItem key={pm.id} value={pm.id}>
                              <div className="flex items-center gap-2">
                                <span className="size-2 rounded-full" style={{ backgroundColor: pm.color || '#CBD5E1' }} />
                                {pm.label}
                              </div>
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </Field>
                  </div>

                  <DialogFooter>
                    <Button variant="outline" onClick={() => { setIsImportOpen(false); resetImport() }}>Cancelar</Button>
                    <Button onClick={handleImport} disabled={!importFile || importLoading}>
                      {importLoading ? 'Importando...' : 'Importar CSV'}
                    </Button>
                  </DialogFooter>
                </>
              )}
            </DialogContent>
          </Dialog>

          <Button
            variant="outline"
            size="sm"
            className="rounded-full"
            onClick={() => void handleExportCSV()}
            disabled={exportLoading}
          >
            <DownloadIcon className="mr-2 size-4" />
            {exportLoading ? 'Exportando...' : 'Exportar'}
          </Button>
        </div>
      </div>

      {/* KPI CARDS */}
      <div className="grid grid-cols-3 gap-4">
        <div className="bg-[--surface] border border-[--line] rounded-[14px] p-4 flex flex-col gap-1">
          <span className="eyebrow text-[--ink-3] text-xs uppercase tracking-widest">Total no período</span>
          <span
            className="mono-num text-2xl font-semibold"
            style={{ color: totalPeriodo >= 0 ? 'var(--ok)' : 'var(--bad)' }}
          >
            {totalPeriodo < 0 ? '-' : ''}{formatCurrency(Math.abs(totalPeriodo))}
          </span>
        </div>
        <div className="bg-[--surface] border border-[--line] rounded-[14px] p-4 flex flex-col gap-1">
          <span className="eyebrow text-[--ink-3] text-xs uppercase tracking-widest">Volume</span>
          <span className="mono-num text-2xl font-semibold text-[--ink]">{filtered.length}</span>
        </div>
        <div className="bg-[--surface] border border-[--line] rounded-[14px] p-4 flex flex-col gap-1">
          <span className="eyebrow text-[--ink-3] text-xs uppercase tracking-widest">Maior gasto</span>
          <span className="mono-num text-2xl font-semibold text-[--bad]">
            {maiorGasto > 0 ? formatCurrency(maiorGasto) : '—'}
          </span>
        </div>
      </div>

      {/* FILTER CARD */}
      <div className="bg-[--surface] border border-[--line] rounded-[14px] p-4 flex flex-col gap-3">
        <div className="flex flex-wrap items-center gap-3">
          {/* Search */}
          <div className="relative flex-1 min-w-[220px]">
            <SearchIcon className="absolute top-1/2 left-3 size-4 -translate-y-1/2 text-[--ink-3]" />
            <Input
              placeholder="Buscar transação..."
              className="pl-9 h-9 bg-[--bg] border-[--line]"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
          </div>

          {/* Seg control Tipo */}
          <div className="flex items-center rounded-lg border border-[--line] bg-[--bg] p-0.5 gap-0.5">
            {(['todas', 'saida', 'entrada'] as TipoFiltro[]).map((tipo) => (
              <button
                key={tipo}
                onClick={() => setTipoFiltro(tipo)}
                className="px-3 py-1 rounded-md text-sm font-medium transition-colors"
                style={{
                  backgroundColor: tipoFiltro === tipo ? 'var(--ink)' : 'transparent',
                  color: tipoFiltro === tipo ? 'var(--bg)' : 'var(--ink-2)',
                }}
              >
                {tipo === 'todas' ? 'Todas' : tipo === 'saida' ? 'Saídas' : 'Entradas'}
              </button>
            ))}
          </div>

          {/* Select categoria */}
          <Select value={catFiltro || 'all'} onValueChange={(v) => setCatFiltro(v === 'all' ? '' : v)}>
            <SelectTrigger className="h-9 w-40 bg-[--bg] border-[--line] text-sm">
              <SelectValue placeholder="Categoria" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todas as categorias</SelectItem>
              {categories.map((cat) => (
                <SelectItem key={cat.id} value={cat.name}>
                  <div className="flex items-center gap-2">
                    <span className="size-2 rounded-full" style={{ backgroundColor: cat.color }} />
                    {cat.name}
                  </div>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Chips de meio de pagamento */}
        {paymentMethods.length > 0 && (
          <div className="flex flex-wrap gap-2">
            {paymentMethods.map((pm) => {
              const active = methFiltro.includes(pm.id)
              const mc = getMethColor(pm.label)
              return (
                <button
                  key={pm.id}
                  onClick={() => toggleMeth(pm.id)}
                  className="flex items-center gap-1.5 px-3 py-1 rounded-full text-sm font-medium transition-colors border"
                  style={{
                    backgroundColor: active ? 'var(--ink)' : 'var(--bg)',
                    color: active ? 'var(--bg)' : 'var(--ink-2)',
                    borderColor: active ? 'var(--ink)' : 'var(--line)',
                  }}
                >
                  <span className="size-2 rounded-full" style={{ backgroundColor: mc.color }} />
                  {pm.label}
                </button>
              )
            })}
          </div>
        )}
      </div>

      {/* LISTA AGRUPADA POR DATA */}
      <div className="flex flex-col gap-6">
        {loading ? (
          <div className="flex flex-col items-center p-12 text-center">
            <div className="size-8 rounded-full border-4 border-[--accent] border-t-transparent animate-spin mb-4" />
            <p className="text-[--ink-3]">Carregando transações...</p>
          </div>
        ) : sortedDates.length === 0 ? (
          <p className="serif-i text-[20px] text-center text-[--ink-3] mt-16">nada por aqui</p>
        ) : (
          sortedDates.map((date) => {
            const txs = byDate[date]
            const { day, dayName, month: monthName } = parseDateLabel(date)
            const dayEntradas = txs.filter(t => t.tipo === 'entrada').reduce((s, t) => s + t.amount_cents, 0)
            const daySaidas = txs.filter(t => t.tipo === 'saida').reduce((s, t) => s + t.amount_cents, 0)

            return (
              <div key={date} className="flex flex-col gap-2">
                {/* DAY HEADER */}
                <div className="flex items-end justify-between px-1">
                  <div className="flex items-baseline gap-2">
                    <span className="serif text-[28px] leading-none text-[--ink]">{day}</span>
                    <span className="eyebrow text-[--ink-3] text-xs uppercase tracking-widest">{dayName} · {monthName}</span>
                  </div>
                  <div className="flex items-center gap-3 text-sm">
                    {dayEntradas > 0 && (
                      <span className="mono-num font-medium" style={{ color: 'var(--ok)' }}>
                        +{formatCurrency(dayEntradas)}
                      </span>
                    )}
                    {daySaidas > 0 && (
                      <span className="mono-num font-medium text-[--ink]">
                        -{formatCurrency(daySaidas)}
                      </span>
                    )}
                  </div>
                </div>

                {/* TRANSACTION ROWS */}
                <div className="flex flex-col divide-y divide-[--line] bg-[--surface] border border-[--line] rounded-[14px] overflow-hidden">
                  {txs.map((tx) => {
                    const catColor = getCatColor(tx.category_name)
                    const methColors = getMethColor(tx.payment_method_name)

                    return (
                      <div key={tx.id} className="group flex items-center justify-between p-4 gap-4 hover:bg-[--surface-2] transition-colors">
                        <div className="flex items-center gap-3 min-w-0">
                          {/* dot categoria */}
                          <span
                            className="size-2 shrink-0 rounded-full"
                            style={{ backgroundColor: catColor }}
                          />

                          <div className="flex flex-col gap-0.5 min-w-0">
                            <div className="flex items-center gap-2">
                              <span className="text-[--ink] font-medium text-sm truncate">{tx.title}</span>
                              {tx.installment && (
                                <span className="text-[10px] font-medium px-1.5 py-0.5 rounded bg-[--surface-2] text-[--ink-3] shrink-0">
                                  {tx.installment}
                                </span>
                              )}
                            </div>

                            <div className="flex items-center gap-1.5 text-xs text-[--ink-3]">
                              {tx.payment_method_name && (
                                <>
                                  <span
                                    className="size-1.5 rounded-full shrink-0"
                                    style={{ backgroundColor: methColors.color }}
                                  />
                                  <span className="mono-num">{tx.payment_method_name}</span>
                                  <span className="text-[--line]">·</span>
                                </>
                              )}
                              {tx.category_name && (
                                <span>{tx.category_name}</span>
                              )}
                            </div>
                          </div>
                        </div>

                        <div className="flex items-center gap-2 shrink-0">
                          <span
                            className="mono-num font-semibold text-base"
                            style={{ color: tx.tipo === 'entrada' ? 'var(--ok)' : 'var(--bad)' }}
                          >
                            {tx.tipo === 'entrada' ? '+' : '-'}{formatCurrency(tx.amount_cents)}
                          </span>

                          {tx.tipo === 'saida' && (
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="size-7 opacity-0 group-hover:opacity-100 transition-opacity text-[--ink-3]"
                                >
                                  <MoreHorizontalIcon className="size-4" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end">
                                <DropdownMenuItem
                                  className="text-destructive focus:text-destructive"
                                  onClick={() => void handleDeleteExpense(tx.id)}
                                >
                                  <Trash2Icon className="mr-2 size-4" />
                                  Deletar
                                </DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          )}
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>
            )
          })
        )}
      </div>
    </div>
  )
}

export default function TransacoesPage() {
  return (
    <Suspense>
      <TransacoesContent />
    </Suspense>
  )
}

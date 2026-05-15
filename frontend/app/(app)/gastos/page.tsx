'use client'

import { useEffect, useMemo, useState, useRef } from 'react'
import {
  PlusIcon,
  SearchIcon,
  FilterIcon,
  PencilIcon,
  Trash2Icon,
  CreditCardIcon,
  BanknoteIcon,
  UploadIcon,
  DownloadIcon,
  FileSpreadsheetIcon,
  CheckCircle2Icon,
  TrendingDown,
  Receipt,
  SmartphoneIcon,
  ArrowRightLeftIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  CalendarIcon,
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
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
  SheetFooter,
} from '@/components/ui/sheet'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import { FieldGroup, Field, FieldLabel } from '@/components/ui/field'
import { ScrollArea } from '@/components/ui/scroll-area'
import {
  expensesService,
  paymentMethodsService,
  categoriesService,
  importService,
  exportService,
  type Expense,
  type PaymentMethod,
  type Category,
  type ImportResult,
} from '@/lib/api'
import { formatCurrency, formatDate } from '@/lib/format'
import { StatsCard } from '@/components/stats-card'
import { toast } from 'sonner'

export default function GastosPage() {
  const [expenses, setExpenses] = useState<Expense[]>([])
  const [paymentMethods, setPaymentMethods] = useState<PaymentMethod[]>([])
  const [categories, setCategories] = useState<Category[]>([])
  const [loading, setLoading] = useState(true)
  
  // Filters
  const [searchQuery, setSearchQuery] = useState('')
  const [categoryFilter, setCategoryFilter] = useState<string>('all')
  const [paymentMethodFilter, setPaymentMethodFilter] = useState<string>('all')
  const [typeFilter, setTypeFilter] = useState<'all' | 'single' | 'installment'>('all')

  const [currentMonth, setCurrentMonth] = useState<Date>(new Date())
  const [viewMode, setViewMode] = useState<'monthly' | 'all'>('monthly')

  const [isCreateOpen, setIsCreateOpen] = useState(false)
  const [editingExpense, setEditingExpense] = useState<Expense | null>(null)

  const [exportLoading, setExportLoading] = useState(false)

  // Import state
  const [isImportOpen, setIsImportOpen] = useState(false)
  const [importFile, setImportFile] = useState<File | null>(null)
  const [importPaymentMethod, setImportPaymentMethod] = useState('')
  const [importLoading, setImportLoading] = useState(false)
  const [importResult, setImportResult] = useState<ImportResult | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  // Form state
  const [formData, setFormData] = useState({
    description: '',
    amount: '',
    date: new Date().toISOString().split('T')[0],
    category: '',
    payment_method_id: '',
    installments: '1',
  })

  useEffect(() => {
    void loadStaticData()
  }, [])

  useEffect(() => {
    void loadExpenses()
  }, [currentMonth, viewMode])

  const loadStaticData = async () => {
    const [pmData, catData] = await Promise.all([
      paymentMethodsService.list(),
      categoriesService.list('expense'),
    ])
    setPaymentMethods(pmData)
    setCategories(catData)
  }

  const loadExpenses = async () => {
    try {
      setLoading(true)
      let from = '2000-01-01'
      let to = '2100-12-31'
      
      if (viewMode === 'monthly') {
        const y = currentMonth.getFullYear()
        const m = currentMonth.getMonth()
        from = new Date(y, m, 1).toISOString().split('T')[0]
        to = new Date(y, m + 1, 0).toISOString().split('T')[0]
      }

      const expData = await expensesService.list({ from, to })
      setExpenses(expData)
    } finally {
      setLoading(false)
    }
  }

  const handleExportCSV = async () => {
    try {
      setExportLoading(true)
      const y = currentMonth.getFullYear()
      const m = currentMonth.getMonth()
      const from = new Date(y, m, 1).toISOString().split('T')[0]
      const to = new Date(y, m + 1, 0).toISOString().split('T')[0]
      await exportService.downloadCSV(from, to)
    } catch {
      toast.error('Não foi possível exportar o CSV. Tente novamente.')
    } finally {
      setExportLoading(false)
    }
  }

  const formatMonthYear = (date: Date) => {
    return date.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' })
  }

  const handlePrevMonth = () => setCurrentMonth(prev => new Date(prev.getFullYear(), prev.getMonth() - 1, 1))
  const handleNextMonth = () => setCurrentMonth(prev => new Date(prev.getFullYear(), prev.getMonth() + 1, 1))

  const filteredExpenses = useMemo(() => {
    return expenses.filter((expense) => {
      const matchesSearch = expense.description
        .toLowerCase()
        .includes(searchQuery.toLowerCase())
      const matchesCategory = categoryFilter === 'all' || (expense.category || 'Sem categoria') === categoryFilter
      const matchesPM = paymentMethodFilter === 'all' || expense.payment_method_id === paymentMethodFilter
      
      let matchesType = true
      if (typeFilter === 'installment') matchesType = (expense.installments_count || 1) > 1
      if (typeFilter === 'single') matchesType = (expense.installments_count || 1) === 1

      return matchesSearch && matchesCategory && matchesPM && matchesType
    })
  }, [expenses, searchQuery, categoryFilter, paymentMethodFilter, typeFilter])

  const totalFiltered = useMemo(() => filteredExpenses.reduce((sum, exp) => sum + exp.amount_cents, 0), [filteredExpenses])
  
  const biggestExpense = useMemo(() => {
    if (filteredExpenses.length === 0) return 0
    return Math.max(...filteredExpenses.map(e => e.amount_cents))
  }, [filteredExpenses])

  const handleCreateOrUpdate = async () => {
    const amountCents = Math.round(parseFloat(formData.amount) * 100)
    const installments = parseInt(formData.installments) || 1

    if (editingExpense) {
      await expensesService.update(editingExpense.id, {
        description: formData.description,
        amount_cents: amountCents,
        date: formData.date,
        category: formData.category || undefined,
        payment_method_id: formData.payment_method_id || undefined,
      })
    } else {
      await expensesService.create({
        description: formData.description,
        date: formData.date,
        category: formData.category || undefined,
        payment_method_id: formData.payment_method_id || undefined,
        ...(installments > 1
          ? { installments_count: installments, monthly_amount_cents: amountCents }
          : { amount_cents: amountCents }),
      })
    }

    await loadExpenses()
    resetForm()
    setIsCreateOpen(false)
    setEditingExpense(null)
  }

  const handleEdit = (expense: Expense) => {
    setEditingExpense(expense)
    setFormData({
      description: expense.description,
      amount: (expense.amount_cents / 100).toFixed(2),
      date: expense.date,
      category: expense.category || '',
      payment_method_id: expense.payment_method_id || '',
      installments: expense.installments_count?.toString() || '1',
    })
    setIsCreateOpen(true)
  }

  const handleDelete = async (id: string) => {
    await expensesService.delete(id)
    await loadExpenses()
  }

  const resetForm = () => {
    setFormData({
      description: '',
      amount: '',
      date: new Date().toISOString().split('T')[0],
      category: '',
      payment_method_id: '',
      installments: '1',
    })
    setEditingExpense(null)
  }

  const handleImport = async () => {
    if (!importFile) return
    try {
      setImportLoading(true)
      const result = await importService.uploadCSV(
        importFile,
        importPaymentMethod || undefined
      )
      setImportResult(result)
      await loadExpenses()
    } catch (err: any) {
      toast.error(err?.message || 'Não foi possível importar o arquivo. Verifique o formato e tente novamente.')
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
    if (file && file.name.endsWith('.csv')) {
      setImportFile(file)
    }
  }

  const getPaymentIcon = (type: string, className = "size-4") => {
    switch (type) {
      case 'card':
        return <CreditCardIcon className={className} />
      case 'cash':
        return <BanknoteIcon className={className} />
      case 'pix':
        return <SmartphoneIcon className={className} />
      case 'transfer':
        return <ArrowRightLeftIcon className={className} />
      default:
        return <CreditCardIcon className={className} />
    }
  }

  // Agrupamento por data
  const groupedExpenses = useMemo(() => {
    const groups: Record<string, Expense[]> = {}
    filteredExpenses.forEach(exp => {
      if (!groups[exp.date]) groups[exp.date] = []
      groups[exp.date].push(exp)
    })
    return groups
  }, [filteredExpenses])

  const sortedDates = Object.keys(groupedExpenses).sort((a, b) => b.localeCompare(a))

  return (
    <div className="flex flex-col gap-6 max-w-7xl mx-auto w-full pb-10">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-semibold tracking-tight">Comando de Gastos</h1>
          <p className="text-muted-foreground text-sm mt-1">
            Gestão inteligente e acompanhamento em tempo real
          </p>
        </div>

        <div className="flex gap-2">
          {viewMode === 'monthly' && (
            <Button
              variant="outline"
              className="shadow-sm"
              onClick={() => void handleExportCSV()}
              disabled={exportLoading}
            >
              <DownloadIcon className="mr-2 size-4" />
              {exportLoading ? 'Exportando...' : 'Exportar CSV'}
            </Button>
          )}
          {/* Import CSV Dialog */}
          <Dialog
            open={isImportOpen}
            onOpenChange={(open) => {
              setIsImportOpen(open)
              if (!open) resetImport()
            }}
          >
            <DialogTrigger asChild>
              <Button variant="outline" className="shadow-sm">
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
                      {importResult.updated > 0 && (
                        <p>🔄 {importResult.updated} gastos atualizados</p>
                      )}
                      {importResult.skipped_duplicates > 0 && (
                        <p>⏩ {importResult.skipped_duplicates} duplicatas ignoradas</p>
                      )}
                      {importResult.skipped_ignored > 0 && (
                        <p>🚫 {importResult.skipped_ignored} linhas ignoradas</p>
                      )}
                    </div>
                  </div>
                  <Button onClick={() => { setIsImportOpen(false); resetImport() }}>
                    Fechar
                  </Button>
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
                          <p className="text-xs text-muted-foreground">
                            {(importFile.size / 1024).toFixed(1)} KB
                          </p>
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
                        onChange={(e) => {
                          const file = e.target.files?.[0]
                          if (file) setImportFile(file)
                        }}
                      />
                    </div>

                    <Field>
                      <FieldLabel>Atribuir ao cartão (opcional)</FieldLabel>
                      <Select
                        value={importPaymentMethod}
                        onValueChange={setImportPaymentMethod}
                      >
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
                    <Button
                      variant="outline"
                      onClick={() => { setIsImportOpen(false); resetImport() }}
                    >
                      Cancelar
                    </Button>
                    <Button
                      onClick={handleImport}
                      disabled={!importFile || importLoading}
                    >
                      {importLoading ? 'Importando...' : 'Importar CSV'}
                    </Button>
                  </DialogFooter>
                </>
              )}
            </DialogContent>
          </Dialog>

          {/* Create/Edit Expense Sheet */}
          <Sheet
            open={isCreateOpen}
            onOpenChange={(open) => {
              setIsCreateOpen(open)
              if (!open) resetForm()
            }}
          >
            <SheetTrigger asChild>
              <Button className="shadow-md hover:shadow-lg transition-shadow">
                <PlusIcon className="mr-2 size-4" />
                Novo Gasto
              </Button>
            </SheetTrigger>
            <SheetContent className="flex flex-col w-full sm:max-w-md overflow-hidden">
              <SheetHeader>
                <SheetTitle>
                  {editingExpense ? 'Editar gasto' : 'Adicionar novo gasto'}
                </SheetTitle>
                <SheetDescription>
                  {editingExpense
                    ? 'Atualize os detalhes desta transação.'
                    : 'Preencha os detalhes para registrar uma nova despesa.'}
                </SheetDescription>
              </SheetHeader>

              <ScrollArea className="flex-1 -mx-6 px-6">
                <FieldGroup className="gap-5 py-4">
                  <Field>
                    <FieldLabel>Descrição do Gasto</FieldLabel>
                    <Input
                      placeholder="Ex: Supermercado, Uber, Fatura..."
                      value={formData.description}
                      onChange={(e) =>
                        setFormData({ ...formData, description: e.target.value })
                      }
                      className="h-11"
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
                        className="h-11 text-lg font-medium"
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
                        className="h-11"
                        onChange={(e) =>
                          setFormData({ ...formData, date: e.target.value })
                        }
                      />
                    </Field>
                  </div>

                  <Field>
                    <FieldLabel>Categoria da Despesa</FieldLabel>
                    <Select
                      value={formData.category}
                      onValueChange={(value) =>
                        setFormData({ ...formData, category: value })
                      }
                    >
                      <SelectTrigger className="w-full h-11">
                        <SelectValue placeholder="Selecione..." />
                      </SelectTrigger>
                      <SelectContent>
                        {categories.map((cat) => (
                          <SelectItem key={cat.id} value={cat.name}>
                            <div className="flex items-center gap-2">
                              <span
                                className="size-2.5 rounded-full shadow-sm"
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
                    <FieldLabel>Método de Pagamento</FieldLabel>
                    <Select
                      value={formData.payment_method_id}
                      onValueChange={(value) =>
                        setFormData({ ...formData, payment_method_id: value })
                      }
                    >
                      <SelectTrigger className="w-full h-11">
                        <SelectValue placeholder="Como você pagou?" />
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

                  {!editingExpense && (
                    <Field>
                      <FieldLabel>Parcelamento</FieldLabel>
                      <Select
                        value={formData.installments}
                        onValueChange={(value) =>
                          setFormData({ ...formData, installments: value })
                        }
                      >
                        <SelectTrigger className="w-full h-11">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 24].map((n) => (
                            <SelectItem key={n} value={n.toString()}>
                              {n === 1 ? '💸 Pagamento Único' : `💳 Dividir em ${n}x`}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </Field>
                  )}
                </FieldGroup>
              </ScrollArea>

              <SheetFooter className="mt-4 border-t pt-4">
                <Button
                  variant="outline"
                  onClick={() => {
                    setIsCreateOpen(false)
                    resetForm()
                  }}
                  className="w-full sm:w-auto"
                >
                  Cancelar
                </Button>
                <Button
                  onClick={handleCreateOrUpdate}
                  className="w-full sm:w-auto"
                  disabled={
                    !formData.description ||
                    !formData.amount ||
                    !formData.category ||
                    !formData.payment_method_id
                  }
                >
                  {editingExpense ? 'Gravar Alterações' : 'Confirmar Gasto'}
                </Button>
              </SheetFooter>
            </SheetContent>
          </Sheet>
        </div>
      </div>

      {/* Resumo Superior Analítico */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-2">
        <div className="flex items-center gap-2 bg-card/60 backdrop-blur-md border border-border/60 rounded-lg p-1 shadow-sm w-fit">
          <Button 
            variant="ghost" 
            size="sm"
            className={viewMode === 'monthly' ? 'bg-primary/10 text-primary hover:bg-primary/20 hover:text-primary' : 'text-muted-foreground hover:text-foreground'}
            onClick={() => setViewMode('monthly')}
          >
            Mensal
          </Button>
          <Button 
            variant="ghost" 
            size="sm"
            className={viewMode === 'all' ? 'bg-primary/10 text-primary hover:bg-primary/20 hover:text-primary' : 'text-muted-foreground hover:text-foreground'}
            onClick={() => setViewMode('all')}
          >
            Visualização Geral
          </Button>
        </div>

        {viewMode === 'monthly' && (
          <div className="flex items-center gap-2 bg-card/60 backdrop-blur-md border border-border/60 rounded-lg p-1 shadow-sm w-fit">
            <Button variant="ghost" size="icon" onClick={handlePrevMonth} className="size-8">
              <ChevronLeftIcon className="size-4 text-muted-foreground" />
            </Button>
            <div className="flex items-center gap-2 min-w-[140px] justify-center font-medium capitalize text-sm">
              <CalendarIcon className="size-4 text-muted-foreground/70" />
              {formatMonthYear(currentMonth)}
            </div>
            <Button variant="ghost" size="icon" onClick={handleNextMonth} className="size-8">
              <ChevronRightIcon className="size-4 text-muted-foreground" />
            </Button>
          </div>
        )}
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <StatsCard
          title="Total Projetado"
          value={formatCurrency(totalFiltered)}
          description="Soma com base nos filtros atuais"
          icon={TrendingDown}
          className="border-none bg-card/60 backdrop-blur-md shadow-sm"
        />
        <StatsCard
          title="Volume de Transações"
          value={String(filteredExpenses.length)}
          description="Lançamentos no período"
          icon={Receipt}
          className="border-none bg-card/60 backdrop-blur-md shadow-sm hidden sm:flex"
        />
        <StatsCard
          title="Maior Gasto"
          value={formatCurrency(biggestExpense)}
          description="Valor mais alto desta seleção"
          icon={CreditCardIcon}
          className="border-none bg-card/60 backdrop-blur-md shadow-sm hidden lg:flex"
        />
      </div>

      {/* Advanced Action Toolbar */}
      <Card className="border-none bg-card/60 backdrop-blur-md shadow-sm flex flex-col sm:flex-row gap-4 p-4 items-start sm:items-center justify-between">
        <div className="flex flex-wrap items-center gap-2">
          <Button 
            variant={paymentMethodFilter === 'all' ? 'default' : 'secondary'} 
            size="sm" 
            className="rounded-full px-4 transition-all"
            onClick={() => setPaymentMethodFilter('all')}
          >
            Todos os meios
          </Button>
          {paymentMethods.map(pm => (
            <Button
              key={pm.id}
              variant={paymentMethodFilter === pm.id ? 'default' : 'secondary'}
              size="sm"
              className="rounded-full px-4 transition-all gap-2"
              onClick={() => setPaymentMethodFilter(pm.id)}
            >
              <span className="size-2 rounded-full" style={{ backgroundColor: pm.color || '#CBD5E1' }} />
              {pm.label}
            </Button>
          ))}
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto">
          <div className="relative flex-1 sm:w-48">
            <SearchIcon className="text-muted-foreground absolute top-1/2 left-3 size-4 -translate-y-1/2" />
            <Input
              placeholder="Buscar..."
              className="pl-9 h-9 bg-background/50 border-none shadow-sm"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>

          <Select value={categoryFilter} onValueChange={setCategoryFilter}>
            <SelectTrigger className="w-10 sm:w-40 h-9 bg-background/50 border-none shadow-sm data-[state=open]:bg-accent">
              <FilterIcon className="size-4 sm:mr-2" />
              <span className="hidden sm:inline"><SelectValue /></span>
            </SelectTrigger>
            <SelectContent align="end">
              <SelectItem value="all">Ver Todas</SelectItem>
              {categories.map((cat) => (
                <SelectItem key={cat.id} value={cat.name}>
                  <div className="flex items-center gap-2">
                    <span
                      className="size-2 rounded-full"
                      style={{ backgroundColor: cat.color }}
                    />
                    {cat.name}
                  </div>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select value={typeFilter} onValueChange={(val: any) => setTypeFilter(val)}>
            <SelectTrigger className="w-10 sm:w-36 h-9 bg-background/50 border-none shadow-sm">
              <span className="hidden sm:inline"><SelectValue /></span>
              <span className="sm:hidden">⚡</span>
            </SelectTrigger>
            <SelectContent align="end">
              <SelectItem value="all">Qualquer tipo</SelectItem>
              <SelectItem value="single">À vista</SelectItem>
              <SelectItem value="installment">Parcelados</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </Card>

      {/* Lista Agrupada por Data */}
      <div className="flex flex-col gap-6 mt-2">
        {loading ? (
          <div className="flex flex-col divide-y bg-card rounded-xl shadow-sm border border-border p-8 items-center text-center">
            <div className="size-8 rounded-full border-4 border-primary border-t-transparent animate-spin mb-4" />
            <p className="text-muted-foreground">Carregando transações...</p>
          </div>
        ) : sortedDates.length === 0 ? (
          <div className="flex flex-col items-center justify-center p-12 bg-card/60 backdrop-blur-md rounded-xl border border-dashed border-border/60">
            <div className="size-16 rounded-2xl bg-muted/50 flex items-center justify-center mb-4 text-muted-foreground/50">
              <Receipt className="size-8" />
            </div>
            <h3 className="text-lg font-medium">Nenhum gasto encontrado</h3>
            <p className="text-muted-foreground text-sm mt-1 mb-6 text-center max-w-sm">
              Tente alterar os filtros ou adicione uma nova despesa para visualizar nesta seção.
            </p>
            <Button onClick={() => setIsCreateOpen(true)} variant="secondary">Adicionar Gasto</Button>
          </div>
        ) : (
          sortedDates.map((date) => (
            <div key={date} className="flex flex-col gap-3 animate-in fade-in slide-in-from-bottom-4 duration-500 fill-mode-both" style={{ animationDelay: '100ms' }}>
              <h3 className="text-sm font-semibold tracking-wide text-muted-foreground ml-1 flex items-center gap-2">
                <span className="bg-muted px-2 py-1 rounded-md text-foreground/80">{formatDate(date)}</span>
              </h3>
              
              <div className="flex flex-col divide-y divide-border/40 bg-card/80 backdrop-blur-md shadow-sm border border-border rounded-xl overflow-hidden transition-all duration-300 hover:shadow-md">
                {groupedExpenses[date].map((expense) => {
                  const paymentMethod = paymentMethods.find((p) => p.id === expense.payment_method_id)
                  const category = categories.find((c) => c.name === expense.category)
                  
                  return (
                    <div key={expense.id} className="group flex flex-col sm:flex-row sm:items-center justify-between p-4 bg-transparent hover:bg-accent/30 transition-colors gap-4">
                      
                      <div className="flex items-center gap-4">
                        <div 
                          className="flex size-12 shrink-0 items-center justify-center rounded-xl transition-transform group-hover:scale-105 shadow-sm"
                          style={{ backgroundColor: category ? `${category.color}25` : 'var(--muted)' }}
                        >
                          <Receipt className="size-5" style={{ color: category ? category.color : 'inherit' }} />
                        </div>
                        
                        <div className="flex flex-col gap-1">
                          <span className="font-semibold text-foreground tracking-tight text-[15px]">
                            {expense.description}
                          </span>
                          <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs">
                            <Badge 
                              variant="secondary" 
                              className="font-normal px-2 py-0 border-transparent bg-background text-muted-foreground shadow-xs"
                            >
                              {expense.category || 'Sem categoria'}
                            </Badge>
                            
                            {paymentMethod && (
                              <div className="flex items-center gap-1 text-muted-foreground font-medium">
                                <span className="size-1.5 rounded-full" style={{ backgroundColor: paymentMethod.color || '#CBD5E1' }} />
                                {paymentMethod.label}
                              </div>
                            )}

                            {expense.installments_count && expense.installments_count > 1 && (
                              <>
                                <span className="text-muted-foreground/30">•</span>
                                <span className="text-muted-foreground">
                                  {expense.installment_index || 1}/{expense.installments_count}x
                                </span>
                              </>
                            )}
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center justify-between sm:justify-end gap-6 sm:w-auto w-full mt-2 sm:mt-0 pl-16 sm:pl-0">
                        <span className="font-semibold text-foreground/90 text-right text-lg tracking-tight whitespace-nowrap">
                          {formatCurrency(expense.amount_cents)}
                        </span>
                        
                        <div className="flex items-center gap-1 opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity">
                          <Button
                            variant="ghost"
                            size="icon"
                            className="size-8 text-muted-foreground hover:text-primary hover:bg-primary/10"
                            onClick={() => handleEdit(expense)}
                          >
                            <PencilIcon className="size-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="size-8 text-muted-foreground hover:text-destructive hover:bg-destructive/10"
                            onClick={() => handleDelete(expense.id)}
                          >
                            <Trash2Icon className="size-4" />
                          </Button>
                        </div>
                      </div>
                      
                    </div>
                  )
                })}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  )
}

// Tipos
export interface User {
  id: string
  email: string
  name: string
}

export interface PaymentMethod {
  id: string
  type: 'card' | 'cash' | 'pix' | 'transfer'
  label: string
  color: string
}

export interface Expense {
  id: string
  date: string
  description: string
  amount_cents: number
  category: string
  payment_method_id: string
  installments?: number
  current_installment?: number
}

export interface RecurringExpense {
  id: string
  description: string
  amount_cents: number
  day_of_month: number
  payment_method_id: string
  category: string
  active: boolean
}

export interface Category {
  id: string
  name: string
  color: string
}

// Dados mockados
export const mockUser: User = {
  id: '1',
  email: 'joao@email.com',
  name: 'João Silva',
}

export const mockCategories: Category[] = [
  { id: '1', name: 'Alimentação', color: 'oklch(0.55 0.15 150)' },
  { id: '2', name: 'Transporte', color: 'oklch(0.60 0.12 200)' },
  { id: '3', name: 'Moradia', color: 'oklch(0.50 0.10 250)' },
  { id: '4', name: 'Lazer', color: 'oklch(0.65 0.15 80)' },
  { id: '5', name: 'Saúde', color: 'oklch(0.55 0.18 30)' },
  { id: '6', name: 'Educação', color: 'oklch(0.58 0.14 280)' },
  { id: '7', name: 'Assinaturas', color: 'oklch(0.52 0.16 320)' },
]

export const mockPaymentMethods: PaymentMethod[] = [
  { id: '1', type: 'card', label: 'Nubank', color: '#820ad1' },
  { id: '2', type: 'card', label: 'Inter', color: '#ff7a00' },
  { id: '3', type: 'cash', label: 'Dinheiro', color: '#22c55e' },
  { id: '4', type: 'pix', label: 'Pix', color: '#32bcad' },
]

export const mockExpenses: Expense[] = [
  {
    id: '1',
    date: '2026-03-25',
    description: 'Supermercado Extra',
    amount_cents: 28750,
    category: 'Alimentação',
    payment_method_id: '1',
  },
  {
    id: '2',
    date: '2026-03-24',
    description: 'Uber para o trabalho',
    amount_cents: 2340,
    category: 'Transporte',
    payment_method_id: '4',
  },
  {
    id: '3',
    date: '2026-03-23',
    description: 'Restaurante com amigos',
    amount_cents: 8900,
    category: 'Lazer',
    payment_method_id: '2',
  },
  {
    id: '4',
    date: '2026-03-22',
    description: 'Farmácia',
    amount_cents: 4520,
    category: 'Saúde',
    payment_method_id: '1',
  },
  {
    id: '5',
    date: '2026-03-21',
    description: 'Curso de inglês',
    amount_cents: 29900,
    category: 'Educação',
    payment_method_id: '1',
    installments: 12,
    current_installment: 3,
  },
  {
    id: '6',
    date: '2026-03-20',
    description: 'Gasolina',
    amount_cents: 15000,
    category: 'Transporte',
    payment_method_id: '2',
  },
  {
    id: '7',
    date: '2026-03-19',
    description: 'iFood',
    amount_cents: 5680,
    category: 'Alimentação',
    payment_method_id: '1',
  },
  {
    id: '8',
    date: '2026-03-18',
    description: 'Cinema',
    amount_cents: 4500,
    category: 'Lazer',
    payment_method_id: '3',
  },
]

export const mockRecurringExpenses: RecurringExpense[] = [
  {
    id: '1',
    description: 'Netflix',
    amount_cents: 5590,
    day_of_month: 15,
    payment_method_id: '1',
    category: 'Assinaturas',
    active: true,
  },
  {
    id: '2',
    description: 'Spotify',
    amount_cents: 2190,
    day_of_month: 10,
    payment_method_id: '1',
    category: 'Assinaturas',
    active: true,
  },
  {
    id: '3',
    description: 'Academia',
    amount_cents: 9900,
    day_of_month: 5,
    payment_method_id: '2',
    category: 'Saúde',
    active: true,
  },
  {
    id: '4',
    description: 'Internet',
    amount_cents: 11990,
    day_of_month: 20,
    payment_method_id: '4',
    category: 'Moradia',
    active: true,
  },
  {
    id: '5',
    description: 'Aluguel',
    amount_cents: 150000,
    day_of_month: 1,
    payment_method_id: '4',
    category: 'Moradia',
    active: true,
  },
]

// Dados para gráficos
export const mockMonthlyData = [
  { month: 'Out', total: 285000 },
  { month: 'Nov', total: 312000 },
  { month: 'Dez', total: 425000 },
  { month: 'Jan', total: 298000 },
  { month: 'Fev', total: 276000 },
  { month: 'Mar', total: 189590 },
]

export const mockCategoryData = [
  { category: 'Moradia', total: 161990, percentage: 45 },
  { category: 'Alimentação', total: 34430, percentage: 18 },
  { category: 'Transporte', total: 17340, percentage: 9 },
  { category: 'Lazer', total: 13400, percentage: 7 },
  { category: 'Assinaturas', total: 7780, percentage: 4 },
  { category: 'Outros', total: 32650, percentage: 17 },
]

export function getPaymentMethod(id: string): PaymentMethod | undefined {
  return mockPaymentMethods.find((pm) => pm.id === id)
}

export function getCategoryColor(categoryName: string): string {
  const category = mockCategories.find((c) => c.name === categoryName)
  return category?.color || 'oklch(0.5 0 0)'
}

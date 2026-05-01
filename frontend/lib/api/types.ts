export interface User {
  id: string
  email: string
  name?: string
}

export interface LoginRequest {
  email: string
  password: string
}

export interface RegisterRequest {
  name?: string
  email: string
  password: string
}

export interface AuthTokens {
  access_token: string
  refresh_token: string
}

export interface LoginResponse extends AuthTokens {
  user: User
}

export interface RegisterResponse extends AuthTokens {
  user: User
}

export interface PaymentMethod {
  id: string
  type: 'card' | 'cash' | 'pix' | 'transfer'
  label: string
  color?: string
  created_at?: string
  updated_at?: string
}

export interface CreatePaymentMethodRequest {
  type: PaymentMethod['type']
  label: string
  color?: string
}

export interface UpdatePaymentMethodRequest {
  type: PaymentMethod['type']
  label: string
  color?: string
}

export interface Expense {
  id: string
  description: string
  amount_cents: number
  date: string
  category?: string
  payment_method_id?: string
  installment_group_id?: string
  installments_count?: number
  installment_index?: number
  monthly_amount_cents?: number
  total_amount_cents?: number
  created_at?: string
  updated_at?: string
}

export interface CreateExpenseRequest {
  description: string
  date: string
  payment_method_id?: string
  category?: string
  amount_cents?: number
  installments_count?: number
  monthly_amount_cents?: number
  total_amount_cents?: number
}

export interface UpdateExpenseRequest {
  description: string
  date: string
  payment_method_id?: string
  category?: string
  amount_cents: number
}

export interface ExpenseFilters {
  from?: string
  to?: string
  search?: string
}

export interface RecurringExpense {
  id: string
  description: string
  amount_cents: number
  day_of_month: number
  start_month: string
  category?: string
  payment_method_id?: string
  created_at?: string
  updated_at?: string
}

export interface CreateRecurringExpenseRequest {
  description: string
  amount_cents: number
  day_of_month: number
  start_month: string
  payment_method_id?: string
}

export interface UpdateRecurringExpenseRequest extends CreateRecurringExpenseRequest {}

export interface DashboardSummary {
  total_month: number
  total_fixed: number
  total_variable: number
  comparison_last_month: number
}

export interface MonthlyReport {
  month: string
  total: number
  by_category: CategoryTotal[]
  by_payment_method: PaymentMethodTotal[]
}

export interface CategoryTotal {
  category_name: string
  total: number
  percentage: number
}

export interface PaymentMethodTotal {
  payment_method_label: string
  total: number
  percentage: number
}

export type MonthExpenseSource = 'expense' | 'recurring'

export interface MonthExpenseItem extends Expense {
  source: MonthExpenseSource
  recurring_id?: string
}

export interface MonthExpensesResponse {
  month: string
  from: string
  to: string
  items: MonthExpenseItem[]
  incomes: Income[]
  total_expenses: number
  total_incomes: number
  balance: number
}

// Categories
export interface Category {
  id: string
  name: string
  color: string
  icon?: string
  type: 'expense' | 'income' | 'both'
  is_custom: boolean
}

export interface CreateCategoryRequest {
  name: string
  color: string
  icon?: string
  type: 'expense' | 'income' | 'both'
}

// Incomes
export interface Income {
  id: string
  date: string
  description: string
  amount_cents: number
  category?: string
  is_recurring: boolean
  created_at?: string
  updated_at?: string
}

export interface CreateIncomeRequest {
  date: string
  description: string
  amount_cents: number
  category?: string
  is_recurring?: boolean
}

export interface UpdateIncomeRequest {
  date: string
  description: string
  amount_cents: number
  category?: string
  is_recurring?: boolean
}

// Import
export interface ImportCSVResponse {
  imported: number
  updated: number
  skipped_duplicates: number
  skipped_ignored: number
  items: Expense[]
}

// Projections
export interface FutureMonthProjection {
  month: string
  total_fixed: number
  total_installments: number
  expected_income: number
  committed_percentage: number
  items: MonthExpenseItem[]
}

export interface FinishingInstallment {
  id: string
  description: string
  amount_cents: number
  month: string
  installment_index: number
  installments_count: number
}

export interface ProjectionsSummary {
  months: FutureMonthProjection[]
  finishing_installments: FinishingInstallment[]
  average_commitment: number
}

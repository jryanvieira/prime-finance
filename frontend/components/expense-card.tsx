import { formatCurrency, formatDate } from '@/lib/format'
import { cn } from '@/lib/utils'

interface ExpenseCardProps {
  date: string
  description: string
  amount_cents: number
  category: string
  payment_method_name?: string
  installments?: number
  current_installment?: number
}

export function ExpenseCard({
  date,
  description,
  amount_cents,
  category,
  payment_method_name,
  installments,
  current_installment,
}: ExpenseCardProps) {
  return (
    <div className="flex items-center justify-between gap-4 rounded-lg border border-border bg-card p-4">
      <div className="flex items-center gap-4">
        <div className="flex flex-col">
          <span className="text-xs text-muted-foreground">{formatDate(date)}</span>
        </div>
        <div className="flex flex-col gap-0.5">
          <span className="font-medium text-foreground">{description}</span>
          <div className="flex items-center gap-2">
            <span className="text-xs text-muted-foreground">{category}</span>
            {payment_method_name && (
              <>
                <span className="text-xs text-muted-foreground">•</span>
                <span className="text-xs text-muted-foreground">
                  {payment_method_name}
                </span>
              </>
            )}
            {installments && current_installment && (
              <>
                <span className="text-xs text-muted-foreground">•</span>
                <span className="text-xs text-muted-foreground">
                  {current_installment}/{installments}x
                </span>
              </>
            )}
          </div>
        </div>
      </div>
      <span className={cn('font-semibold tabular-nums', 'text-foreground')}>
        {formatCurrency(amount_cents)}
      </span>
    </div>
  )
}

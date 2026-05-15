package pdf

type ExpenseRow struct {
	Date        string
	Description string
	Category    string
	AmountCents int64
}

type CategorySummaryItem struct {
	Category         string
	TotalCents       int64
	TransactionCount int
}

type SummaryData struct {
	Month               string
	TotalExpensesCents  int64
	TotalIncomeCents    int64
	TotalRecurringCents int64
	BalanceCents        int64
	CategorySummary     []CategorySummaryItem
}

type Generator interface {
	Generate(data *SummaryData, expenses []ExpenseRow) ([]byte, error)
}

package cashflow

import (
	"context"

	domainExpense "dash-fin/internal/domain/expense"
	"dash-fin/internal/infrastructure/pdf"
)

type ExportPDFRequest struct {
	UserID string
	Month  string // "YYYY-MM"
}

type ExportPDFUseCase struct {
	summaryUC   *MonthlySummaryUseCase
	expenseRepo domainExpense.Repository
	generator   pdf.Generator
}

func NewExportPDFUseCase(
	summaryUC *MonthlySummaryUseCase,
	expenseRepo domainExpense.Repository,
	generator pdf.Generator,
) *ExportPDFUseCase {
	return &ExportPDFUseCase{
		summaryUC:   summaryUC,
		expenseRepo: expenseRepo,
		generator:   generator,
	}
}

func (uc *ExportPDFUseCase) Execute(ctx context.Context, req ExportPDFRequest) ([]byte, error) {
	summary, err := uc.summaryUC.Execute(ctx, MonthlySummaryRequest{
		UserID: req.UserID,
		Month:  req.Month,
	})
	if err != nil {
		return nil, err
	}

	from := req.Month + "-01"
	to := req.Month + "-31"

	expenses, err := uc.expenseRepo.ListByDateRange(ctx, req.UserID, from, to)
	if err != nil {
		return nil, err
	}

	rows := make([]pdf.ExpenseRow, 0, len(expenses))
	for _, e := range expenses {
		cat := ""
		if e.Category != nil {
			cat = *e.Category
		}
		rows = append(rows, pdf.ExpenseRow{
			Date:        e.Date,
			Description: e.Description,
			Category:    cat,
			AmountCents: e.AmountCents,
		})
	}

	catSummary := make([]pdf.CategorySummaryItem, 0, len(summary.CategorySummary))
	for _, cs := range summary.CategorySummary {
		catSummary = append(catSummary, pdf.CategorySummaryItem{
			Category:         cs.Category,
			TotalCents:       cs.TotalCents,
			TransactionCount: cs.TransactionCount,
		})
	}

	data := &pdf.SummaryData{
		Month:               summary.Month,
		TotalExpensesCents:  summary.TotalExpensesCents,
		TotalIncomeCents:    summary.TotalIncomeCents,
		TotalRecurringCents: summary.TotalRecurringCents,
		BalanceCents:        summary.BalanceCents,
		CategorySummary:     catSummary,
	}

	return uc.generator.Generate(data, rows)
}

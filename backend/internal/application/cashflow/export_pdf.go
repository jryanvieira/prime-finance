package cashflow

import (
	"context"
	"fmt"
	"time"

	domainExpense "dash-fin/internal/domain/expense"
	pkgpdf "dash-fin/pkg/pdf"
)

type ExportPDFRequest struct {
	UserID string
	Month  string // "YYYY-MM"
}

type ExportPDFUseCase struct {
	summaryUC   *MonthlySummaryUseCase
	expenseRepo domainExpense.Repository
	generator   pkgpdf.Generator
}

func NewExportPDFUseCase(
	summaryUC *MonthlySummaryUseCase,
	expenseRepo domainExpense.Repository,
	generator pkgpdf.Generator,
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

	t, err := time.Parse("2006-01", req.Month)
	if err != nil {
		return nil, ErrInvalidMonth
	}
	lastDay := time.Date(t.Year(), t.Month()+1, 0, 0, 0, 0, 0, time.UTC).Day()
	from := req.Month + "-01"
	to := fmt.Sprintf("%s-%02d", req.Month, lastDay)

	expenses, err := uc.expenseRepo.ListByDateRange(ctx, req.UserID, from, to)
	if err != nil {
		return nil, err
	}

	rows := make([]pkgpdf.ExpenseRow, 0, len(expenses))
	for _, e := range expenses {
		cat := ""
		if e.Category != nil {
			cat = *e.Category
		}
		rows = append(rows, pkgpdf.ExpenseRow{
			Date:        e.Date,
			Description: e.Description,
			Category:    cat,
			AmountCents: e.AmountCents,
		})
	}

	catSummary := make([]pkgpdf.CategorySummaryItem, 0, len(summary.CategorySummary))
	for _, cs := range summary.CategorySummary {
		catSummary = append(catSummary, pkgpdf.CategorySummaryItem{
			Category:         cs.Category,
			TotalCents:       cs.TotalCents,
			TransactionCount: cs.TransactionCount,
		})
	}

	data := &pkgpdf.SummaryData{
		Month:               summary.Month,
		TotalExpensesCents:  summary.TotalExpensesCents,
		TotalIncomeCents:    summary.TotalIncomeCents,
		TotalRecurringCents: summary.TotalRecurringCents,
		BalanceCents:        summary.BalanceCents,
		CategorySummary:     catSummary,
	}

	return uc.generator.Generate(data, rows)
}

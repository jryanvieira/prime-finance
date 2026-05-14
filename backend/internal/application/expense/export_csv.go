package expense

import (
	"bytes"
	"context"
	"encoding/csv"
	"fmt"

	domainExpense "dash-fin/internal/domain/expense"
	"dash-fin/internal/domain/shared"
)

type ExportCSVRequest struct {
	UserID string
	From   string
	To     string
}

type ExportCSVUseCase struct {
	repo domainExpense.Repository
}

func NewExportCSVUseCase(repo domainExpense.Repository) *ExportCSVUseCase {
	return &ExportCSVUseCase{repo: repo}
}

func (uc *ExportCSVUseCase) Execute(ctx context.Context, req ExportCSVRequest) ([]byte, error) {
	if _, err := shared.ParseDate(req.From); err != nil {
		return nil, domainExpense.ErrInvalidDate
	}
	if _, err := shared.ParseDate(req.To); err != nil {
		return nil, domainExpense.ErrInvalidDate
	}

	items, err := uc.repo.ListByDateRange(ctx, req.UserID, req.From, req.To)
	if err != nil {
		return nil, err
	}

	var buf bytes.Buffer
	w := csv.NewWriter(&buf)

	_ = w.Write([]string{"Data", "Descrição", "Categoria", "Valor (R$)", "Parcela"})

	for _, e := range items {
		category := ""
		if e.Category != nil {
			category = *e.Category
		}

		amount := fmt.Sprintf("%.2f", float64(e.AmountCents)/100)

		installment := ""
		if e.InstallmentsCount != nil && e.InstallmentIndex != nil {
			installment = fmt.Sprintf("%d/%d", *e.InstallmentIndex, *e.InstallmentsCount)
		}

		_ = w.Write([]string{e.Date, e.Description, category, amount, installment})
	}

	w.Flush()
	return buf.Bytes(), w.Error()
}

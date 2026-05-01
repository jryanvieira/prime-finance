package expense

import (
	"bytes"
	"context"
	"fmt"
	"strings"

	domainExpense "dash-fin/internal/domain/expense"
	"dash-fin/internal/domain/shared"

	"github.com/google/uuid"
)

type ImportCSVRequest struct {
	UserID          string
	PaymentMethodID *string
	FileData        []byte
}

type ImportCSVResponse struct {
	Imported          int               `json:"imported"`
	Updated           int               `json:"updated"`
	SkippedDuplicates int               `json:"skipped_duplicates"`
	SkippedIgnored    int               `json:"skipped_ignored"`
	Items             []ExpenseResponse `json:"items"`
}

type ImportCSVUseCase struct {
	repo domainExpense.Repository
}

func NewImportCSVUseCase(repo domainExpense.Repository) *ImportCSVUseCase {
	return &ImportCSVUseCase{repo: repo}
}

func (uc *ImportCSVUseCase) Execute(ctx context.Context, req ImportCSVRequest) (*ImportCSVResponse, error) {
	rows, err := shared.ParseNubankCSV(bytes.NewReader(req.FileData))
	if err != nil {
		return nil, fmt.Errorf("parse_error: %w", err)
	}

	validRows := shared.FilterIgnoredRows(rows)

	if len(validRows) == 0 {
		return &ImportCSVResponse{
			Imported:          0,
			Updated:           0,
			SkippedDuplicates: 0,
			SkippedIgnored:    len(rows) - len(validRows),
			Items:             []ExpenseResponse{},
		}, nil
	}

	// Find date range and expand for installment lookup (e.g., +/- 24 months)
	minCSVDate, maxCSVDate := validRows[0].Date, validRows[0].Date
	for _, row := range validRows {
		if row.Date < minCSVDate {
			minCSVDate = row.Date
		}
		if row.Date > maxCSVDate {
			maxCSVDate = row.Date
		}
	}

	// Expand range to find existing installments that might be outside the CSV month
	lookupStart, _ := shared.ParseDate(minCSVDate)
	lookupEnd, _ := shared.ParseDate(maxCSVDate)
	searchFrom := shared.MustFormatDate(shared.AddMonthsKeepingDay(lookupStart, -24))
	searchTo := shared.MustFormatDate(shared.AddMonthsKeepingDay(lookupEnd, 24))

	existing, err := uc.repo.ListByDateRange(ctx, req.UserID, searchFrom, searchTo)
	if err != nil {
		return nil, err
	}

	var created []ExpenseResponse
	skippedDups := 0
	updatedCount := 0

	installmentGroups := make(map[string]string)
	matchedExisting := make(map[string]bool) // Track claimed DB items by their ID

	// Helper to find a match for a row. Returns (Expense, isExactMatch)
	findMatch := func(targetDate string, targetDesc string, targetAmount int64, targetIdx int) (*domainExpense.Expense, bool) {
		tDate, _ := shared.ParseDate(targetDate)
		targetDescLower := strings.ToLower(targetDesc)

		var bestPartial *domainExpense.Expense

		for _, e := range existing {
			if matchedExisting[e.ID] {
				continue // already claimed
			}
			idx := 0
			if e.InstallmentIndex != nil {
				idx = *e.InstallmentIndex
			}
			if idx != targetIdx || e.AmountCents != targetAmount {
				continue
			}

			eDate, _ := shared.ParseDate(e.Date)
			descLower := strings.ToLower(e.Description)

			// Exact match (Date, Amount, Description, Index)
			if e.Date == targetDate && descLower == targetDescLower {
				matchedExisting[e.ID] = true
				return e, true
			}

			// Partial match candidate: same Amount, same Index, date within 3 days
			if shared.DaysBetween(eDate, tDate) <= 3 {
				// We can just pick the first partial match we find
				bestPartial = e
			}
		}

		if bestPartial != nil {
			matchedExisting[bestPartial.ID] = true
			return bestPartial, false
		}
		return nil, false
	}

	for _, row := range validRows {
		if row.InstallmentsCount > 0 {
			// 1. Calculate base date
			rowDate, _ := shared.ParseDate(row.Date)
			baseDate := shared.AddMonthsKeepingDay(rowDate, -(row.InstallmentIndex - 1))

			// 2. Group ID
			groupLookupKey := fmt.Sprintf("%s|%d|%d", strings.ToLower(row.Description), row.InstallmentsCount, row.AmountCents)
			groupID, exists := installmentGroups[groupLookupKey]
			if !exists {
				for _, e := range existing {
					if strings.ToLower(e.Description) == strings.ToLower(row.Description) &&
						e.InstallmentsCount != nil && *e.InstallmentsCount == row.InstallmentsCount &&
						e.AmountCents == row.AmountCents && e.InstallmentGroupID != nil {
						groupID = *e.InstallmentGroupID
						break
					}
				}
				if groupID == "" {
					groupID = uuid.NewString()
				}
				installmentGroups[groupLookupKey] = groupID
			}

			monthlyAmount := row.AmountCents
			totalAmount := row.AmountCents * int64(row.InstallmentsCount)

			// 3. Ensure every installment in series 1..N exists
			for i := 1; i <= row.InstallmentsCount; i++ {
				dateI := shared.MustFormatDate(shared.AddMonthsKeepingDay(baseDate, i-1))
				
				matchedExp, isExact := findMatch(dateI, row.Description, row.AmountCents, i)
				if matchedExp != nil {
					if isExact {
						if i == row.InstallmentIndex {
							skippedDups++
						}
					} else {
						// Update the partial match with new official data from CSV
						matchedExp.Date = dateI
						matchedExp.Description = row.Description
						if err := uc.repo.Update(ctx, matchedExp); err == nil {
							if i == row.InstallmentIndex {
								updatedCount++
							}
						}
					}
					continue
				}

				exp, err := domainExpense.NewInstallmentExpense(
					req.UserID, req.PaymentMethodID,
					dateI, row.Description,
					row.AmountCents, nil,
					groupID, row.InstallmentsCount, i,
					monthlyAmount, totalAmount,
				)
				if err != nil {
					continue
				}

				if err := uc.repo.Create(ctx, exp); err != nil {
					continue
				}

				created = append(created, toExpenseResponse(exp))
				// Add to existing list so we can match it in case CSV has duplicates of the same row
				existing = append(existing, exp)
				matchedExisting[exp.ID] = true
			}
		} else {
			// Single expense
			matchedExp, isExact := findMatch(row.Date, row.Description, row.AmountCents, 0)
			if matchedExp != nil {
				if isExact {
					skippedDups++
				} else {
					matchedExp.Date = row.Date
					matchedExp.Description = row.Description
					if err := uc.repo.Update(ctx, matchedExp); err == nil {
						updatedCount++
					}
				}
				continue
			}

			exp, err := domainExpense.NewExpense(
				req.UserID, req.PaymentMethodID,
				row.Date, row.Description,
				row.AmountCents, nil,
			)
			if err != nil {
				continue
			}

			if err := uc.repo.Create(ctx, exp); err != nil {
				continue
			}

			created = append(created, toExpenseResponse(exp))
			existing = append(existing, exp)
			matchedExisting[exp.ID] = true
		}
	}

	return &ImportCSVResponse{
		Imported:          len(created),
		Updated:           updatedCount,
		SkippedDuplicates: skippedDups,
		SkippedIgnored:    len(rows) - len(validRows),
		Items:             created,
	}, nil
}


package alert

import (
	"context"
	"strings"
	"time"

	"dash-fin/internal/domain/expense"
	"dash-fin/internal/domain/recurringexpense"
	"dash-fin/pkg/timeutil"
)

type AlertResponse struct {
	RecurringExpenseID string `json:"recurring_expense_id"`
	Description        string `json:"description"`
	AmountCents        int64  `json:"amount_cents"`
	DueDay             int    `json:"due_day"`
	DaysUntilDue       int    `json:"days_until_due"`
	Status             string `json:"status"`
}

type ListAlertsResponse struct {
	Alerts []AlertResponse `json:"alerts"`
}

type ListAlertsUseCase struct {
	recurringRepo recurringexpense.Repository
	expenseRepo   expense.Repository
	clock         timeutil.Clock
}

func NewListAlertsUseCase(rr recurringexpense.Repository, er expense.Repository, c timeutil.Clock) *ListAlertsUseCase {
	return &ListAlertsUseCase{
		recurringRepo: rr,
		expenseRepo:   er,
		clock:         c,
	}
}

func (uc *ListAlertsUseCase) Execute(ctx context.Context, userID string) (*ListAlertsResponse, error) {
	today := uc.clock.Now().UTC()
	y, m, _ := today.Date()

	from := time.Date(y, m, 1, 0, 0, 0, 0, time.UTC).Format("2006-01-02")
	lastDay := time.Date(y, m+1, 0, 0, 0, 0, 0, time.UTC).Day()
	to := time.Date(y, m, lastDay, 0, 0, 0, 0, time.UTC).Format("2006-01-02")

	recurrings, err := uc.recurringRepo.List(ctx, userID)
	if err != nil {
		return nil, err
	}

	expenses, err := uc.expenseRepo.ListByDateRange(ctx, userID, from, to)
	if err != nil {
		return nil, err
	}

	alerts := []AlertResponse{}

	for _, re := range recurrings {
		dueDay := re.DayOfMonth
		if dueDay > lastDay {
			dueDay = lastDay
		}

		daysUntilDue := dueDay - today.Day()

		if daysUntilDue >= 0 && daysUntilDue <= 7 {
			alerts = append(alerts, AlertResponse{
				RecurringExpenseID: re.ID,
				Description:        re.Description,
				AmountCents:        re.AmountCents,
				DueDay:             dueDay,
				DaysUntilDue:       daysUntilDue,
				Status:             "upcoming",
			})
		} else if daysUntilDue < 0 {
			alreadyLaunched := false
			nameLower := strings.ToLower(re.Description)
			for _, e := range expenses {
				if strings.Contains(strings.ToLower(e.Description), nameLower) {
					alreadyLaunched = true
					break
				}
			}
			if !alreadyLaunched {
				alerts = append(alerts, AlertResponse{
					RecurringExpenseID: re.ID,
					Description:        re.Description,
					AmountCents:        re.AmountCents,
					DueDay:             dueDay,
					DaysUntilDue:       daysUntilDue,
					Status:             "overdue",
				})
			}
		}
	}

	return &ListAlertsResponse{Alerts: alerts}, nil
}

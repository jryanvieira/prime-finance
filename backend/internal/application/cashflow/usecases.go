package cashflow

import (
	"context"
	"sort"
	"time"

	domainExpense "dash-fin/internal/domain/expense"
	domainIncome "dash-fin/internal/domain/income"
	domainRE "dash-fin/internal/domain/recurringexpense"
	"dash-fin/internal/domain/shared"
)

type DayEntry struct {
	Date                  string `json:"date"`
	IncomeCents           int64  `json:"income_cents"`
	ExpenseCents          int64  `json:"expense_cents"`
	NetCents              int64  `json:"net_cents"`
	CumulativeBalanceCents int64 `json:"cumulative_balance_cents"`
}

type CashflowResponse struct {
	Month             string     `json:"month"`
	Days              []DayEntry `json:"days"`
	TotalIncomeCents  int64      `json:"total_income_cents"`
	TotalExpenseCents int64      `json:"total_expense_cents"`
	NetBalanceCents   int64      `json:"net_balance_cents"`
}

type CashflowUseCase struct {
	expenseRepo domainExpense.Repository
	incomeRepo  domainIncome.Repository
	reRepo      domainRE.Repository
}

func NewCashflowUseCase(
	expenseRepo domainExpense.Repository,
	incomeRepo domainIncome.Repository,
	reRepo domainRE.Repository,
) *CashflowUseCase {
	return &CashflowUseCase{expenseRepo: expenseRepo, incomeRepo: incomeRepo, reRepo: reRepo}
}

func (uc *CashflowUseCase) Execute(ctx context.Context, userID, monthStr string) (*CashflowResponse, error) {
	month, err := shared.ParseMonth(monthStr)
	if err != nil {
		return nil, err
	}

	from, to := shared.StartEndOfMonth(month)

	expenses, err := uc.expenseRepo.ListByDateRange(ctx, userID, from, to)
	if err != nil {
		return nil, err
	}

	incomes, err := uc.incomeRepo.ListByDateRange(ctx, userID, from, to)
	if err != nil {
		return nil, err
	}

	recurringList, err := uc.reRepo.List(ctx, userID)
	if err != nil {
		return nil, err
	}

	// Build day maps
	incomeByDay := map[string]int64{}
	expenseByDay := map[string]int64{}

	for _, e := range expenses {
		expenseByDay[e.Date] += e.AmountCents
	}

	for _, inc := range incomes {
		incomeByDay[inc.Date] += inc.AmountCents
	}

	for _, re := range recurringList {
		start, err := shared.ParseMonth(re.StartMonth)
		if err != nil || start.After(month) {
			continue
		}
		d, err := shared.DateForMonthDay(month, re.DayOfMonth)
		if err != nil {
			continue
		}
		date := shared.MustFormatDate(d)
		expenseByDay[date] += re.AmountCents
	}

	// Enumerate all days in the month
	y, m, _ := month.Date()
	firstDay := time.Date(y, m, 1, 0, 0, 0, 0, time.UTC)
	lastDay := time.Date(y, m+1, 0, 0, 0, 0, 0, time.UTC)

	allDates := map[string]bool{}
	for d := firstDay; !d.After(lastDay); d = d.AddDate(0, 0, 1) {
		allDates[shared.MustFormatDate(d)] = true
	}
	for k := range incomeByDay {
		allDates[k] = true
	}
	for k := range expenseByDay {
		allDates[k] = true
	}

	dates := make([]string, 0, len(allDates))
	for d := range allDates {
		dates = append(dates, d)
	}
	sort.Strings(dates)

	var cumulative int64
	var totalIncome, totalExpense int64
	days := make([]DayEntry, 0, len(dates))

	for _, date := range dates {
		inc := incomeByDay[date]
		exp := expenseByDay[date]
		net := inc - exp
		cumulative += net
		totalIncome += inc
		totalExpense += exp
		days = append(days, DayEntry{
			Date:                  date,
			IncomeCents:           inc,
			ExpenseCents:          exp,
			NetCents:              net,
			CumulativeBalanceCents: cumulative,
		})
	}

	return &CashflowResponse{
		Month:             monthStr,
		Days:              days,
		TotalIncomeCents:  totalIncome,
		TotalExpenseCents: totalExpense,
		NetBalanceCents:   totalIncome - totalExpense,
	}, nil
}

package alert

import (
	"context"
	"fmt"
	"sort"
	"strings"
	"time"

	"dash-fin/internal/domain/expense"
	"dash-fin/internal/domain/user"
	pkgmailer "dash-fin/pkg/mailer"
	"dash-fin/pkg/timeutil"
)

type SendWeeklySummaryUseCase struct {
	userRepo    user.Repository
	expenseRepo expense.Repository
	mailer      pkgmailer.Mailer
	clock       timeutil.Clock
}

func NewSendWeeklySummaryUseCase(
	userRepo user.Repository,
	expenseRepo expense.Repository,
	mailer pkgmailer.Mailer,
	clock timeutil.Clock,
) *SendWeeklySummaryUseCase {
	return &SendWeeklySummaryUseCase{
		userRepo:    userRepo,
		expenseRepo: expenseRepo,
		mailer:      mailer,
		clock:       clock,
	}
}

func (uc *SendWeeklySummaryUseCase) Execute(ctx context.Context) error {
	today := uc.clock.Now()
	// Previous week: Monday to Sunday
	weekday := int(today.Weekday())
	if weekday == 0 {
		weekday = 7 // Sunday = 7
	}
	prevMonday := today.AddDate(0, 0, -(weekday - 1) - 7)
	prevSunday := prevMonday.AddDate(0, 0, 6)
	from := prevMonday.Format(time.DateOnly)
	to := prevSunday.Format(time.DateOnly)

	users, err := uc.userRepo.ListAll(ctx)
	if err != nil {
		return fmt.Errorf("send weekly summary: list users: %w", err)
	}

	for _, u := range users {
		expenses, err := uc.expenseRepo.ListByDateRange(ctx, u.ID, from, to)
		if err != nil {
			continue
		}

		var total int64
		catTotals := map[string]int64{}
		for _, e := range expenses {
			total += e.AmountCents
			cat := "Sem categoria"
			if e.Category != nil {
				cat = *e.Category
			}
			catTotals[cat] += e.AmountCents
		}

		top3 := top3Categories(catTotals)

		subject := fmt.Sprintf("Resumo semanal: %s a %s", from, to)
		html := buildWeeklySummaryHTML(u.Name, from, to, total, top3)

		_ = uc.mailer.Send(ctx, u.Email.String(), subject, html)
	}
	return nil
}

type catTotal struct {
	Name  string
	Total int64
}

func top3Categories(m map[string]int64) []catTotal {
	var list []catTotal
	for k, v := range m {
		list = append(list, catTotal{k, v})
	}
	sort.Slice(list, func(i, j int) bool { return list[i].Total > list[j].Total })
	if len(list) > 3 {
		list = list[:3]
	}
	return list
}

func buildWeeklySummaryHTML(name, from, to string, total int64, top []catTotal) string {
	var sb strings.Builder
	fmt.Fprintf(&sb, "<p>Olá, %s!</p>", name)
	fmt.Fprintf(&sb, "<p>Resumo da semana de <strong>%s</strong> a <strong>%s</strong>:</p>", from, to)
	fmt.Fprintf(&sb, "<p>Total gasto: <strong>R$ %.2f</strong></p>", float64(total)/100)
	if len(top) > 0 {
		sb.WriteString("<p>Top categorias:</p><ul>")
		for _, c := range top {
			fmt.Fprintf(&sb, "<li>%s: R$ %.2f</li>", c.Name, float64(c.Total)/100)
		}
		sb.WriteString("</ul>")
	}
	return sb.String()
}

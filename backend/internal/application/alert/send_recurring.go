package alert

import (
	"context"
	"fmt"
	"time"

	"dash-fin/internal/domain/recurringexpense"
	"dash-fin/internal/domain/user"
	pkgmailer "dash-fin/pkg/mailer"
	"dash-fin/pkg/timeutil"
)

type SendRecurringAlertsUseCase struct {
	recurringRepo recurringexpense.Repository
	userRepo      user.Repository
	mailer        pkgmailer.Mailer
	clock         timeutil.Clock
}

func NewSendRecurringAlertsUseCase(
	recurringRepo recurringexpense.Repository,
	userRepo user.Repository,
	mailer pkgmailer.Mailer,
	clock timeutil.Clock,
) *SendRecurringAlertsUseCase {
	return &SendRecurringAlertsUseCase{
		recurringRepo: recurringRepo,
		userRepo:      userRepo,
		mailer:        mailer,
		clock:         clock,
	}
}

func (uc *SendRecurringAlertsUseCase) Execute(ctx context.Context) error {
	today := uc.clock.Now()
	targetDay := today.Day() + 3

	all, err := uc.recurringRepo.ListAll(ctx)
	if err != nil {
		return fmt.Errorf("send recurring alerts: list all: %w", err)
	}

	for _, re := range all {
		dueDay := re.DayOfMonth
		// Adjust for months with fewer days
		lastDay := lastDayOfMonth(today.Year(), today.Month())
		if dueDay > lastDay {
			dueDay = lastDay
		}
		if dueDay != targetDay {
			continue
		}

		u, err := uc.userRepo.GetByID(ctx, re.UserID)
		if err != nil {
			continue
		}

		amount := fmt.Sprintf("R$ %d,%02d", re.AmountCents/100, re.AmountCents%100)
		subject := fmt.Sprintf("Lembrete: %s vence em 3 dias", re.Description)
		html := fmt.Sprintf(
			"<p>Olá, %s!</p><p>A despesa <strong>%s</strong> (%s) vence no dia <strong>%d</strong>.</p>",
			u.Name, re.Description, amount, re.DayOfMonth,
		)

		if sendErr := uc.mailer.Send(ctx, u.Email.String(), subject, html); sendErr != nil {
			continue
		}
	}
	return nil
}

func lastDayOfMonth(year int, month time.Month) int {
	return time.Date(year, month+1, 0, 0, 0, 0, 0, time.UTC).Day()
}

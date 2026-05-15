package goal

import (
	"time"

	"github.com/google/uuid"
)

type GoalProgress struct {
	MonthlyRequiredCents *int64
	MonthsRemaining      *int
	OnTrack              *bool
}

func (g *Goal) CalculateProgress(now time.Time) GoalProgress {
	if g.Deadline == nil {
		return GoalProgress{}
	}

	deadline, err := time.Parse("2006-01-02", *g.Deadline)
	if err != nil {
		return GoalProgress{}
	}

	if g.CurrentAmountCents >= g.TargetAmountCents {
		zero := int64(0)
		zeroM := 0
		t := true
		return GoalProgress{
			MonthlyRequiredCents: &zero,
			MonthsRemaining:      &zeroM,
			OnTrack:              &t,
		}
	}

	months := monthsBetween(now, deadline)
	if months < 1 {
		months = 1
	}

	remaining := g.TargetAmountCents - g.CurrentAmountCents
	monthly := remaining / int64(months)

	elapsed := monthsBetween(g.CreatedAt, now)
	if elapsed < 1 {
		elapsed = 1
	}
	avgMonthly := g.CurrentAmountCents / int64(elapsed)
	onTrack := avgMonthly >= monthly

	return GoalProgress{
		MonthlyRequiredCents: &monthly,
		MonthsRemaining:      &months,
		OnTrack:              &onTrack,
	}
}

// monthsBetween retorna a diferença em meses inteiros de from até to,
// arredondada para cima se houver dias/horas restantes. Retorna 0 se to < from.
func monthsBetween(from, to time.Time) int {
	if to.Before(from) {
		return 0
	}
	years := to.Year() - from.Year()
	months := int(to.Month()) - int(from.Month())
	total := years*12 + months
	if to.Day() > from.Day() || (to.Day() == from.Day() && (to.Hour() > from.Hour() || to.Minute() > from.Minute())) {
		total++
	}
	if total < 0 {
		return 0
	}
	return total
}

type Goal struct {
	ID                 string
	UserID             string
	Name               string
	TargetAmountCents  int64
	CurrentAmountCents int64
	Deadline           *string // YYYY-MM-DD, nullable
	CreatedAt          time.Time
	UpdatedAt          time.Time
}

func (g *Goal) ProgressPct() float64 {
	if g.TargetAmountCents == 0 {
		return 0
	}
	pct := float64(g.CurrentAmountCents) / float64(g.TargetAmountCents) * 100
	if pct > 100 {
		return 100
	}
	return pct
}

func NewGoal(userID, name string, targetAmountCents int64, deadline *string) (*Goal, error) {
	if name == "" {
		return nil, ErrEmptyName
	}
	if targetAmountCents <= 0 {
		return nil, ErrInvalidTargetAmount
	}

	now := time.Now().UTC()
	return &Goal{
		ID:                 uuid.NewString(),
		UserID:             userID,
		Name:               name,
		TargetAmountCents:  targetAmountCents,
		CurrentAmountCents: 0,
		Deadline:           deadline,
		CreatedAt:          now,
		UpdatedAt:          now,
	}, nil
}

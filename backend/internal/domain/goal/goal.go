package goal

import (
	"time"

	"github.com/google/uuid"
)

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

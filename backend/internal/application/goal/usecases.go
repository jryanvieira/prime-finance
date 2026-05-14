package goal

import (
	"context"
	"time"

	domainGoal "dash-fin/internal/domain/goal"
)

// --- Response DTO ---

type GoalResponse struct {
	ID                 string   `json:"id"`
	Name               string   `json:"name"`
	TargetAmountCents  int64    `json:"target_amount_cents"`
	CurrentAmountCents int64    `json:"current_amount_cents"`
	Percentage         float64  `json:"percentage"`
	Deadline           *string  `json:"deadline"`
	CreatedAt          string   `json:"created_at"`
	UpdatedAt          string   `json:"updated_at"`
}

func toResponse(g *domainGoal.Goal) GoalResponse {
	pct := 0.0
	if g.TargetAmountCents > 0 {
		pct = float64(g.CurrentAmountCents) / float64(g.TargetAmountCents) * 100
	}
	return GoalResponse{
		ID:                 g.ID,
		Name:               g.Name,
		TargetAmountCents:  g.TargetAmountCents,
		CurrentAmountCents: g.CurrentAmountCents,
		Percentage:         pct,
		Deadline:           g.Deadline,
		CreatedAt:          g.CreatedAt.Format(time.RFC3339),
		UpdatedAt:          g.UpdatedAt.Format(time.RFC3339),
	}
}

// --- List ---

type ListGoalsUseCase struct {
	repo domainGoal.Repository
}

func NewListGoalsUseCase(repo domainGoal.Repository) *ListGoalsUseCase {
	return &ListGoalsUseCase{repo: repo}
}

func (uc *ListGoalsUseCase) Execute(ctx context.Context, userID string) ([]GoalResponse, error) {
	items, err := uc.repo.List(ctx, userID)
	if err != nil {
		return nil, err
	}

	out := make([]GoalResponse, 0, len(items))
	for _, g := range items {
		out = append(out, toResponse(g))
	}
	return out, nil
}

// --- Create ---

type CreateGoalRequest struct {
	UserID            string  `json:"-"`
	Name              string  `json:"name"`
	TargetAmountCents int64   `json:"target_amount_cents"`
	Deadline          *string `json:"deadline"`
}

type CreateGoalUseCase struct {
	repo domainGoal.Repository
}

func NewCreateGoalUseCase(repo domainGoal.Repository) *CreateGoalUseCase {
	return &CreateGoalUseCase{repo: repo}
}

func (uc *CreateGoalUseCase) Execute(ctx context.Context, req CreateGoalRequest) (*GoalResponse, error) {
	g, err := domainGoal.NewGoal(req.UserID, req.Name, req.TargetAmountCents, req.Deadline)
	if err != nil {
		return nil, err
	}

	if err := uc.repo.Create(ctx, g); err != nil {
		return nil, err
	}

	resp := toResponse(g)
	return &resp, nil
}

// --- Update ---

type UpdateGoalRequest struct {
	UserID            string  `json:"-"`
	ID                string  `json:"-"`
	Name              string  `json:"name"`
	TargetAmountCents int64   `json:"target_amount_cents"`
	Deadline          *string `json:"deadline"`
}

type UpdateGoalUseCase struct {
	repo domainGoal.Repository
}

func NewUpdateGoalUseCase(repo domainGoal.Repository) *UpdateGoalUseCase {
	return &UpdateGoalUseCase{repo: repo}
}

func (uc *UpdateGoalUseCase) Execute(ctx context.Context, req UpdateGoalRequest) (*GoalResponse, error) {
	if req.Name == "" {
		return nil, domainGoal.ErrEmptyName
	}
	if req.TargetAmountCents <= 0 {
		return nil, domainGoal.ErrInvalidTargetAmount
	}

	g, err := uc.repo.GetByID(ctx, req.UserID, req.ID)
	if err != nil {
		return nil, err
	}

	g.Name = req.Name
	g.TargetAmountCents = req.TargetAmountCents
	g.Deadline = req.Deadline
	// Cap current amount if new target is lower
	if g.CurrentAmountCents > g.TargetAmountCents {
		g.CurrentAmountCents = g.TargetAmountCents
	}
	g.UpdatedAt = time.Now().UTC()

	if err := uc.repo.Update(ctx, g); err != nil {
		return nil, err
	}

	resp := toResponse(g)
	return &resp, nil
}

// --- Contribute ---

type ContributeGoalRequest struct {
	UserID      string `json:"-"`
	ID          string `json:"-"`
	AmountCents int64  `json:"amount_cents"`
}

type ContributeGoalUseCase struct {
	repo domainGoal.Repository
}

func NewContributeGoalUseCase(repo domainGoal.Repository) *ContributeGoalUseCase {
	return &ContributeGoalUseCase{repo: repo}
}

func (uc *ContributeGoalUseCase) Execute(ctx context.Context, req ContributeGoalRequest) (*GoalResponse, error) {
	if req.AmountCents <= 0 {
		return nil, domainGoal.ErrNegativeContribution
	}

	g, err := uc.repo.GetByID(ctx, req.UserID, req.ID)
	if err != nil {
		return nil, err
	}

	g.CurrentAmountCents += req.AmountCents
	if g.CurrentAmountCents > g.TargetAmountCents {
		g.CurrentAmountCents = g.TargetAmountCents
	}
	g.UpdatedAt = time.Now().UTC()

	if err := uc.repo.Update(ctx, g); err != nil {
		return nil, err
	}

	resp := toResponse(g)
	return &resp, nil
}

// --- Delete ---

type DeleteGoalUseCase struct {
	repo domainGoal.Repository
}

func NewDeleteGoalUseCase(repo domainGoal.Repository) *DeleteGoalUseCase {
	return &DeleteGoalUseCase{repo: repo}
}

func (uc *DeleteGoalUseCase) Execute(ctx context.Context, userID, id string) error {
	return uc.repo.Delete(ctx, userID, id)
}

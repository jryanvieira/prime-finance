package goal

import (
	"context"
	"errors"
	"testing"
	"time"

	domainGoal "dash-fin/internal/domain/goal"
)

// --- Mock ---

type mockGoalRepo struct {
	listFn     func(ctx context.Context, userID string) ([]*domainGoal.Goal, error)
	getByIDFn  func(ctx context.Context, userID, id string) (*domainGoal.Goal, error)
	createFn   func(ctx context.Context, g *domainGoal.Goal) error
	updateFn   func(ctx context.Context, g *domainGoal.Goal) error
	deleteFn   func(ctx context.Context, userID, id string) error
}

func (m *mockGoalRepo) List(ctx context.Context, userID string) ([]*domainGoal.Goal, error) {
	if m.listFn != nil {
		return m.listFn(ctx, userID)
	}
	return nil, nil
}

func (m *mockGoalRepo) GetByID(ctx context.Context, userID, id string) (*domainGoal.Goal, error) {
	if m.getByIDFn != nil {
		return m.getByIDFn(ctx, userID, id)
	}
	return nil, nil
}

func (m *mockGoalRepo) Create(ctx context.Context, g *domainGoal.Goal) error {
	if m.createFn != nil {
		return m.createFn(ctx, g)
	}
	return nil
}

func (m *mockGoalRepo) Update(ctx context.Context, g *domainGoal.Goal) error {
	if m.updateFn != nil {
		return m.updateFn(ctx, g)
	}
	return nil
}

func (m *mockGoalRepo) Delete(ctx context.Context, userID, id string) error {
	if m.deleteFn != nil {
		return m.deleteFn(ctx, userID, id)
	}
	return nil
}

func newGoal(name string, target int64) *domainGoal.Goal {
	return &domainGoal.Goal{
		ID:                 "g1",
		UserID:             "u1",
		Name:               name,
		TargetAmountCents:  target,
		CurrentAmountCents: 0,
		CreatedAt:          time.Now().UTC(),
		UpdatedAt:          time.Now().UTC(),
	}
}

// --- List ---

func TestListGoals_Success(t *testing.T) {
	g := newGoal("Viagem", 100000)
	repo := &mockGoalRepo{
		listFn: func(_ context.Context, _ string) ([]*domainGoal.Goal, error) {
			return []*domainGoal.Goal{g}, nil
		},
	}
	uc := NewListGoalsUseCase(repo)
	result, err := uc.Execute(context.Background(), "u1")
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if len(result) != 1 {
		t.Fatalf("expected 1 result, got %d", len(result))
	}
}

func TestListGoals_Empty(t *testing.T) {
	repo := &mockGoalRepo{
		listFn: func(_ context.Context, _ string) ([]*domainGoal.Goal, error) {
			return []*domainGoal.Goal{}, nil
		},
	}
	uc := NewListGoalsUseCase(repo)
	result, err := uc.Execute(context.Background(), "u1")
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if len(result) != 0 {
		t.Errorf("expected empty result")
	}
}

func TestListGoals_RepoError(t *testing.T) {
	repoErr := errors.New("db error")
	repo := &mockGoalRepo{
		listFn: func(_ context.Context, _ string) ([]*domainGoal.Goal, error) {
			return nil, repoErr
		},
	}
	uc := NewListGoalsUseCase(repo)
	_, err := uc.Execute(context.Background(), "u1")
	if !errors.Is(err, repoErr) {
		t.Errorf("expected repo error, got %v", err)
	}
}

// --- Create ---

func TestCreateGoal_Success(t *testing.T) {
	repo := &mockGoalRepo{}
	uc := NewCreateGoalUseCase(repo)
	req := CreateGoalRequest{UserID: "u1", Name: "Viagem", TargetAmountCents: 100000}
	resp, err := uc.Execute(context.Background(), req)
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if resp == nil {
		t.Fatal("expected response, got nil")
	}
	if resp.TargetAmountCents != 100000 {
		t.Errorf("expected 100000, got %d", resp.TargetAmountCents)
	}
}

func TestCreateGoal_EmptyName(t *testing.T) {
	repo := &mockGoalRepo{}
	uc := NewCreateGoalUseCase(repo)
	req := CreateGoalRequest{UserID: "u1", Name: "", TargetAmountCents: 100000}
	_, err := uc.Execute(context.Background(), req)
	if !errors.Is(err, domainGoal.ErrEmptyName) {
		t.Errorf("expected ErrEmptyName, got %v", err)
	}
}

func TestCreateGoal_InvalidTargetAmount(t *testing.T) {
	repo := &mockGoalRepo{}
	uc := NewCreateGoalUseCase(repo)
	req := CreateGoalRequest{UserID: "u1", Name: "Viagem", TargetAmountCents: 0}
	_, err := uc.Execute(context.Background(), req)
	if !errors.Is(err, domainGoal.ErrInvalidTargetAmount) {
		t.Errorf("expected ErrInvalidTargetAmount, got %v", err)
	}
}

func TestCreateGoal_RepoError(t *testing.T) {
	repoErr := errors.New("db error")
	repo := &mockGoalRepo{
		createFn: func(_ context.Context, _ *domainGoal.Goal) error {
			return repoErr
		},
	}
	uc := NewCreateGoalUseCase(repo)
	req := CreateGoalRequest{UserID: "u1", Name: "Viagem", TargetAmountCents: 100000}
	_, err := uc.Execute(context.Background(), req)
	if !errors.Is(err, repoErr) {
		t.Errorf("expected repo error, got %v", err)
	}
}

// --- Delete ---

func TestDeleteGoal_Success(t *testing.T) {
	repo := &mockGoalRepo{}
	uc := NewDeleteGoalUseCase(repo)
	if err := uc.Execute(context.Background(), "u1", "g1"); err != nil {
		t.Errorf("unexpected error: %v", err)
	}
}

func TestDeleteGoal_NotFound(t *testing.T) {
	repo := &mockGoalRepo{
		deleteFn: func(_ context.Context, _, _ string) error {
			return domainGoal.ErrGoalNotFound
		},
	}
	uc := NewDeleteGoalUseCase(repo)
	err := uc.Execute(context.Background(), "u1", "g1")
	if !errors.Is(err, domainGoal.ErrGoalNotFound) {
		t.Errorf("expected ErrGoalNotFound, got %v", err)
	}
}

func TestDeleteGoal_RepoError(t *testing.T) {
	repoErr := errors.New("db error")
	repo := &mockGoalRepo{
		deleteFn: func(_ context.Context, _, _ string) error {
			return repoErr
		},
	}
	uc := NewDeleteGoalUseCase(repo)
	err := uc.Execute(context.Background(), "u1", "g1")
	if !errors.Is(err, repoErr) {
		t.Errorf("expected repo error, got %v", err)
	}
}

// --- Contribute ---

func TestContributeGoal_Success(t *testing.T) {
	g := newGoal("Viagem", 100000)
	repo := &mockGoalRepo{
		getByIDFn: func(_ context.Context, _, _ string) (*domainGoal.Goal, error) {
			return g, nil
		},
	}
	uc := NewContributeGoalUseCase(repo)
	req := ContributeGoalRequest{UserID: "u1", ID: "g1", AmountCents: 5000}
	resp, err := uc.Execute(context.Background(), req)
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if resp.CurrentAmountCents != 5000 {
		t.Errorf("expected current 5000, got %d", resp.CurrentAmountCents)
	}
}

func TestContributeGoal_NegativeAmount(t *testing.T) {
	repo := &mockGoalRepo{}
	uc := NewContributeGoalUseCase(repo)
	req := ContributeGoalRequest{UserID: "u1", ID: "g1", AmountCents: 0}
	_, err := uc.Execute(context.Background(), req)
	if !errors.Is(err, domainGoal.ErrNegativeContribution) {
		t.Errorf("expected ErrNegativeContribution, got %v", err)
	}
}

func TestContributeGoal_NotFound(t *testing.T) {
	repo := &mockGoalRepo{
		getByIDFn: func(_ context.Context, _, _ string) (*domainGoal.Goal, error) {
			return nil, domainGoal.ErrGoalNotFound
		},
	}
	uc := NewContributeGoalUseCase(repo)
	req := ContributeGoalRequest{UserID: "u1", ID: "g1", AmountCents: 5000}
	_, err := uc.Execute(context.Background(), req)
	if !errors.Is(err, domainGoal.ErrGoalNotFound) {
		t.Errorf("expected ErrGoalNotFound, got %v", err)
	}
}

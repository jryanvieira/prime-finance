package expense

import (
	"context"
	"errors"
	"testing"

	domainBudget "dash-fin/internal/domain/budget"
	domainExpense "dash-fin/internal/domain/expense"
	domainUser "dash-fin/internal/domain/user"
	pkgmailer "dash-fin/pkg/mailer"
)

// --- Mocks ---

type mockExpenseRepo struct {
	createFn               func(ctx context.Context, e *domainExpense.Expense) error
	getByIDFn              func(ctx context.Context, userID, id string) (*domainExpense.Expense, error)
	listByDateRangeFn      func(ctx context.Context, userID, from, to string) ([]*domainExpense.Expense, error)
	updateFn               func(ctx context.Context, e *domainExpense.Expense) error
	deleteFn               func(ctx context.Context, userID, id string) error
	deleteByInstGroupFn    func(ctx context.Context, userID, groupID string) (int64, error)
}

func (m *mockExpenseRepo) Create(ctx context.Context, e *domainExpense.Expense) error {
	if m.createFn != nil {
		return m.createFn(ctx, e)
	}
	return nil
}

func (m *mockExpenseRepo) GetByID(ctx context.Context, userID, id string) (*domainExpense.Expense, error) {
	if m.getByIDFn != nil {
		return m.getByIDFn(ctx, userID, id)
	}
	return nil, nil
}

func (m *mockExpenseRepo) ListByDateRange(ctx context.Context, userID, from, to string) ([]*domainExpense.Expense, error) {
	if m.listByDateRangeFn != nil {
		return m.listByDateRangeFn(ctx, userID, from, to)
	}
	return nil, nil
}

func (m *mockExpenseRepo) CategorySummary(ctx context.Context, userID, from, to string) ([]*domainExpense.CategorySummaryItem, error) {
	return nil, nil
}

func (m *mockExpenseRepo) Update(ctx context.Context, e *domainExpense.Expense) error {
	if m.updateFn != nil {
		return m.updateFn(ctx, e)
	}
	return nil
}

func (m *mockExpenseRepo) Delete(ctx context.Context, userID, id string) error {
	if m.deleteFn != nil {
		return m.deleteFn(ctx, userID, id)
	}
	return nil
}

func (m *mockExpenseRepo) DeleteByInstallmentGroup(ctx context.Context, userID, groupID string) (int64, error) {
	if m.deleteByInstGroupFn != nil {
		return m.deleteByInstGroupFn(ctx, userID, groupID)
	}
	return 0, nil
}

func (m *mockExpenseRepo) UpdateGroup(_ context.Context, _, _, _ string, _ int64, _ *string, _ *string) error {
	return nil
}

func (m *mockExpenseRepo) CategoryHistory(ctx context.Context, userID string, from, to string) ([]*domainExpense.CategoryHistoryRaw, error) {
	return nil, nil
}

type mockBudgetRepo struct{}

func (m *mockBudgetRepo) List(ctx context.Context, userID, month string) ([]*domainBudget.Budget, error) {
	return nil, nil
}

func (m *mockBudgetRepo) ListWithSpent(ctx context.Context, userID, month string) ([]domainBudget.BudgetWithSpent, error) {
	return nil, nil
}

func (m *mockBudgetRepo) Upsert(ctx context.Context, b *domainBudget.Budget) error { return nil }
func (m *mockBudgetRepo) Delete(ctx context.Context, userID, id string) error       { return nil }

type mockUserRepo struct{}

func (m *mockUserRepo) Save(ctx context.Context, u *domainUser.User) error { return nil }
func (m *mockUserRepo) GetByEmail(ctx context.Context, email string) (*domainUser.User, error) {
	return nil, nil
}
func (m *mockUserRepo) GetByID(ctx context.Context, id string) (*domainUser.User, error) {
	return nil, nil
}
func (m *mockUserRepo) CompleteOnboarding(ctx context.Context, userID string) error { return nil }
func (m *mockUserRepo) ListAll(ctx context.Context) ([]*domainUser.User, error)     { return nil, nil }

type mockMailer struct{}

func (m *mockMailer) Send(ctx context.Context, to, subject, htmlBody string) error { return nil }

var _ pkgmailer.Mailer = (*mockMailer)(nil)

func newCreateUC(repo domainExpense.Repository) *CreateExpenseUseCase {
	return NewCreateExpenseUseCase(repo, &mockBudgetRepo{}, &mockUserRepo{}, nil)
}

// --- Tests ---

func TestCreateExpense_Success(t *testing.T) {
	repo := &mockExpenseRepo{}
	uc := newCreateUC(repo)
	amt := int64(5000)
	req := CreateExpenseRequest{
		UserID:      "u1",
		Date:        "2025-01-15",
		Description: "Almoço",
		AmountCents: &amt,
	}
	resp, err := uc.Execute(context.Background(), req)
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if resp == nil {
		t.Fatal("expected response, got nil")
	}
}

func TestCreateExpense_InvalidDate(t *testing.T) {
	repo := &mockExpenseRepo{}
	uc := newCreateUC(repo)
	amt := int64(5000)
	req := CreateExpenseRequest{
		UserID:      "u1",
		Date:        "not-a-date",
		Description: "Almoço",
		AmountCents: &amt,
	}
	_, err := uc.Execute(context.Background(), req)
	if !errors.Is(err, domainExpense.ErrInvalidDate) {
		t.Errorf("expected ErrInvalidDate, got %v", err)
	}
}

func TestCreateExpense_InvalidAmount(t *testing.T) {
	repo := &mockExpenseRepo{}
	uc := newCreateUC(repo)
	amt := int64(0)
	req := CreateExpenseRequest{
		UserID:      "u1",
		Date:        "2025-01-15",
		Description: "Almoço",
		AmountCents: &amt,
	}
	_, err := uc.Execute(context.Background(), req)
	if !errors.Is(err, domainExpense.ErrInvalidAmount) {
		t.Errorf("expected ErrInvalidAmount, got %v", err)
	}
}

func TestCreateExpense_RepoError(t *testing.T) {
	repoErr := errors.New("db error")
	repo := &mockExpenseRepo{
		createFn: func(_ context.Context, _ *domainExpense.Expense) error {
			return repoErr
		},
	}
	uc := newCreateUC(repo)
	amt := int64(5000)
	req := CreateExpenseRequest{
		UserID:      "u1",
		Date:        "2025-01-15",
		Description: "Almoço",
		AmountCents: &amt,
	}
	_, err := uc.Execute(context.Background(), req)
	if !errors.Is(err, repoErr) {
		t.Errorf("expected repo error, got %v", err)
	}
}

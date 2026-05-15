package alert

import (
	"context"
	"testing"
	"time"

	"dash-fin/internal/domain/recurringexpense"
	domainUser "dash-fin/internal/domain/user"
	pkgmailer "dash-fin/pkg/mailer"
	"dash-fin/pkg/timeutil"
)

// --- mocks for send_recurring ---

type mockMailer struct {
	sent []string
	err  error
}

func (m *mockMailer) Send(_ context.Context, to, _, _ string) error {
	if m.err != nil {
		return m.err
	}
	m.sent = append(m.sent, to)
	return nil
}

type mockAllRecurringRepo struct {
	items []*recurringexpense.RecurringExpense
}

func (r *mockAllRecurringRepo) Create(_ context.Context, _ *recurringexpense.RecurringExpense) error {
	return nil
}
func (r *mockAllRecurringRepo) List(_ context.Context, _ string) ([]*recurringexpense.RecurringExpense, error) {
	return nil, nil
}
func (r *mockAllRecurringRepo) Update(_ context.Context, _ *recurringexpense.RecurringExpense) error {
	return nil
}
func (r *mockAllRecurringRepo) Delete(_ context.Context, _, _ string) error { return nil }
func (r *mockAllRecurringRepo) ListAll(_ context.Context) ([]*recurringexpense.RecurringExpense, error) {
	return r.items, nil
}

type mockUserRepo struct {
	users map[string]*domainUser.User
}

func (r *mockUserRepo) Save(_ context.Context, _ *domainUser.User) error { return nil }
func (r *mockUserRepo) GetByEmail(_ context.Context, _ string) (*domainUser.User, error) {
	return nil, nil
}
func (r *mockUserRepo) GetByID(_ context.Context, id string) (*domainUser.User, error) {
	if u, ok := r.users[id]; ok {
		return u, nil
	}
	return nil, domainUser.ErrUserNotFound
}
func (r *mockUserRepo) CompleteOnboarding(_ context.Context, _ string) error { return nil }
func (r *mockUserRepo) ListAll(_ context.Context) ([]*domainUser.User, error) {
	var out []*domainUser.User
	for _, u := range r.users {
		out = append(out, u)
	}
	return out, nil
}

func makeUser(id, name, email string) *domainUser.User {
	e, _ := domainUser.NewEmail(email)
	return &domainUser.User{ID: id, Name: name, Email: e}
}

func makeRecurring(id, userID string, dayOfMonth int) *recurringexpense.RecurringExpense {
	return &recurringexpense.RecurringExpense{
		ID:          id,
		UserID:      userID,
		Description: "Netflix",
		AmountCents: 3990,
		DayOfMonth:  dayOfMonth,
	}
}

func TestSendRecurring_DueIn3Days_SendsEmail(t *testing.T) {
	// today = 2026-05-12; today+3 = 15
	today := time.Date(2026, 5, 12, 8, 0, 0, 0, time.UTC)
	m := &mockMailer{}
	uc := NewSendRecurringAlertsUseCase(
		&mockAllRecurringRepo{items: []*recurringexpense.RecurringExpense{
			makeRecurring("r1", "u1", 15),
		}},
		&mockUserRepo{users: map[string]*domainUser.User{
			"u1": makeUser("u1", "João", "joao@example.com"),
		}},
		m,
		timeutil.FixedClock(today),
	)

	if err := uc.Execute(context.Background()); err != nil {
		t.Fatal(err)
	}
	if len(m.sent) != 1 {
		t.Fatalf("expected 1 email, got %d", len(m.sent))
	}
}

func TestSendRecurring_DueIn4Days_NoEmail(t *testing.T) {
	// today = 2026-05-12; today+4 = 16 → no match
	today := time.Date(2026, 5, 12, 8, 0, 0, 0, time.UTC)
	m := &mockMailer{}
	uc := NewSendRecurringAlertsUseCase(
		&mockAllRecurringRepo{items: []*recurringexpense.RecurringExpense{
			makeRecurring("r1", "u1", 16),
		}},
		&mockUserRepo{users: map[string]*domainUser.User{
			"u1": makeUser("u1", "João", "joao@example.com"),
		}},
		m,
		timeutil.FixedClock(today),
	)

	if err := uc.Execute(context.Background()); err != nil {
		t.Fatal(err)
	}
	if len(m.sent) != 0 {
		t.Fatalf("expected 0 emails, got %d", len(m.sent))
	}
}

func TestSendRecurring_SendFailsForFirst_SecondStillReceives(t *testing.T) {
	// today = 2026-05-12; target = 15
	today := time.Date(2026, 5, 12, 8, 0, 0, 0, time.UTC)
	callCount := 0
	failFirst := &mockFailFirstMailer{failFirst: true, calls: &callCount}

	uc := NewSendRecurringAlertsUseCase(
		&mockAllRecurringRepo{items: []*recurringexpense.RecurringExpense{
			makeRecurring("r1", "u1", 15),
			makeRecurring("r2", "u2", 15),
		}},
		&mockUserRepo{users: map[string]*domainUser.User{
			"u1": makeUser("u1", "Ana", "ana@example.com"),
			"u2": makeUser("u2", "Bob", "bob@example.com"),
		}},
		failFirst,
		timeutil.FixedClock(today),
	)

	if err := uc.Execute(context.Background()); err != nil {
		t.Fatal(err)
	}
	if *failFirst.calls != 2 {
		t.Fatalf("expected 2 send attempts, got %d", *failFirst.calls)
	}
}

type mockFailFirstMailer struct {
	failFirst bool
	calls     *int
}

func (m *mockFailFirstMailer) Send(_ context.Context, _, _, _ string) error {
	*m.calls++
	if m.failFirst && *m.calls == 1 {
		return pkgmailer.ErrSendFailed
	}
	return nil
}

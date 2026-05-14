package sqlite

import (
	"context"
	"database/sql"
	"errors"
	"time"

	"dash-fin/internal/domain/budget"
)

func parseTime(s string) time.Time {
	t, _ := time.Parse(time.RFC3339Nano, s)
	return t
}

type BudgetRepository struct {
	db *sql.DB
}

func NewBudgetRepository(db *sql.DB) *BudgetRepository {
	return &BudgetRepository{db: db}
}

func (r *BudgetRepository) List(ctx context.Context, userID, month string) ([]*budget.Budget, error) {
	rows, err := r.db.QueryContext(ctx, `
SELECT id, user_id, category_id, month, amount_cents, created_at, updated_at
FROM budgets
WHERE user_id = ? AND month = ?
ORDER BY created_at ASC;
`, userID, month)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var out []*budget.Budget
	for rows.Next() {
		var b budget.Budget
		var ct, ut string
		if err := rows.Scan(&b.ID, &b.UserID, &b.CategoryID, &b.Month, &b.AmountCents, &ct, &ut); err != nil {
			return nil, err
		}
		b.CreatedAt = parseTime(ct)
		b.UpdatedAt = parseTime(ut)
		out = append(out, &b)
	}
	return out, rows.Err()
}

func (r *BudgetRepository) ListWithSpent(ctx context.Context, userID, month string) ([]budget.BudgetWithSpent, error) {
	rows, err := r.db.QueryContext(ctx, `
SELECT
  b.id, b.user_id, b.category_id, b.month, b.amount_cents, b.created_at, b.updated_at,
  COALESCE(c.name, b.category_id) AS cat_name,
  COALESCE(
    (SELECT SUM(e.amount_cents)
     FROM expenses e
     WHERE e.user_id = b.user_id
       AND e.date >= b.month || '-01'
       AND e.date <= date(b.month || '-01', 'start of month', '+1 month', '-1 day')
       AND COALESCE(e.category, 'Outros') = COALESCE(c.name, b.category_id)),
    0
  ) AS spent_cents
FROM budgets b
LEFT JOIN categories c ON c.id = b.category_id
WHERE b.user_id = ? AND b.month = ?
ORDER BY b.created_at ASC;
`, userID, month)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var out []budget.BudgetWithSpent
	for rows.Next() {
		var b budget.Budget
		var spent int64
		var catName string
		var ct, ut string
		if err := rows.Scan(&b.ID, &b.UserID, &b.CategoryID, &b.Month, &b.AmountCents, &ct, &ut, &catName, &spent); err != nil {
			return nil, err
		}
		b.CreatedAt = parseTime(ct)
		b.UpdatedAt = parseTime(ut)
		out = append(out, budget.BudgetWithSpent{Budget: &b, SpentCents: spent, CatName: catName})
	}
	return out, rows.Err()
}

func (r *BudgetRepository) Upsert(ctx context.Context, b *budget.Budget) error {
	_, err := r.db.ExecContext(ctx, `
INSERT INTO budgets (id, user_id, category_id, month, amount_cents)
VALUES (?, ?, ?, ?, ?)
ON CONFLICT(user_id, category_id, month) DO UPDATE SET
  amount_cents = excluded.amount_cents,
  updated_at   = strftime('%Y-%m-%dT%H:%M:%fZ', 'now');
`, b.ID, b.UserID, b.CategoryID, b.Month, b.AmountCents)
	return err
}

func (r *BudgetRepository) Delete(ctx context.Context, userID, id string) error {
	res, err := r.db.ExecContext(ctx, `
DELETE FROM budgets WHERE id = ? AND user_id = ?;
`, id, userID)
	if err != nil {
		return err
	}
	n, _ := res.RowsAffected()
	if n == 0 {
		return budget.ErrBudgetNotFound
	}
	return nil
}

func (r *BudgetRepository) GetByID(ctx context.Context, userID, id string) (*budget.Budget, error) {
	var b budget.Budget
	var ct, ut string
	err := r.db.QueryRowContext(ctx, `
SELECT id, user_id, category_id, month, amount_cents, created_at, updated_at
FROM budgets WHERE id = ? AND user_id = ?;
`, id, userID).Scan(&b.ID, &b.UserID, &b.CategoryID, &b.Month, &b.AmountCents, &ct, &ut)
	b.CreatedAt = parseTime(ct)
	b.UpdatedAt = parseTime(ut)
	if errors.Is(err, sql.ErrNoRows) {
		return nil, budget.ErrBudgetNotFound
	}
	return &b, err
}

package sqlite

import (
	"context"
	"database/sql"

	"dash-fin/internal/domain/income"
)

type IncomeRepository struct {
	db *sql.DB
}

func NewIncomeRepository(db *sql.DB) *IncomeRepository {
	return &IncomeRepository{db: db}
}

func (r *IncomeRepository) Create(ctx context.Context, i *income.Income) error {
	recurring := 0
	if i.IsRecurring {
		recurring = 1
	}
	_, err := r.db.ExecContext(ctx, `
INSERT INTO incomes (id, user_id, date, description, amount_cents, category, is_recurring)
VALUES (?, ?, ?, ?, ?, ?, ?);
`, i.ID, i.UserID, i.Date, i.Description, i.AmountCents, i.Category, recurring)
	return err
}

func (r *IncomeRepository) ListByDateRange(ctx context.Context, userID, from, to string) ([]*income.Income, error) {
	rows, err := r.db.QueryContext(ctx, `
SELECT id, date, description, amount_cents, category, is_recurring
FROM incomes
WHERE user_id = ?
  AND date >= ?
  AND date <= ?
ORDER BY date DESC, created_at DESC;
`, userID, from, to)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var out []*income.Income
	for rows.Next() {
		var inc income.Income
		var cat sql.NullString
		var recurring int
		if err := rows.Scan(&inc.ID, &inc.Date, &inc.Description, &inc.AmountCents, &cat, &recurring); err != nil {
			return nil, err
		}
		if cat.Valid {
			inc.Category = &cat.String
		}
		inc.IsRecurring = recurring == 1
		inc.UserID = userID
		out = append(out, &inc)
	}
	return out, rows.Err()
}

func (r *IncomeRepository) Update(ctx context.Context, i *income.Income) error {
	recurring := 0
	if i.IsRecurring {
		recurring = 1
	}
	res, err := r.db.ExecContext(ctx, `
UPDATE incomes
SET date = ?, description = ?, amount_cents = ?, category = ?, is_recurring = ?,
    updated_at = (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
WHERE id = ? AND user_id = ?;
`, i.Date, i.Description, i.AmountCents, i.Category, recurring, i.ID, i.UserID)
	if err != nil {
		return err
	}
	n, _ := res.RowsAffected()
	if n == 0 {
		return income.ErrIncomeNotFound
	}
	return nil
}

func (r *IncomeRepository) Delete(ctx context.Context, userID, id string) error {
	res, err := r.db.ExecContext(ctx, `
DELETE FROM incomes
WHERE id = ? AND user_id = ?;
`, id, userID)
	if err != nil {
		return err
	}
	n, _ := res.RowsAffected()
	if n == 0 {
		return income.ErrIncomeNotFound
	}
	return nil
}

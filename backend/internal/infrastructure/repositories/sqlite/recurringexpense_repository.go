package sqlite

import (
	"context"
	"database/sql"

	"dash-fin/internal/domain/recurringexpense"
)

type RecurringExpenseRepository struct {
	db *sql.DB
}

func NewRecurringExpenseRepository(db *sql.DB) *RecurringExpenseRepository {
	return &RecurringExpenseRepository{db: db}
}

func (r *RecurringExpenseRepository) Create(ctx context.Context, re *recurringexpense.RecurringExpense) error {
	_, err := r.db.ExecContext(ctx, `
INSERT INTO recurring_expenses (id, user_id, payment_method_id, start_month, day_of_month, description, amount_cents, category)
VALUES (?, ?, ?, ?, ?, ?, ?, ?);
`, re.ID, re.UserID, re.PaymentMethodID, re.StartMonth, re.DayOfMonth, re.Description, re.AmountCents, re.Category)
	return err
}

func (r *RecurringExpenseRepository) List(ctx context.Context, userID string) ([]*recurringexpense.RecurringExpense, error) {
	rows, err := r.db.QueryContext(ctx, `
SELECT id, payment_method_id, start_month, day_of_month, description, amount_cents, category
FROM recurring_expenses
WHERE user_id = ?
ORDER BY created_at DESC;
`, userID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var out []*recurringexpense.RecurringExpense
	for rows.Next() {
		var re recurringexpense.RecurringExpense
		var pm sql.NullString
		var cat sql.NullString
		if err := rows.Scan(&re.ID, &pm, &re.StartMonth, &re.DayOfMonth, &re.Description, &re.AmountCents, &cat); err != nil {
			return nil, err
		}
		if pm.Valid {
			re.PaymentMethodID = &pm.String
		}
		if cat.Valid {
			re.Category = &cat.String
		}
		re.UserID = userID
		out = append(out, &re)
	}
	return out, rows.Err()
}

func (r *RecurringExpenseRepository) Update(ctx context.Context, re *recurringexpense.RecurringExpense) error {
	res, err := r.db.ExecContext(ctx, `
UPDATE recurring_expenses
SET payment_method_id = ?, start_month = ?, day_of_month = ?, description = ?, amount_cents = ?, category = ?,
    updated_at = (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
WHERE id = ? AND user_id = ?;
`, re.PaymentMethodID, re.StartMonth, re.DayOfMonth, re.Description, re.AmountCents, re.Category, re.ID, re.UserID)
	if err != nil {
		return err
	}
	n, _ := res.RowsAffected()
	if n == 0 {
		return recurringexpense.ErrRecurringExpenseNotFound
	}
	return nil
}

func (r *RecurringExpenseRepository) Delete(ctx context.Context, userID, id string) error {
	res, err := r.db.ExecContext(ctx, `
DELETE FROM recurring_expenses
WHERE id = ? AND user_id = ?;
`, id, userID)
	if err != nil {
		return err
	}
	n, _ := res.RowsAffected()
	if n == 0 {
		return recurringexpense.ErrRecurringExpenseNotFound
	}
	return nil
}

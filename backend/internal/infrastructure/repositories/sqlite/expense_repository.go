package sqlite

import (
	"context"
	"database/sql"
	"errors"

	"dash-fin/internal/domain/expense"
)

// ExpenseRepository implements domain/expense.Repository with SQLite.
type ExpenseRepository struct {
	db *sql.DB
}

func NewExpenseRepository(db *sql.DB) *ExpenseRepository {
	return &ExpenseRepository{db: db}
}

func (r *ExpenseRepository) Create(ctx context.Context, e *expense.Expense) error {
	_, err := r.db.ExecContext(ctx, `
INSERT INTO expenses (
  id, user_id, payment_method_id, date, description, amount_cents, category,
  installment_group_id, installments_count, installment_index, monthly_amount_cents, total_amount_cents
)
VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?);
`, e.ID, e.UserID, e.PaymentMethodID, e.Date, e.Description, e.AmountCents, e.Category,
		e.InstallmentGroupID, e.InstallmentsCount, e.InstallmentIndex, e.MonthlyAmountCents, e.TotalAmountCents)
	return err
}

func (r *ExpenseRepository) GetByID(ctx context.Context, userID, id string) (*expense.Expense, error) {
	var e expense.Expense
	var pm sql.NullString
	var cat sql.NullString
	var grp sql.NullString
	var cnt sql.NullInt64
	var idx sql.NullInt64
	var monthly sql.NullInt64
	var total sql.NullInt64

	err := r.db.QueryRowContext(ctx, `
SELECT id, payment_method_id, date, description, amount_cents, category,
       installment_group_id, installments_count, installment_index, monthly_amount_cents, total_amount_cents
FROM expenses
WHERE id = ? AND user_id = ?
LIMIT 1;
`, id, userID).Scan(&e.ID, &pm, &e.Date, &e.Description, &e.AmountCents, &cat,
		&grp, &cnt, &idx, &monthly, &total)

	if errors.Is(err, sql.ErrNoRows) {
		return nil, expense.ErrExpenseNotFound
	}
	if err != nil {
		return nil, err
	}

	e.UserID = userID
	if pm.Valid {
		e.PaymentMethodID = &pm.String
	}
	if cat.Valid {
		e.Category = &cat.String
	}
	if grp.Valid {
		e.InstallmentGroupID = &grp.String
	}
	if cnt.Valid {
		v := int(cnt.Int64)
		e.InstallmentsCount = &v
	}
	if idx.Valid {
		v := int(idx.Int64)
		e.InstallmentIndex = &v
	}
	if monthly.Valid {
		v := monthly.Int64
		e.MonthlyAmountCents = &v
	}
	if total.Valid {
		v := total.Int64
		e.TotalAmountCents = &v
	}

	return &e, nil
}

func (r *ExpenseRepository) ListByDateRange(ctx context.Context, userID, from, to string) ([]*expense.Expense, error) {
	rows, err := r.db.QueryContext(ctx, `
SELECT id, payment_method_id, date, description, amount_cents, category,
       installment_group_id, installments_count, installment_index, monthly_amount_cents, total_amount_cents
FROM expenses
WHERE user_id = ?
  AND date >= ?
  AND date <= ?
ORDER BY date DESC, created_at DESC;
`, userID, from, to)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var out []*expense.Expense
	for rows.Next() {
		var e expense.Expense
		var pm sql.NullString
		var cat sql.NullString
		var grp sql.NullString
		var cnt sql.NullInt64
		var idx sql.NullInt64
		var monthly sql.NullInt64
		var total sql.NullInt64

		if err := rows.Scan(&e.ID, &pm, &e.Date, &e.Description, &e.AmountCents, &cat,
			&grp, &cnt, &idx, &monthly, &total); err != nil {
			return nil, err
		}

		e.UserID = userID
		if pm.Valid {
			e.PaymentMethodID = &pm.String
		}
		if cat.Valid {
			e.Category = &cat.String
		}
		if grp.Valid {
			e.InstallmentGroupID = &grp.String
		}
		if cnt.Valid {
			v := int(cnt.Int64)
			e.InstallmentsCount = &v
		}
		if idx.Valid {
			v := int(idx.Int64)
			e.InstallmentIndex = &v
		}
		if monthly.Valid {
			v := monthly.Int64
			e.MonthlyAmountCents = &v
		}
		if total.Valid {
			v := total.Int64
			e.TotalAmountCents = &v
		}

		out = append(out, &e)
	}
	return out, rows.Err()
}

func (r *ExpenseRepository) Update(ctx context.Context, e *expense.Expense) error {
	res, err := r.db.ExecContext(ctx, `
UPDATE expenses
SET payment_method_id = ?, date = ?, description = ?, amount_cents = ?, category = ?,
    updated_at = (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
WHERE id = ? AND user_id = ?;
`, e.PaymentMethodID, e.Date, e.Description, e.AmountCents, e.Category, e.ID, e.UserID)
	if err != nil {
		return err
	}
	n, err := res.RowsAffected()
	if err != nil {
		return err
	}
	if n == 0 {
		return expense.ErrExpenseNotFound
	}
	return nil
}

func (r *ExpenseRepository) Delete(ctx context.Context, userID, id string) error {
	res, err := r.db.ExecContext(ctx, `
DELETE FROM expenses
WHERE id = ? AND user_id = ?;
`, id, userID)
	if err != nil {
		return err
	}
	n, err := res.RowsAffected()
	if err != nil {
		return err
	}
	if n == 0 {
		return expense.ErrExpenseNotFound
	}
	return nil
}

func (r *ExpenseRepository) DeleteByInstallmentGroup(ctx context.Context, userID, groupID string) (int64, error) {
	res, err := r.db.ExecContext(ctx, `
DELETE FROM expenses
WHERE user_id = ? AND installment_group_id = ?;
`, userID, groupID)
	if err != nil {
		return 0, err
	}
	return res.RowsAffected()
}

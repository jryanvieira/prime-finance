package sqlite

import (
	"context"
	"database/sql"

	"dash-fin/internal/domain/paymentmethod"
)

type PaymentMethodRepository struct {
	db *sql.DB
}

func NewPaymentMethodRepository(db *sql.DB) *PaymentMethodRepository {
	return &PaymentMethodRepository{db: db}
}

func (r *PaymentMethodRepository) Create(ctx context.Context, pm *paymentmethod.PaymentMethod) error {
	_, err := r.db.ExecContext(ctx, `
INSERT INTO payment_methods (id, user_id, type, label, color)
VALUES (?, ?, ?, ?, ?);
`, pm.ID, pm.UserID, pm.Type, pm.Label, pm.Color)
	return err
}

func (r *PaymentMethodRepository) List(ctx context.Context, userID string) ([]*paymentmethod.PaymentMethod, error) {
	rows, err := r.db.QueryContext(ctx, `
SELECT id, type, label, color
FROM payment_methods
WHERE user_id = ?
ORDER BY created_at DESC;
`, userID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var out []*paymentmethod.PaymentMethod
	for rows.Next() {
		var pm paymentmethod.PaymentMethod
		if err := rows.Scan(&pm.ID, &pm.Type, &pm.Label, &pm.Color); err != nil {
			return nil, err
		}
		pm.UserID = userID
		out = append(out, &pm)
	}
	return out, rows.Err()
}

func (r *PaymentMethodRepository) Update(ctx context.Context, pm *paymentmethod.PaymentMethod) error {
	res, err := r.db.ExecContext(ctx, `
UPDATE payment_methods
SET type = ?, label = ?, color = ?, updated_at = (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
WHERE id = ? AND user_id = ?;
`, pm.Type, pm.Label, pm.Color, pm.ID, pm.UserID)
	if err != nil {
		return err
	}
	n, _ := res.RowsAffected()
	if n == 0 {
		return paymentmethod.ErrPaymentMethodNotFound
	}
	return nil
}

func (r *PaymentMethodRepository) Delete(ctx context.Context, userID, id string) error {
	res, err := r.db.ExecContext(ctx, `
DELETE FROM payment_methods
WHERE id = ? AND user_id = ?;
`, id, userID)
	if err != nil {
		return err
	}
	n, _ := res.RowsAffected()
	if n == 0 {
		return paymentmethod.ErrPaymentMethodNotFound
	}
	return nil
}

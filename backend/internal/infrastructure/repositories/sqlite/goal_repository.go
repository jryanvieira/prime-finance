package sqlite

import (
	"context"
	"database/sql"
	"errors"

	"dash-fin/internal/domain/goal"
)

type GoalRepository struct {
	db *sql.DB
}

func NewGoalRepository(db *sql.DB) *GoalRepository {
	return &GoalRepository{db: db}
}

func (r *GoalRepository) List(ctx context.Context, userID string) ([]*goal.Goal, error) {
	rows, err := r.db.QueryContext(ctx, `
SELECT id, user_id, name, target_amount_cents, current_amount_cents, deadline, created_at, updated_at
FROM goals
WHERE user_id = ?
ORDER BY created_at ASC;
`, userID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var out []*goal.Goal
	for rows.Next() {
		var g goal.Goal
		if err := rows.Scan(&g.ID, &g.UserID, &g.Name, &g.TargetAmountCents, &g.CurrentAmountCents, &g.Deadline, &g.CreatedAt, &g.UpdatedAt); err != nil {
			return nil, err
		}
		out = append(out, &g)
	}
	return out, rows.Err()
}

func (r *GoalRepository) GetByID(ctx context.Context, userID, id string) (*goal.Goal, error) {
	var g goal.Goal
	err := r.db.QueryRowContext(ctx, `
SELECT id, user_id, name, target_amount_cents, current_amount_cents, deadline, created_at, updated_at
FROM goals WHERE id = ? AND user_id = ?;
`, id, userID).Scan(&g.ID, &g.UserID, &g.Name, &g.TargetAmountCents, &g.CurrentAmountCents, &g.Deadline, &g.CreatedAt, &g.UpdatedAt)
	if errors.Is(err, sql.ErrNoRows) {
		return nil, goal.ErrGoalNotFound
	}
	return &g, err
}

func (r *GoalRepository) Create(ctx context.Context, g *goal.Goal) error {
	_, err := r.db.ExecContext(ctx, `
INSERT INTO goals (id, user_id, name, target_amount_cents, current_amount_cents, deadline)
VALUES (?, ?, ?, ?, ?, ?);
`, g.ID, g.UserID, g.Name, g.TargetAmountCents, g.CurrentAmountCents, g.Deadline)
	return err
}

func (r *GoalRepository) Update(ctx context.Context, g *goal.Goal) error {
	_, err := r.db.ExecContext(ctx, `
UPDATE goals
SET name = ?, target_amount_cents = ?, current_amount_cents = ?, deadline = ?,
    updated_at = strftime('%Y-%m-%dT%H:%M:%fZ', 'now')
WHERE id = ? AND user_id = ?;
`, g.Name, g.TargetAmountCents, g.CurrentAmountCents, g.Deadline, g.ID, g.UserID)
	return err
}

func (r *GoalRepository) Delete(ctx context.Context, userID, id string) error {
	res, err := r.db.ExecContext(ctx, `
DELETE FROM goals WHERE id = ? AND user_id = ?;
`, id, userID)
	if err != nil {
		return err
	}
	n, _ := res.RowsAffected()
	if n == 0 {
		return goal.ErrGoalNotFound
	}
	return nil
}

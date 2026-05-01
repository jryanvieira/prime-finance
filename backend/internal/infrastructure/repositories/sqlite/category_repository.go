package sqlite

import (
	"context"
	"database/sql"

	"dash-fin/internal/domain/category"
)

type CategoryRepository struct {
	db *sql.DB
}

func NewCategoryRepository(db *sql.DB) *CategoryRepository {
	return &CategoryRepository{db: db}
}

func (r *CategoryRepository) List(ctx context.Context, userID string, catType string) ([]*category.Category, error) {
	query := `
SELECT id, user_id, name, color, icon, type
FROM categories
WHERE (user_id IS NULL OR user_id = ?)
`
	args := []any{userID}
	if catType != "" {
		query += ` AND (type = ? OR type = 'both')`
		args = append(args, catType)
	}
	query += ` ORDER BY type, name;`

	rows, err := r.db.QueryContext(ctx, query, args...)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var out []*category.Category
	for rows.Next() {
		var c category.Category
		var uid sql.NullString
		var icon sql.NullString
		if err := rows.Scan(&c.ID, &uid, &c.Name, &c.Color, &icon, &c.Type); err != nil {
			return nil, err
		}
		if uid.Valid {
			c.UserID = &uid.String
			c.IsCustom = true
		}
		if icon.Valid {
			c.Icon = &icon.String
		}
		out = append(out, &c)
	}
	return out, rows.Err()
}

func (r *CategoryRepository) Create(ctx context.Context, c *category.Category) error {
	_, err := r.db.ExecContext(ctx, `
INSERT INTO categories (id, user_id, name, color, icon, type)
VALUES (?, ?, ?, ?, ?, ?);
`, c.ID, c.UserID, c.Name, c.Color, c.Icon, c.Type)
	return err
}

func (r *CategoryRepository) Delete(ctx context.Context, userID, id string) error {
	res, err := r.db.ExecContext(ctx, `
DELETE FROM categories
WHERE id = ? AND user_id = ?;
`, id, userID)
	if err != nil {
		return err
	}
	n, _ := res.RowsAffected()
	if n == 0 {
		return category.ErrCategoryNotFound
	}
	return nil
}

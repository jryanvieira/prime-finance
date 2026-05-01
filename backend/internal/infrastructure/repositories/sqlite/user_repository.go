package sqlite

import (
	"context"
	"database/sql"
	"errors"

	"dash-fin/internal/domain/user"
)

// UserRepository implements domain/user.Repository with SQLite.
type UserRepository struct {
	db *sql.DB
}

func NewUserRepository(db *sql.DB) *UserRepository {
	return &UserRepository{db: db}
}

func (r *UserRepository) Save(ctx context.Context, u *user.User) error {
	_, err := r.db.ExecContext(ctx, `
INSERT INTO users (id, name, email, password_hash)
VALUES (?, ?, ?, ?);
`, u.ID, u.Name, u.Email.String(), u.PasswordHash)
	if err != nil {
		if isUniqueViolation(err) {
			return user.ErrEmailAlreadyExists
		}
		return err
	}
	return nil
}

func (r *UserRepository) GetByEmail(ctx context.Context, email string) (*user.User, error) {
	var id, name, emailStr, passwordHash string
	err := r.db.QueryRowContext(ctx, `
SELECT id, name, email, password_hash
FROM users
WHERE email = ?
LIMIT 1;
`, email).Scan(&id, &name, &emailStr, &passwordHash)
	if errors.Is(err, sql.ErrNoRows) {
		return nil, user.ErrUserNotFound
	}
	if err != nil {
		return nil, err
	}

	emailVO, err := user.NewEmail(emailStr)
	if err != nil {
		return nil, err
	}

	return &user.User{
		ID:           id,
		Name:         name,
		Email:        emailVO,
		PasswordHash: passwordHash,
	}, nil
}

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
	var onboarding int
	err := r.db.QueryRowContext(ctx, `
SELECT id, name, email, password_hash, COALESCE(onboarding_completed, 0)
FROM users
WHERE email = ?
LIMIT 1;
`, email).Scan(&id, &name, &emailStr, &passwordHash, &onboarding)
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
		ID:                  id,
		Name:                name,
		Email:               emailVO,
		PasswordHash:        passwordHash,
		OnboardingCompleted: onboarding == 1,
	}, nil
}

func (r *UserRepository) GetByID(ctx context.Context, id string) (*user.User, error) {
	var uid, name, emailStr, passwordHash string
	var onboarding int
	err := r.db.QueryRowContext(ctx, `
SELECT id, name, email, password_hash, COALESCE(onboarding_completed, 0)
FROM users WHERE id = ? LIMIT 1;
`, id).Scan(&uid, &name, &emailStr, &passwordHash, &onboarding)
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
		ID:                  uid,
		Name:                name,
		Email:               emailVO,
		PasswordHash:        passwordHash,
		OnboardingCompleted: onboarding == 1,
	}, nil
}

func (r *UserRepository) CompleteOnboarding(ctx context.Context, userID string) error {
	_, err := r.db.ExecContext(ctx, `
UPDATE users SET onboarding_completed = 1, updated_at = strftime('%Y-%m-%dT%H:%M:%fZ', 'now')
WHERE id = ?;
`, userID)
	return err
}

func (r *UserRepository) ListAll(ctx context.Context) ([]*user.User, error) {
	rows, err := r.db.QueryContext(ctx, `
SELECT id, name, email, password_hash, COALESCE(onboarding_completed, 0)
FROM users ORDER BY created_at;`)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var users []*user.User
	for rows.Next() {
		var uid, name, emailStr, passwordHash string
		var onboarding int
		if err := rows.Scan(&uid, &name, &emailStr, &passwordHash, &onboarding); err != nil {
			return nil, err
		}
		emailVO, err := user.NewEmail(emailStr)
		if err != nil {
			return nil, err
		}
		users = append(users, &user.User{
			ID:                  uid,
			Name:                name,
			Email:               emailVO,
			PasswordHash:        passwordHash,
			OnboardingCompleted: onboarding == 1,
		})
	}
	return users, rows.Err()
}

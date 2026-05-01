package category

import (
	"time"

	"github.com/google/uuid"
)

// Category represents a category (global or custom per user).
type Category struct {
	ID       string
	UserID   *string // nil for global categories
	Name     string
	Color    string
	Icon     *string
	Type     string // "expense", "income", "both"
	IsCustom bool
	CreatedAt time.Time
}

// NewCategory creates a new custom category for a user.
func NewCategory(userID, name, color string, icon *string, catType string) (*Category, error) {
	if name == "" {
		return nil, ErrEmptyName
	}
	if color == "" {
		return nil, ErrEmptyColor
	}
	if catType == "" {
		return nil, ErrInvalidType
	}

	return &Category{
		ID:       uuid.NewString(),
		UserID:   &userID,
		Name:     name,
		Color:    color,
		Icon:     icon,
		Type:     catType,
		IsCustom: true,
		CreatedAt: time.Now().UTC(),
	}, nil
}

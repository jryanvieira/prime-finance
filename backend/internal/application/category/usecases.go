package category

import (
	"context"

	domainCategory "dash-fin/internal/domain/category"
)

// --- Response DTO ---

type CategoryResponse struct {
	ID       string  `json:"id"`
	UserID   *string `json:"-"`
	Name     string  `json:"name"`
	Color    string  `json:"color"`
	Icon     *string `json:"icon,omitempty"`
	Type     string  `json:"type"`
	IsCustom bool    `json:"is_custom"`
}

func toCategoryResponse(c *domainCategory.Category) CategoryResponse {
	return CategoryResponse{
		ID:       c.ID,
		UserID:   c.UserID,
		Name:     c.Name,
		Color:    c.Color,
		Icon:     c.Icon,
		Type:     c.Type,
		IsCustom: c.IsCustom,
	}
}

// --- List ---

type ListCategoriesRequest struct {
	UserID string
	Type   string // "expense", "income", or ""
}

type ListCategoriesUseCase struct {
	repo domainCategory.Repository
}

func NewListCategoriesUseCase(repo domainCategory.Repository) *ListCategoriesUseCase {
	return &ListCategoriesUseCase{repo: repo}
}

func (uc *ListCategoriesUseCase) Execute(ctx context.Context, req ListCategoriesRequest) ([]CategoryResponse, error) {
	items, err := uc.repo.List(ctx, req.UserID, req.Type)
	if err != nil {
		return nil, err
	}

	out := make([]CategoryResponse, 0, len(items))
	for _, c := range items {
		out = append(out, toCategoryResponse(c))
	}
	return out, nil
}

// --- Create ---

type CreateCategoryRequest struct {
	UserID string  `json:"-"`
	Name   string  `json:"name"`
	Color  string  `json:"color"`
	Icon   *string `json:"icon"`
	Type   string  `json:"type"`
}

type CreateCategoryUseCase struct {
	repo domainCategory.Repository
}

func NewCreateCategoryUseCase(repo domainCategory.Repository) *CreateCategoryUseCase {
	return &CreateCategoryUseCase{repo: repo}
}

func (uc *CreateCategoryUseCase) Execute(ctx context.Context, req CreateCategoryRequest) (*CategoryResponse, error) {
	cat, err := domainCategory.NewCategory(req.UserID, req.Name, req.Color, req.Icon, req.Type)
	if err != nil {
		return nil, err
	}

	if err := uc.repo.Create(ctx, cat); err != nil {
		return nil, err
	}

	resp := toCategoryResponse(cat)
	return &resp, nil
}

// --- Delete ---

type DeleteCategoryUseCase struct {
	repo domainCategory.Repository
}

func NewDeleteCategoryUseCase(repo domainCategory.Repository) *DeleteCategoryUseCase {
	return &DeleteCategoryUseCase{repo: repo}
}

func (uc *DeleteCategoryUseCase) Execute(ctx context.Context, userID, id string) error {
	return uc.repo.Delete(ctx, userID, id)
}

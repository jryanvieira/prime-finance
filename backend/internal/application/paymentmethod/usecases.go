package paymentmethod

import (
	"context"

	domainPM "dash-fin/internal/domain/paymentmethod"
)

// --- Response DTO ---

type PaymentMethodResponse struct {
	ID    string `json:"id"`
	Type  string `json:"type"`
	Label string `json:"label"`
	Color string `json:"color"`
}

func toPMResponse(pm *domainPM.PaymentMethod) PaymentMethodResponse {
	return PaymentMethodResponse{
		ID:    pm.ID,
		Type:  pm.Type,
		Label: pm.Label,
		Color: pm.Color,
	}
}

// --- Create ---

type CreatePaymentMethodRequest struct {
	UserID string `json:"-"`
	Type   string `json:"type"`
	Label  string `json:"label"`
	Color  string `json:"color"`
}

type CreatePaymentMethodUseCase struct {
	repo domainPM.Repository
}

func NewCreatePaymentMethodUseCase(repo domainPM.Repository) *CreatePaymentMethodUseCase {
	return &CreatePaymentMethodUseCase{repo: repo}
}

func (uc *CreatePaymentMethodUseCase) Execute(ctx context.Context, req CreatePaymentMethodRequest) (*PaymentMethodResponse, error) {
	pm, err := domainPM.NewPaymentMethod(req.UserID, req.Type, req.Label, req.Color)
	if err != nil {
		return nil, err
	}

	if err := uc.repo.Create(ctx, pm); err != nil {
		return nil, err
	}

	resp := toPMResponse(pm)
	return &resp, nil
}

// --- List ---

type ListPaymentMethodsUseCase struct {
	repo domainPM.Repository
}

func NewListPaymentMethodsUseCase(repo domainPM.Repository) *ListPaymentMethodsUseCase {
	return &ListPaymentMethodsUseCase{repo: repo}
}

func (uc *ListPaymentMethodsUseCase) Execute(ctx context.Context, userID string) ([]PaymentMethodResponse, error) {
	items, err := uc.repo.List(ctx, userID)
	if err != nil {
		return nil, err
	}

	out := make([]PaymentMethodResponse, 0, len(items))
	for _, pm := range items {
		out = append(out, toPMResponse(pm))
	}
	return out, nil
}

// --- Update ---

type UpdatePaymentMethodRequest struct {
	UserID string `json:"-"`
	ID     string `json:"-"`
	Type   string `json:"type"`
	Label  string `json:"label"`
	Color  string `json:"color"`
}

type UpdatePaymentMethodUseCase struct {
	repo domainPM.Repository
}

func NewUpdatePaymentMethodUseCase(repo domainPM.Repository) *UpdatePaymentMethodUseCase {
	return &UpdatePaymentMethodUseCase{repo: repo}
}

func (uc *UpdatePaymentMethodUseCase) Execute(ctx context.Context, req UpdatePaymentMethodRequest) error {
	pm := &domainPM.PaymentMethod{
		ID:     req.ID,
		UserID: req.UserID,
	}
	if err := pm.Update(req.Type, req.Label, req.Color); err != nil {
		return err
	}
	return uc.repo.Update(ctx, pm)
}

// --- Delete ---

type DeletePaymentMethodUseCase struct {
	repo domainPM.Repository
}

func NewDeletePaymentMethodUseCase(repo domainPM.Repository) *DeletePaymentMethodUseCase {
	return &DeletePaymentMethodUseCase{repo: repo}
}

func (uc *DeletePaymentMethodUseCase) Execute(ctx context.Context, userID, id string) error {
	return uc.repo.Delete(ctx, userID, id)
}

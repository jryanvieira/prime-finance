package auth

import (
	"context"

	domainUser "dash-fin/internal/domain/user"
)

// --- Get Me ---

type UserProfileResponse struct {
	ID                  string `json:"id"`
	Name                string `json:"name"`
	Email               string `json:"email"`
	OnboardingCompleted bool   `json:"onboarding_completed"`
}

type GetMeUseCase struct {
	userRepo domainUser.Repository
}

func NewGetMeUseCase(userRepo domainUser.Repository) *GetMeUseCase {
	return &GetMeUseCase{userRepo: userRepo}
}

func (uc *GetMeUseCase) Execute(ctx context.Context, userID string) (*UserProfileResponse, error) {
	u, err := uc.userRepo.GetByID(ctx, userID)
	if err != nil {
		return nil, err
	}
	return &UserProfileResponse{
		ID:                  u.ID,
		Name:                u.Name,
		Email:               u.Email.String(),
		OnboardingCompleted: u.OnboardingCompleted,
	}, nil
}

// --- Complete Onboarding ---

type CompleteOnboardingUseCase struct {
	userRepo domainUser.Repository
}

func NewCompleteOnboardingUseCase(userRepo domainUser.Repository) *CompleteOnboardingUseCase {
	return &CompleteOnboardingUseCase{userRepo: userRepo}
}

func (uc *CompleteOnboardingUseCase) Execute(ctx context.Context, userID string) error {
	return uc.userRepo.CompleteOnboarding(ctx, userID)
}

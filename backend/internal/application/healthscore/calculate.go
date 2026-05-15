package healthscore

import (
	"context"
	"time"

	domainBudget "dash-fin/internal/domain/budget"
	domainExpense "dash-fin/internal/domain/expense"
	domainGoal "dash-fin/internal/domain/goal"
	domainIncome "dash-fin/internal/domain/income"
	domainRE "dash-fin/internal/domain/recurringexpense"
	"dash-fin/pkg/timeutil"
)

type CalculateHealthScoreRequest struct {
	UserID string
}

type CalculateHealthScoreResponse struct {
	Score           int      `json:"score"`
	Level           string   `json:"level"`
	CommitmentRate  float64  `json:"commitment_rate"`
	SavingsRate     float64  `json:"savings_rate"`
	BudgetAdherence float64  `json:"budget_adherence"`
	GoalProgress    float64  `json:"goal_progress"`
	Insights        []string `json:"insights"`
}

type CalculateHealthScoreUseCase struct {
	expenseRepo   domainExpense.Repository
	incomeRepo    domainIncome.Repository
	budgetRepo    domainBudget.Repository
	recurringRepo domainRE.Repository
	goalRepo      domainGoal.Repository
	clock         timeutil.Clock
}

func NewCalculateHealthScoreUseCase(
	expenseRepo domainExpense.Repository,
	incomeRepo domainIncome.Repository,
	budgetRepo domainBudget.Repository,
	recurringRepo domainRE.Repository,
	goalRepo domainGoal.Repository,
	clock timeutil.Clock,
) *CalculateHealthScoreUseCase {
	return &CalculateHealthScoreUseCase{
		expenseRepo:   expenseRepo,
		incomeRepo:    incomeRepo,
		budgetRepo:    budgetRepo,
		recurringRepo: recurringRepo,
		goalRepo:      goalRepo,
		clock:         clock,
	}
}

func (uc *CalculateHealthScoreUseCase) Execute(
	ctx context.Context,
	req CalculateHealthScoreRequest,
) (*CalculateHealthScoreResponse, error) {
	now := uc.clock.Now().UTC()
	y, m, _ := now.Date()

	from := time.Date(y, m, 1, 0, 0, 0, 0, time.UTC).Format("2006-01-02")
	lastDay := time.Date(y, m+1, 0, 0, 0, 0, 0, time.UTC).Day()
	to := time.Date(y, m, lastDay, 0, 0, 0, 0, time.UTC).Format("2006-01-02")
	month := now.Format("2006-01")

	expenses, err := uc.expenseRepo.ListByDateRange(ctx, req.UserID, from, to)
	if err != nil {
		return nil, err
	}

	incomes, err := uc.incomeRepo.ListByDateRange(ctx, req.UserID, from, to)
	if err != nil {
		return nil, err
	}

	budgets, err := uc.budgetRepo.ListWithSpent(ctx, req.UserID, month)
	if err != nil {
		return nil, err
	}

	recurrings, err := uc.recurringRepo.List(ctx, req.UserID)
	if err != nil {
		return nil, err
	}

	goals, err := uc.goalRepo.List(ctx, req.UserID)
	if err != nil {
		return nil, err
	}

	// Totals
	var totalIncomeCents int64
	for _, inc := range incomes {
		totalIncomeCents += inc.AmountCents
	}

	var totalExpenseCents int64
	for _, exp := range expenses {
		totalExpenseCents += exp.AmountCents
	}

	var totalRecurringCents int64
	for _, re := range recurrings {
		totalRecurringCents += re.AmountCents
	}

	// Dimension 1: commitment rate (fixos / renda)
	var commitmentRate float64
	if totalIncomeCents == 0 {
		commitmentRate = 1.0
	} else {
		commitmentRate = float64(totalRecurringCents) / float64(totalIncomeCents)
	}

	// Dimension 2: budget adherence
	var budgetAdherence float64
	if len(budgets) == 0 {
		budgetAdherence = 1.0
	} else {
		var withinBudget int
		for _, bws := range budgets {
			if bws.SpentCents <= bws.Budget.AmountCents {
				withinBudget++
			}
		}
		budgetAdherence = float64(withinBudget) / float64(len(budgets))
	}

	// Dimension 3: savings rate
	var savingsRate float64
	if totalIncomeCents == 0 {
		savingsRate = 0.0
	} else {
		savingsRate = float64(totalIncomeCents-totalExpenseCents-totalRecurringCents) / float64(totalIncomeCents)
	}

	// Dimension 4: goal progress
	var goalProgress float64
	if len(goals) > 0 {
		var sum float64
		var count int
		for _, g := range goals {
			if g.TargetAmountCents == 0 {
				continue
			}
			progress := float64(g.CurrentAmountCents) / float64(g.TargetAmountCents)
			sum += progress
			count++
		}
		if count > 0 {
			goalProgress = sum / float64(count)
		}
	}

	// Score final
	score := int((1.0-clamp(commitmentRate))*0.4*100 +
		clamp(budgetAdherence)*0.3*100 +
		clamp(savingsRate)*0.2*100 +
		clamp(goalProgress)*0.1*100)

	if score < 0 {
		score = 0
	}
	if score > 100 {
		score = 100
	}

	return &CalculateHealthScoreResponse{
		Score:           score,
		Level:           scoreLevel(score),
		CommitmentRate:  clamp(commitmentRate),
		SavingsRate:     clamp(savingsRate),
		BudgetAdherence: clamp(budgetAdherence),
		GoalProgress:    clamp(goalProgress),
		Insights:        generateInsights(commitmentRate, savingsRate, budgetAdherence, goalProgress, score),
	}, nil
}

func clamp(v float64) float64 {
	if v < 0 {
		return 0
	}
	if v > 1 {
		return 1
	}
	return v
}

func scoreLevel(score int) string {
	switch {
	case score <= 25:
		return "crítico"
	case score <= 50:
		return "atenção"
	case score <= 75:
		return "ok"
	default:
		return "ótimo"
	}
}

func generateInsights(commitmentRate, savingsRate, budgetAdherence, goalProgress float64, score int) []string {
	var insights []string

	if commitmentRate > 0.7 {
		insights = append(insights, "Mais de 70% da sua renda está comprometida com despesas fixas.")
	}

	if savingsRate < 0.1 {
		insights = append(insights, "Sua taxa de poupança está abaixo de 10%.")
	}

	if budgetAdherence < 0.5 {
		insights = append(insights, "Mais da metade das suas categorias com orçamento estão estouradas.")
	}

	if goalProgress < 0.3 {
		insights = append(insights, "Suas metas financeiras estão com progresso abaixo de 30%.")
	}

	if score >= 76 {
		insights = append(insights, "Suas finanças estão em ótima forma este mês.")
	}

	if len(insights) == 0 {
		insights = append(insights, "Continue acompanhando suas finanças para manter a saúde financeira.")
	}

	return insights
}

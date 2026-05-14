package http

import (
	"net/http"
	"time"

	"dash-fin/internal/application/auth"
	appAlert "dash-fin/internal/application/alert"
	appBudget "dash-fin/internal/application/budget"
	appCashflow "dash-fin/internal/application/cashflow"
	appCategory "dash-fin/internal/application/category"
	appExpense "dash-fin/internal/application/expense"
	appGoal "dash-fin/internal/application/goal"
	appIncome "dash-fin/internal/application/income"
	appPM "dash-fin/internal/application/paymentmethod"
	appRE "dash-fin/internal/application/recurringexpense"

	"github.com/go-chi/chi/v5"
	"github.com/go-chi/chi/v5/middleware"
	"github.com/go-chi/cors"
)

// RouterDeps contains all dependencies for the HTTP router.
type RouterDeps struct {
	// Auth
	SignupUC             *auth.SignupUseCase
	LoginUC              *auth.LoginUseCase
	RefreshUC            *auth.RefreshUseCase
	LogoutUC             *auth.LogoutUseCase
	GetMeUC              *auth.GetMeUseCase
	CompleteOnboardingUC *auth.CompleteOnboardingUseCase

	// Expense
	CreateExpenseUC      *appExpense.CreateExpenseUseCase
	ListExpensesUC       *appExpense.ListExpensesUseCase
	UpdateExpenseUC      *appExpense.UpdateExpenseUseCase
	DeleteExpenseUC      *appExpense.DeleteExpenseUseCase
	DeleteInstGroupUC    *appExpense.DeleteInstallmentGroupUseCase
	ImportCSVUC          *appExpense.ImportCSVUseCase
	MonthExpensesUC      *appExpense.MonthExpensesUseCase
	ExportCSVUC          *appExpense.ExportCSVUseCase
	CategorySummaryUC    *appExpense.CategorySummaryUseCase

	// Income
	CreateIncomeUC *appIncome.CreateIncomeUseCase
	ListIncomesUC  *appIncome.ListIncomesUseCase
	UpdateIncomeUC *appIncome.UpdateIncomeUseCase
	DeleteIncomeUC *appIncome.DeleteIncomeUseCase

	// Category
	ListCategoriesUC  *appCategory.ListCategoriesUseCase
	CreateCategoryUC  *appCategory.CreateCategoryUseCase
	DeleteCategoryUC  *appCategory.DeleteCategoryUseCase

	// PaymentMethod
	CreatePMUC *appPM.CreatePaymentMethodUseCase
	ListPMUC   *appPM.ListPaymentMethodsUseCase
	UpdatePMUC *appPM.UpdatePaymentMethodUseCase
	DeletePMUC *appPM.DeletePaymentMethodUseCase

	// RecurringExpense
	CreateREUC *appRE.CreateRecurringExpenseUseCase
	ListREUC   *appRE.ListRecurringExpensesUseCase
	UpdateREUC *appRE.UpdateRecurringExpenseUseCase
	DeleteREUC *appRE.DeleteRecurringExpenseUseCase

	// Auth middleware
	TokenService auth.TokenService

	// For month handler: needs recurring + income repos directly
	RecurringListUC *appRE.ListRecurringExpensesUseCase
	IncomeListUC    *appIncome.ListIncomesUseCase

	// Budgets
	ListBudgetsUC   *appBudget.ListBudgetsUseCase
	UpsertBudgetUC  *appBudget.UpsertBudgetUseCase
	DeleteBudgetUC  *appBudget.DeleteBudgetUseCase

	// Cashflow
	CashflowUC       *appCashflow.CashflowUseCase
	MonthlySummaryUC *appCashflow.MonthlySummaryUseCase

	// CategoryHistory
	CategoryHistoryUC *appExpense.CategoryHistoryUseCase

	// Alerts
	ListAlertsUC *appAlert.ListAlertsUseCase

	// Goals
	ListGoalsUC       *appGoal.ListGoalsUseCase
	CreateGoalUC      *appGoal.CreateGoalUseCase
	UpdateGoalUC      *appGoal.UpdateGoalUseCase
	ContributeGoalUC  *appGoal.ContributeGoalUseCase
	DeleteGoalUC      *appGoal.DeleteGoalUseCase

	// Config
	AllowedOrigins []string
	AccessTTL      time.Duration
	RefreshTTL     time.Duration
	CookieSecure   bool
}

type Router struct {
	*chi.Mux
}

func NewRouter(deps RouterDeps) *Router {
	r := chi.NewRouter()

	r.Use(middleware.RequestID)
	r.Use(middleware.RealIP)
	r.Use(middleware.Recoverer)
	r.Use(middleware.Timeout(60 * time.Second))
	r.Use(cors.Handler(cors.Options{
		AllowedOrigins:   deps.AllowedOrigins,
		AllowedMethods:   []string{"GET", "POST", "PATCH", "DELETE", "OPTIONS"},
		AllowedHeaders:   []string{"Accept", "Authorization", "Content-Type"},
		ExposedHeaders:   []string{"Link"},
		AllowCredentials: false,
		MaxAge:           300,
	}))

	r.Get("/healthz", func(w http.ResponseWriter, _ *http.Request) {
		w.WriteHeader(http.StatusOK)
		_, _ = w.Write([]byte("ok"))
	})

	authHandler := newAuthHandler(deps)
	expenseHandler := newExpenseHandler(deps)
	incomeHandler := newIncomeHandler(deps)
	categoryHandler := newCategoryHandler(deps)
	pmHandler := newPaymentMethodHandler(deps)
	reHandler := newRecurringExpenseHandler(deps)
	importHandler := newImportHandler(deps)
	monthHandler := newMonthHandler(deps)
	exportHandler := newExportHandler(deps)
	budgetHandler := newBudgetHandler(deps)
	goalHandler := newGoalHandler(deps)
	userHandler := newUserHandler(deps)
	alertHandler := newAlertHandler(deps)
	cashflowHandler := newCashflowHandler(deps)

	r.Route("/v1", func(r chi.Router) {
		// Auth routes (no auth required)
		r.Route("/auth", func(r chi.Router) {
			r.Post("/signup", authHandler.handleSignup)
			r.Post("/login", authHandler.handleLogin)
			r.Post("/refresh", authHandler.handleRefresh)
			r.Post("/logout", authHandler.handleLogout)
		})

		// Protected routes
		r.Group(func(r chi.Router) {
			r.Use(RequireAuth(deps.TokenService))

			r.Route("/payment-methods", func(r chi.Router) {
				r.Post("/", pmHandler.handleCreate)
				r.Get("/", pmHandler.handleList)
				r.Patch("/{id}", pmHandler.handleUpdate)
				r.Delete("/{id}", pmHandler.handleDelete)
			})

			r.Route("/expenses", func(r chi.Router) {
				r.Post("/", expenseHandler.handleCreate)
				r.Get("/", expenseHandler.handleList)
				r.Patch("/{id}", expenseHandler.handleUpdate)
				r.Delete("/{id}", expenseHandler.handleDelete)
			})

			r.Route("/recurring-expenses", func(r chi.Router) {
				r.Post("/", reHandler.handleCreate)
				r.Get("/", reHandler.handleList)
				r.Patch("/{id}", reHandler.handleUpdate)
				r.Delete("/{id}", reHandler.handleDelete)
			})

			r.Route("/incomes", func(r chi.Router) {
				r.Post("/", incomeHandler.handleCreate)
				r.Get("/", incomeHandler.handleList)
				r.Patch("/{id}", incomeHandler.handleUpdate)
				r.Delete("/{id}", incomeHandler.handleDelete)
			})

			r.Route("/categories", func(r chi.Router) {
				r.Get("/", categoryHandler.handleList)
				r.Post("/", categoryHandler.handleCreate)
				r.Delete("/{id}", categoryHandler.handleDelete)
			})

			r.Get("/users/me", userHandler.handleGetMe)
			r.Patch("/users/me/onboarding", userHandler.handleCompleteOnboarding)

			r.Route("/budgets", func(r chi.Router) {
				r.Get("/", budgetHandler.handleList)
				r.Put("/", budgetHandler.handleUpsert)
				r.Delete("/{id}", budgetHandler.handleDelete)
			})

			r.Route("/goals", func(r chi.Router) {
				r.Get("/", goalHandler.handleList)
				r.Post("/", goalHandler.handleCreate)
				r.Put("/{id}", goalHandler.handleUpdate)
				r.Post("/{id}/contribute", goalHandler.handleContribute)
				r.Delete("/{id}", goalHandler.handleDelete)
			})

			r.Get("/cashflow", cashflowHandler.handleGet)
			r.Get("/months/{month}/summary", cashflowHandler.handleMonthlySummary)
			r.Get("/categories/history", expenseHandler.handleCategoryHistory)
			r.Get("/alerts", alertHandler.handleListAlerts)
			r.Post("/import/csv", importHandler.handleImportCSV)
			r.Get("/export/csv", exportHandler.handleExportCSV)
			r.Get("/months/{month}/expenses", monthHandler.handleMonthExpenses)
			r.Get("/months/{month}/category-summary", monthHandler.handleCategorySummary)
			r.Delete("/installment-groups/{group_id}", expenseHandler.handleDeleteInstallmentGroup)
		})
	})

	return &Router{Mux: r}
}

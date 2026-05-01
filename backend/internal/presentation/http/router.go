package http

import (
	"net/http"
	"time"

	"dash-fin/internal/application/auth"
	appCategory "dash-fin/internal/application/category"
	appExpense "dash-fin/internal/application/expense"
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
	SignupUC  *auth.SignupUseCase
	LoginUC   *auth.LoginUseCase
	RefreshUC *auth.RefreshUseCase
	LogoutUC  *auth.LogoutUseCase

	// Expense
	CreateExpenseUC      *appExpense.CreateExpenseUseCase
	ListExpensesUC       *appExpense.ListExpensesUseCase
	UpdateExpenseUC      *appExpense.UpdateExpenseUseCase
	DeleteExpenseUC      *appExpense.DeleteExpenseUseCase
	DeleteInstGroupUC    *appExpense.DeleteInstallmentGroupUseCase
	ImportCSVUC          *appExpense.ImportCSVUseCase
	MonthExpensesUC      *appExpense.MonthExpensesUseCase

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

	// Config
	AllowedOrigins []string
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

			r.Post("/import/csv", importHandler.handleImportCSV)
			r.Get("/months/{month}/expenses", monthHandler.handleMonthExpenses)
			r.Delete("/installment-groups/{group_id}", expenseHandler.handleDeleteInstallmentGroup)
		})
	})

	return &Router{Mux: r}
}

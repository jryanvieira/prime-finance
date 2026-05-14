# DDD Expert — Go

Guia de referência para decisões arquiteturais DDD neste projeto Go.
Consulte antes de qualquer design de feature.

---

## Estrutura de packages

```
internal/
├── domain/[contexto]/
│   ├── [entidade].go      ← aggregate root ou entidade
│   ├── repository.go      ← interface do repositório (nunca implementação)
│   └── errors.go          ← erros de domínio tipados
├── application/[contexto]/
│   └── [usecase].go       ← um arquivo por caso de uso
├── infrastructure/
│   └── repositories/sqlite/
│       └── [contexto]_repository.go
└── presentation/http/
    └── handler_[contexto].go
```

**Regra absoluta:** domínio não importa nada de application, infra ou presentation. O fluxo de dependência é sempre de fora para dentro.

---

## Aggregates e Entities

- Aggregate root é a única porta de entrada para mutações do aggregate
- Construtor com `New[Entidade](...)` valida invariantes e retorna `(*Entidade, error)`
- Reconstrução a partir do banco usa `Reconstruct[Entidade](...)` — sem validação, sem hash
- Campos opcionais usam ponteiros (`*string`, `*int64`), nunca zero values ambíguos

```go
// Correto
func NewExpense(userID, date, description string, amountCents int64) (*Expense, error) {
    if description == "" { return nil, ErrEmptyDescription }
    if amountCents <= 0  { return nil, ErrInvalidAmount }
    // ...
}

// Errado: validação fora do domínio, no use case ou handler
```

---

## Value Objects

- Tipos com semântica própria: `Email`, `Money` (representado como `int64` centavos)
- Imutáveis: não têm setters, apenas construtores validados
- Comparados por valor, não por referência
- Dinheiro SEMPRE em centavos (`int64`), nunca `float64`

```go
// Correto
type Email string
func NewEmail(s string) (Email, error) { ... }

// Correto — dinheiro
AmountCents int64  // 1500 = R$ 15,00

// Errado
Amount float64     // nunca
```

---

## Repositórios

- Interface declarada no **domínio**, implementação na **infra**
- Métodos recebem `context.Context` como primeiro argumento sempre
- Retornam erros de domínio (ex: `ErrExpenseNotFound`), nunca erros de SQL diretos
- O repositório SQLite mapeia `sql.NullString` etc. para ponteiros do domínio

```go
// No domínio
type Repository interface {
    Create(ctx context.Context, e *Expense) error
    GetByID(ctx context.Context, userID, id string) (*Expense, error)
}

// Na infra — traduz sql.ErrNoRows para ErrExpenseNotFound
if errors.Is(err, sql.ErrNoRows) {
    return nil, expense.ErrExpenseNotFound
}
```

---

## Use Cases

- Um arquivo por caso de uso (`create.go`, `list.go`, `delete.go`)
- Struct com dependências injetadas via construtor
- Método `Execute(ctx, request)` — sempre recebe e retorna tipos locais do package application
- Nunca importa tipos de presentation (handlers) ou infra (sqlite)
- DTOs de request/response definidos no mesmo arquivo do use case

```go
type CreateExpenseUseCase struct {
    repo domainExpense.Repository
}

func (uc *CreateExpenseUseCase) Execute(ctx context.Context, req CreateExpenseRequest) (interface{}, error) {
    // orquestra domínio, não contém lógica de negócio
}
```

---

## Erros de Domínio

- Cada contexto tem seu `errors.go` com `var Err... = errors.New("...")`
- O handler HTTP mapeia erros de domínio para status codes
- Nunca retorne strings de erro crus para o cliente

```go
// domain/expense/errors.go
var (
    ErrExpenseNotFound    = errors.New("expense: not found")
    ErrEmptyDescription   = errors.New("expense: empty description")
    ErrInvalidAmount      = errors.New("expense: invalid amount")
    ErrInvalidInstallments = errors.New("expense: installments must be >= 2")
)
```

---

## Domain Events

- Interfaces em `pkg/events/` já estão definidas (`Event`, `EventHandler`, `EventDispatcher`)
- Aggregates podem acumular eventos em slice interno e expô-los após mutação
- Ainda não há dispatcher implementado — ao adicionar eventos, implemente junto

```go
// Padrão a seguir quando implementar
type Expense struct {
    // ...
    events []events.Event
}
func (e *Expense) DomainEvents() []events.Event { return e.events }
func (e *Expense) ClearEvents() { e.events = nil }
```

---

## Bounded Contexts deste projeto

| Contexto | Aggregate Root | Observação |
|---|---|---|
| Identity | `User` | Email é value object |
| Expense | `Expense` | Suporta parcelamentos via `InstallmentGroup` |
| Income | `Income` | — |
| Budget | `Budget` | Upsert por categoria/período |
| Goal | `Goal` | Tem operação `Contribute` |
| Category | `Category` | Gerenciada pelo usuário |
| PaymentMethod | `PaymentMethod` | — |
| RecurringExpense | `RecurringExpense` | Usado no cálculo de cashflow |

---

## Checklist de validação de design

Antes de aprovar qualquer decisão arquitetural, verifique:

- [ ] O domínio importa apenas stdlib e `github.com/google/uuid`?
- [ ] Validações de invariantes estão no construtor do aggregate?
- [ ] Erros de domínio estão em `errors.go` do próprio contexto?
- [ ] A interface do repositório está no pacote de domínio?
- [ ] O use case não tem lógica de negócio (só orquestra)?
- [ ] Dinheiro está em centavos (`int64`)?
- [ ] Novos campos opcionais usam ponteiros?

---

## Anti-patterns a evitar

| Anti-pattern | Por quê é errado | Como fazer certo |
|---|---|---|
| Lógica de negócio no handler | Viola separação de camadas | Mova para o use case ou domínio |
| Importar `database/sql` no domínio | Cria dependência de infra no domínio | Use interface de repositório |
| `float64` para dinheiro | Imprecisão de ponto flutuante | Use `int64` centavos |
| Validação no repositório | Invariantes pertencem ao domínio | Valide no construtor do aggregate |
| Use case fazendo múltiplas responsabilidades | Dificulta teste e manutenção | Um arquivo, um caso de uso |
| Erros genéricos (`errors.New("not found")`) | Impossível distinguir entre contextos | Erros nomeados por contexto |

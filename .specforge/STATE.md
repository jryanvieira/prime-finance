# Project State — prime-finance

_Persistent memory. Updated by REVIEW after each PR. Read by all agents before executing._

---

## Decisions

### AD-001: SQLite como banco principal

**Date:** 2026-01-01
**Context:** Projeto pessoal, usuário único, sem necessidade de escala
**Decision:** SQLite via modernc.org/sqlite (pure Go, sem CGO)
**Rationale:** Zero setup operacional, backup simples via cópia de arquivo
**Consequences:** Não usar features PostgreSQL-specific; migrations em SQL puro

### AD-002: Composição manual no main.go

**Date:** 2026-01-01
**Context:** Projeto pequeno, preferência por explicitude
**Decision:** Sem container de DI (sem wire/fx) — todas as dependências injetadas manualmente
**Rationale:** Visibilidade total do grafo de dependências, sem magia
**Consequences:** main.go cresce com o projeto; aceitável para escopo atual

### AD-003: Dinheiro sempre em centavos int64

**Date:** 2026-01-01
**Context:** Valores financeiros precisam de precisão exata
**Decision:** Todos os campos monetários são `int64` representando centavos
**Rationale:** Evita imprecisão de ponto flutuante em operações financeiras
**Consequences:** R$ 10,50 é armazenado e transmitido como 1050; frontend converte para display

### AD-004: Datas de transação como string YYYY-MM-DD

**Date:** 2026-01-01
**Context:** Datas de despesas/receitas não têm horário, apenas data
**Decision:** Usar `string` com formato `"YYYY-MM-DD"` em vez de `time.Time`
**Rationale:** Elimina complexidade de timezone em datas sem horário
**Consequences:** Comparações de data feitas como string (lexicográfico funciona com ISO 8601)

---

## Blockers

_Nenhum blocker ativo no momento._

---

## Lessons

### L-001: Interface Mailer não pode ser duplicada

**Date:** 2026-05-16
**Category:** Architecture
**Error:** Interface `Mailer` declarada em dois lugares (pkg/mailer e infrastructure/mailer)
**Why it's wrong:** Duplicação de interface causa conflito de tipos e viola DRY
**Correct approach:**
```go
// Interface declarada UMA VEZ em pkg/mailer/mailer.go
// Implementação em internal/infrastructure/mailer/resend.go
// Implementação implementa pkg/mailer.Mailer
```
**Area:** pkg/mailer, infrastructure/mailer

### L-002: Intl deve ser constante de módulo no frontend

**Date:** 2026-05-16
**Category:** CodeQuality
**Error:** `new Intl.NumberFormat(...)` instanciado dentro de funções chamadas frequentemente
**Why it's wrong:** Cria nova instância a cada chamada; Intl é pesado para instanciar
**Correct approach:**
```typescript
// Correto — constante de módulo, instanciada uma vez
const CURRENCY_FORMATTER = new Intl.NumberFormat('pt-BR', {
  style: 'currency',
  currency: 'BRL',
});

export function formatCurrency(cents: number): string {
  return CURRENCY_FORMATTER.format(cents / 100);
}
```
**Area:** frontend/lib/format.ts

### L-003: http.Client precisa de timeout

**Date:** 2026-05-16
**Category:** Performance
**Error:** `http.Client{}` criado sem timeout configurado
**Why it's wrong:** Requisições externas podem travar indefinidamente sem timeout
**Correct approach:**
```go
client := &http.Client{
    Timeout: 30 * time.Second,
}
```
**Area:** Qualquer lugar que cria http.Client para chamadas externas

---

## Deferred Ideas

- [ ] 2026-05-16 Relatórios comparativos mês a mês — capturado durante discussão de roadmap
- [ ] 2026-05-16 Tags em despesas para classificação adicional além de categoria

---

## Todos

- [ ] Revisar cobertura de testes no bounded context Goal
- [ ] Adicionar índices SQLite para queries de listagem por usuário + período

---

## Preferences

- Sempre mostrar o grafo de execução antes de iniciar a fase EXECUTE
- Testes de integração usam SQLite in-memory real, não mocks de banco

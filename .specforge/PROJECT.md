# prime-finance

## Vision

Dashboard financeiro pessoal para controle completo de despesas, receitas, orçamentos e metas.

## Goals

- Registrar e categorizar despesas (únicas, parceladas e recorrentes)
- Registrar receitas
- Acompanhar orçamentos por categoria
- Gerenciar metas financeiras com contribuições
- Visualizar fluxo de caixa mensal
- Importar extratos do Nubank via CSV
- Exportar despesas em CSV

## Non-Goals

- Multi-usuário / multi-tenant (projeto pessoal, usuário único)
- Integração bancária automática (Open Finance)
- Investimentos e carteira

## Stack

| Componente | Tecnologia |
|---|---|
| Linguagem | Go 1.25 |
| Framework web | Chi v5 |
| Banco de dados | SQLite (modernc.org/sqlite) |
| Autenticação | JWT (golang-jwt/jwt/v5) |
| Senha | bcrypt |
| Frontend | Next.js · TypeScript · Tailwind · shadcn/ui |
| Deploy | Fly.io |

## Constraints

- SQLite como banco — sem PostgreSQL sem decisão explícita
- Sem container de DI — composição manual no main.go
- Dinheiro sempre em centavos int64 — nunca float64
- Migrations em SQL puro — sem ORM

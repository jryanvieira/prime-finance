# Agent Review — Análise de PR em 4 Perspectivas

Você analisa o PR em 4 perspectivas paralelas e alimenta o sistema de aprendizado.

## Antes de começar

1. Leia `.claude/skills/ddd-expert.md`
2. Leia `.claude/skills/project-expert.md`
3. Leia `.claude/skills/lessons-learned.md`
4. Busque o PR no GitHub via MCP ou `gh pr view [número]`
5. Liste os arquivos modificados: `gh pr diff [número]`

## As 4 perspectivas de análise

Execute as 4 análises e consolide antes de comentar no PR.

### 1. Qualidade Go

- Idiomatismo: nomes de variáveis, uso de interfaces, tratamento de erros
- Erros ignorados (`_ = err` ou erros não verificados)
- Goroutines: vazamentos, race conditions, uso correto de `context`
- Código desnecessariamente complexo que poderia ser mais simples
- Imports organizados (stdlib → externos → internos)

### 2. DDD

- Bounded contexts respeitados — domínio não importa infra?
- Lógica de negócio está no domínio, não no use case ou handler?
- Novos construtores validam invariantes?
- Erros de domínio tipados no `errors.go` do contexto?
- Repositório como interface no domínio, implementação na infra?
- Dinheiro em centavos (`int64`)?

### 3. Performance

- Alocações desnecessárias em loops (ex: `append` sem `make` com capacidade)
- Queries N+1 (múltiplas queries dentro de loop)
- Ausência de `rows.Close()` ou `defer` em recursos
- Timestamps `time.Now()` sem `.UTC()`

### 4. Segurança

- Inputs do usuário sendo usados diretamente em queries? (SQL injection)
- Dados sensíveis expostos em logs ou respostas
- JWT validado corretamente no middleware?
- `user_id` sempre sendo verificado nas queries (isolamento multi-tenant)?
- Errors retornando informação interna para o cliente?

## Formato de comentário no PR

Para cada problema encontrado:
```
**[Categoria: Go | DDD | Performance | Segurança]**
Arquivo: `path/to/file.go:linha`

**Problema:** descrição do que está errado
**Por quê:** explicação técnica
**Sugestão:**
```go
// código correto
```
```

## Loop de aprendizado (obrigatório)

Para cada erro ou gap encontrado, registre em `.claude/skills/lessons-learned.md`:

```markdown
## YYYY-MM-DD — [Go | DDD | Performance | Segurança]
**Erro**: [o que foi feito errado]
**Por quê está errado**: [explicação técnica]
**Como fazer certo**: [exemplo de código correto]
**Bounded context afetado**: [nome ou "geral"]
```

**Este registro é obrigatório** — é o mecanismo que impede que o mesmo erro se repita.

## Comandos para interagir com o PR

```powershell
# Ver diff completo
gh pr diff [número]

# Adicionar comentário geral
gh pr review [número] --comment --body "[comentário]"

# Adicionar comentário em linha específica (via MCP github)
mcp github create_pull_request_review

# Aprovar após revisão sem problemas
gh pr review [número] --approve --body "LGTM"
```

## Condição de conclusão

O Review conclui quando:
- Todas as 4 perspectivas foram analisadas
- Comentários foram adicionados ao PR para cada problema
- `lessons-learned.md` foi atualizado com todos os erros encontrados
- O usuário foi notificado com o resumo da revisão

# Agent PR — Abertura de Pull Request no GitHub

Você consolida o trabalho de uma feature e abre o Pull Request no GitHub.

## Antes de começar

1. Confirme que todas as worktrees foram mergeadas: `git-wt list` deve retornar vazio
2. Confirme que os testes passam na branch atual: `cd backend && go test ./...`
3. Leia a spec aprovada no Obsidian para extrair os critérios de aceite
4. Leia o issue no Linear via MCP para o link correto

## Checklist pré-PR

- [ ] `git-wt list` retorna vazio (sem worktrees ativas)
- [ ] `go test ./...` passa sem falhas
- [ ] Branch está atualizada com `main`
- [ ] Commits têm mensagens descritivas com referência ao Linear

## Formato da descrição do PR

```markdown
## O que foi feito

[Resumo em 2-3 linhas do que a feature entrega]

## Issue Linear

[LINEAR-XX](https://linear.app/...)

## Spec

[Link para o arquivo no Obsidian — copie o caminho relativo]

## Mudanças por bounded context

- **[Contexto]**: [o que mudou]
- **[Contexto]**: [o que mudou]

## Como testar

1. [Passo a passo concreto]
2. [Endpoint/fluxo específico]

## Critérios de aceite

- [ ] [Da spec: dado X, quando Y, então Z]
- [ ] [Da spec: dado X, quando Y, então Z]

## Checklist técnico

- [ ] Testes passando: `go test ./...`
- [ ] Sem imports de infra no domínio
- [ ] Dinheiro em centavos (`int64`)
- [ ] Erros de domínio tipados
```

## Comando para abrir o PR

```powershell
gh pr create `
  --title "feat(LINEAR-XX): [título conciso]" `
  --body "[descrição no formato acima]" `
  --base main
```

## Após abrir o PR

1. Anote a URL do PR
2. Atualize o issue no Linear com o link do PR:
   ```
   mcp linear save_issue: { id: "LINEAR-XX", description: "... \n\n**PR:** [url]" }
   ```
3. Notifique o usuário com a URL do PR para revisão final

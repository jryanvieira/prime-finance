# Agent PR — Abertura de Pull Request no GitHub

Você consolida o trabalho de uma feature, captura evidências via Chrome MCP e abre o Pull Request no GitHub.

## Antes de começar

1. Confirme que está na branch de task correta (nunca abrir PR da main para main)
2. Confirme que os testes passam: `cd backend && go test ./...`
3. Leia a spec aprovada no Obsidian para extrair os critérios de aceite
4. Leia o issue no Linear via MCP para o link correto

## Checklist pré-PR

- [ ] Branch de task ativa (ex: `task/ZEM-XX-nome`)
- [ ] `go test ./...` passa sem falhas
- [ ] Branch atualizada com `main` (git merge main ou rebase)
- [ ] Commits têm mensagens descritivas com referência ao Linear

## Evidências com Chrome MCP (obrigatório)

Antes de abrir o PR, capture screenshots dos endpoints entregues:

```
1. Suba o servidor: ACCESS_TOKEN_SECRET=... go run ./cmd/api
2. Crie um usuário de teste e obtenha token JWT
3. Para cada endpoint entregue pela task:
   a. Navegue via mcp__puppeteer__puppeteer_navigate
   b. Execute fetch() via mcp__puppeteer__puppeteer_evaluate
   c. Capture screenshot via mcp__puppeteer__puppeteer_screenshot
4. Salve os screenshots localmente para anexar ao PR
```

### Script padrão de evidência (copie e adapte)

```javascript
// Rodar via mcp__puppeteer__puppeteer_evaluate
(async () => {
  const token = "<JWT_TOKEN>";
  const endpoints = [
    { name: "GET /v1/seu-endpoint (ZEM-XX)", url: "/v1/seu-endpoint", auth: true, expectOk: true },
    { name: "GET /v1/seu-endpoint sem token → 401", url: "/v1/seu-endpoint", auth: false, expectOk: false },
  ];

  const results = [];
  for (const ep of endpoints) {
    const headers = ep.auth ? { Authorization: `Bearer ${token}` } : {};
    const r = await fetch(ep.url, { headers });
    const body = await r.text();
    results.push({ ...ep, status: r.status, body: body.substring(0, 400),
      passed: ep.expectOk ? r.status < 400 : r.status >= 400 });
  }

  const passed = results.filter(r => r.passed).length;
  // Renderizar HTML de evidência...
  return passed + "/" + results.length + " passed";
})()
```

## Formato da descrição do PR

```markdown
## O que foi feito

[Resumo em 2-3 linhas do que a feature entrega]

## Issue Linear

[ZEM-XX](https://linear.app/zempidesenvolvimento/issue/ZEM-XX)

## Mudanças por bounded context

- **[Contexto]**: [o que mudou]

## Como testar

1. [Passo a passo concreto]
2. [Endpoint/fluxo específico]

## Critérios de aceite

- [ ] [Da spec: dado X, quando Y, então Z]

## Evidências

![Testes API](screenshot_path_ou_url)

## Checklist técnico

- [ ] `go test ./...` passando
- [ ] Sem imports de infra no domínio
- [ ] Dinheiro em centavos (`int64`)
- [ ] Erros de domínio tipados
- [ ] Endpoints testados manualmente (evidências acima)
```

## Comando para abrir o PR

```powershell
gh pr create `
  --title "feat(ZEM-XX): [título conciso]" `
  --body "[descrição no formato acima]" `
  --base main `
  --head task/ZEM-XX-nome
```

## Após abrir o PR

1. Anote a URL do PR
2. Atualize o issue no Linear com o link do PR e status "In Review":
   ```
   mcp linear save_issue: { id: "ZEM-XX", state: "In Review", description: "... \n\n**PR:** [url]" }
   ```
3. Adicione screenshots como comentário no PR via MCP GitHub:
   ```
   mcp__github__add_issue_comment: { owner, repo, issue_number, body: "## Evidências\n\n![screenshot](...)" }
   ```
4. Notifique o usuário com a URL do PR para revisão final

> **NUNCA** faça merge do PR — isso é responsabilidade do usuário após revisão.

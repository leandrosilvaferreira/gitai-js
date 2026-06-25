# gitai-js

> Project memory for Claude Code. Keep this file short and high-signal —
> bloated memory gets ignored. Put hard guarantees in hooks, not prose.

## Stack

TypeScript, JavaScript · npm

Architecture: **layered**.

## Canonical commands

Always use these exact commands (do not guess):

- **Install:** `npm install`
- **Lint:** `npm run lint`
- **Format:** `npm run format`
- **Typecheck:** `npx tsc --noEmit`
- **Test:** `npm run test`
- **Build:** `npm run build`
- **Run/Dev:** `npm run dev`

> **Testes:** `node:test` — rode `npm run test`. Escreva testes unitários para **toda** função nova ou módulo adicionado; nunca declare trabalho concluído sem testes passando.

## Workflow & Agents

Toda implementação não-trivial: invoke `superpowers:subagent-driven-development`.
Ao despachar subagentes, você DEVE usar o agente especialista correspondente da tabela abaixo — nunca o agente genérico quando um especialista estiver listado. Cruze o tipo da tarefa com a coluna "When to use" e passe o nome exato como `subagent_type`.

| Agent                    | When to use                                                                                                        |
| ------------------------ | ------------------------------------------------------------------------------------------------------------------ |
| `orchestrator`           | tarefas multi-agente ou cross-domain — despache ESTE para subdelegar; nunca despache agentes genéricos diretamente |
| `code-reviewer`          | revisão após qualquer mudança de código                                                                            |
| `security-reviewer`      | revisão de segurança antes de merge                                                                                |
| `typescript-reviewer`    | revisão código TypeScript/JavaScript                                                                               |
| `qa-automation-engineer` | E2E, automação de QA, Playwright/Cypress                                                                           |
| `test-engineer`          | unit tests, integração, cobertura de código                                                                        |
| `database-architect`     | schema, migrations, queries, modelagem de dados                                                                    |
| `devops-engineer`        | deploy, CI/CD, infra, produção                                                                                     |
| `backend-specialist`     | API, lógica server-side, integração com banco                                                                      |
| `performance-optimizer`  | otimização de performance, profiling                                                                               |
| `product-manager`        | decisões de produto, priorização, roadmap                                                                          |
| `product-owner`          | refinamento de backlog, critérios de aceite                                                                        |
| `project-planner`        | planejamento de features, decomposição de tarefas                                                                  |
| `code-archaeologist`     | entender código legado, refatoração                                                                                |
| `debugger`               | depuração de bugs complexos, root cause analysis                                                                   |
| `explorer-agent`         | exploração de codebase desconhecida, mapeamento                                                                    |
| `documentation-writer`   | apenas quando documentação explicitamente solicitada                                                               |
| `penetration-tester`     | pentest, vulnerabilidades, segurança ofensiva                                                                      |
| `security-auditor`       | auditoria de segurança, SAST, revisão defensiva                                                                    |

### Superpowers Skills → Especialistas do Projeto (Bridging Obrigatório)

Skills do superpowers (`dispatching-parallel-agents`, `subagent-driven-development`, `executing-plans`, `systematic-debugging`) usam `general-purpose` como tipo padrão nos exemplos. **NUNCA usar `general-purpose`** quando existe especialista cobrindo o domínio — substituir sempre pelo da tabela acima.

> Fundamento: o próprio superpowers declara que "User's explicit instructions (CLAUDE.md) — highest priority". Esta seção aplica essa prioridade sobre os tipos de agente sugeridos pelos skills.

**Fluxo correto com superpowers:**

1. Skill identifica domínios independentes → principal mapeia cada um ao especialista da tabela
2. Despacha com `subagent_type: "<especialista>"` no Agent tool
3. Integra resultados normalmente

## Architecture map

CLI (`gitai`) que gera commits Convencionais via IA. Fluxo single-pass; sem estado em disco além de `~/.gitai`.

- `src/index.ts` — entrypoint Commander. Orquestra: carrega config (ou roda setup) → `chdir` p/ projeto-alvo → detecta mudanças → gera diff → pede mensagem à IA → commita → `git pull` → re-commita pós-pull → push opcional (`--push`).
- `src/services/ai.ts` — `AIService`: única abstração sobre OpenAI/Groq/Anthropic. Expõe `generateCommitMessage()` e `generateReleaseNotes()`; concentra o prompt engineering. Consome `logger`.
- `src/utils/git.ts` — toda interação git via `execa` (`runGitCommand`). `getDiffWithNewFiles()` faz staging antes do diff; `getDeletedFiles()`, detecção de conflito bilíngue (EN+PT), commit por arquivo temporário.
- `src/utils/config.ts` — config global `~/.gitai` (mode `0o600`), parser key=value, campos LANGUAGE/PROVIDER/API_KEY/MODEL; `validateNodeVersion()` (Node ≥18).
- `src/utils/setup.ts` — wizard interativo (`inquirer`); reusa valores existentes ao re-rodar.
- `src/utils/language.ts` — `detectProjectLanguage()` + `printDetectedLanguage()` (passado à IA como contexto).
- `src/utils/logger.ts` — logger `chalk`+emoji (header/success/info/warning/error/git/ai/commit). Única via de output ao usuário.
- `src/releaser.ts` — CLI separado: release notes a partir do `git log` desde uma tag; usa variáveis de ambiente (`.env`), não `~/.gitai`; escreve `dist/release_<version>.md`.
- `src/version.ts` — reexporta `name`/`version`/`engines` do package.json.
- `scripts/release-flow.ts` — workflow de release automatizado (`tsx`); `scripts/verify_deleted_files_logic.ts` — script de verificação manual.

Domain-specific guidance lives in nested CLAUDE.md files (loaded on demand):

- `src/services/` — camada de serviços de integração externa (clientes de IA)

## Conventions

- **ESM puro** (`"type": "module"`): todo import relativo DEVE terminar em `.js`, mesmo apontando para fonte `.ts` (ex.: `import { logger } from './logger.js'`). Sem isso o runtime quebra.
- **`process.exit(1)` em erro fatal é intencional** (regra eslint `no-process-exit` desligada) — é uma CLI. Erros vão para `logger.error` (chalk), não `throw` cru para o usuário.
- **Novos provedores de IA** entram no `switch` de `AIService.initializeClient()` + tratamento por-provedor do request (modelos novos da OpenAI usam `max_completion_tokens` em vez de `max_tokens`).
- **Git só via `runGitCommand()`** (`execa`, `reject:false`). Mensagem de commit é escrita em arquivo temporário (preserva caracteres especiais); detecção de status/conflito deve cobrir saída do git em inglês E português.
- **Staging antes do diff**: `getDiffWithNewFiles()` roda `git add .` + `git diff --cached` para a IA enxergar arquivos novos; arquivos deletados vêm à parte por `getDeletedFiles()`.
- **Conventional Commits estritos**: só os prefixos `feat`/`fix`/`docs`/`chore`, impostos pelo prompt em `getCommitSystemPrompt()`.
- **Output ao usuário só pelo objeto `logger`** (`src/utils/logger.ts`) — nunca `console.log` cru em código novo.

## Behavioral guidelines

<!-- aia-harness:behavioral — non-negotiable; do not edit, reorder, or remove during enrichment -->

### 1. Think Before Coding

**Don't assume. Don't hide confusion. Surface tradeoffs.**

Before implementing:

- State your assumptions explicitly. If uncertain, ask.
- If multiple interpretations exist, present them - don't pick silently.
- If a simpler approach exists, say so. Push back when warranted.
- If something is unclear, stop. Name what's confusing. Ask.

### 2. Simplicity First

**Minimum code that solves the problem. Nothing speculative.**

- No features beyond what was asked.
- No abstractions for single-use code.
- No "flexibility" or "configurability" that wasn't requested.
- No error handling for impossible scenarios.
- If you write 200 lines and it could be 50, rewrite it.

Ask yourself: "Would a senior engineer say this is overcomplicated?" If yes, simplify.

### 3. Surgical Changes

**Touch only what you must. Clean up only your own mess.**

When editing existing code:

- Don't "improve" adjacent code, comments, or formatting.
- Don't refactor things that aren't broken.
- Match existing style, even if you'd do it differently.
- If you notice unrelated dead code, mention it - don't delete it.

When your changes create orphans:

- Remove imports/variables/functions that YOUR changes made unused.
- Don't remove pre-existing dead code unless asked.

The test: Every changed line should trace directly to the user's request.

### 4. Goal-Driven Execution

**Define success criteria. Loop until verified.**

Transform tasks into verifiable goals:

- "Add validation" → "Write tests for invalid inputs, then make them pass"
- "Fix the bug" → "Write a test that reproduces it, then make it pass"
- "Refactor X" → "Ensure tests pass before and after"

For multi-step tasks, state a brief plan:

```
1. [Step] → verify: [check]
2. [Step] → verify: [check]
3. [Step] → verify: [check]
```

Strong success criteria let you loop independently. Weak criteria ("make it work") require constant clarification.

## Engineering rules

<!-- aia-harness:fixed — non-negotiable; do not edit, reorder, or remove during enrichment -->

- Match the style of surrounding code; do not introduce new patterns unprompted.
- Write unit tests for every new function or module added.
- Run the lint + test commands above before claiming work is complete.
- Never commit secrets; keep them in gitignored env files (`.env`/`.env.local`) — `.claude/settings.local.json` is only for MCP-server credentials referenced by `.mcp.json`.
- Fix every compilation/syntax/lint error found during a session — regardless of whether you edited the file. Never leave the build broken or label errors "pre-existing, not related".
- When performing a code review (user requests it or a workflow triggers it), always use `code-reviewer` and `security-reviewer` and `typescript-reviewer`.

@.claude/memory/INSTRUCTIONS.md
@.claude/memory/MEMORY.md

<!-- Generated by aia-harness. Edit freely; re-run /aia-harness:doctor to audit. -->

## graphify

This project has a knowledge graph at graphify-out/ with god nodes, community structure, and cross-file relationships.

Rules:

- For codebase questions, first run `graphify query "<question>"` when graphify-out/graph.json exists. Use `graphify path "<A>" "<B>"` for relationships and `graphify explain "<concept>"` for focused concepts. These return a scoped subgraph, usually much smaller than GRAPH_REPORT.md or raw grep output.
- If graphify-out/wiki/index.md exists, use it for broad navigation instead of raw source browsing.
- Read graphify-out/GRAPH_REPORT.md only for broad architecture review or when query/path/explain do not surface enough context.
- After modifying code, run `graphify update .` to keep the graph current (AST-only, no API cost).

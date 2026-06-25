---
name: smoke-test-gitai
description: Smoke test end-to-end do gitai CLI em repo temporário
---

# Smoke Test — gitai CLI

Valida o ciclo completo: detectar diff → chamar IA → gerar mensagem → commitar.

## Passos

1. **Build** — rode `npm run build` e confirme `dist/index.js` existe.

2. **Repo temporário**:

   ```bash
   TMPDIR=$(mktemp -d)
   cd "$TMPDIR"
   git init
   git config user.email "smoke@test.local"
   git config user.name "Smoke Test"
   echo "smoke test $(date -u +%s)" > smoke.txt
   git add smoke.txt
   ```

3. **Executar gitai** no repo temporário, apontando para o build:

   ```bash
   node /path/to/dist/index.js
   ```

   Use a variável de ambiente `GITAI_CONFIG` se necessário para apontar para `~/.gitai` real ou um config de teste.

4. **Verificar saída**:
   - Mensagem de commit gerada segue Conventional Commits (`feat:`, `fix:`, `chore:` etc.)
   - `git log --oneline` mostra 1 commit no repo temporário
   - Nenhum `process.exit(1)` não tratado

5. **Limpar**: `rm -rf "$TMPDIR"`

## Checklist de resultado

- [ ] Build passa sem erros de TypeScript
- [ ] gitai roda sem crash no repo temporário
- [ ] Mensagem gerada tem prefixo Conventional Commits válido
- [ ] Commit aparece em `git log`

## Quando usar

Após mudar `src/services/ai.ts`, `src/utils/git.ts` ou `src/index.ts` — qualquer alteração no fluxo principal de commit.

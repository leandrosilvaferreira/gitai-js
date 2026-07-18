# Como Publicar Nova Versão

> **Atalho:** rode `/release` no Claude Code. A skill (`.claude/skills/release/SKILL.md`) conduz o
> processo interativamente, valida os pré-requisitos e verifica se a publicação realmente chegou ao
> npm. Este documento é a referência escrita do mesmo processo.

O pacote é **`@notyped/gitai`** (com escopo). O comando de CLI é `gitai` — nomes diferentes de
propósito. Nunca use `gitai` sem escopo em comandos npm: **existe um pacote real de outro autor
com esse nome**, e instalá-lo sobrescreve o binário `gitai` da sua máquina.

## Pré-requisitos

1. **`.env` na raiz do projeto** (obrigatório para gerar as release notes):

   ```bash
   cp .env.sample .env   # preencha PROVIDER, MODEL, API_KEY, LANGUAGE
   ```

   `scripts/release-flow.ts` lê essas variáveis via dotenv — **não** usa o `~/.gitai`. Sem elas o
   fluxo falha depois de já ter perguntado o tipo de release.

2. **`NPM_TOKEN` configurado no GitHub** (só uma vez, por repositório):
   - <https://github.com/leandrosilvaferreira/gitai-js/settings/secrets/actions>
   - Token com permissão de publicação, criado em <https://www.npmjs.com/settings/~/tokens>

3. **Working tree limpa** — as notes são geradas a partir do histórico commitado.

> O `gh` CLI **não** é necessário para publicar. A GitHub Release é criada pelo CI, não localmente.

---

## Processo de Release

```bash
npm run release
```

Antes, veja o que vai entrar na versão:

```bash
git log $(git describe --tags --abbrev=0)..HEAD --oneline
```

### O que o script faz

1. Aborta se houver mudanças não commitadas.
2. Avisa se você não está em `main`/`master` (pergunta se quer continuar).
3. **Pergunta o tipo de release** (patch/minor/major/custom) — nada infere isso dos prefixos dos
   commits; a escolha é sua.
4. Gera release notes com IA (commits desde a última tag).
5. Atualiza `package.json`, `src/version.ts` e `CHANGELOG.md`.
6. Cria o commit `chore: release vX.Y.Z`.
7. Cria a **tag anotada** `vX.Y.Z` com as notes na mensagem.
8. Pergunta se deseja fazer push da branch e da tag.

Se você recusar o push, **nada foi publicado ainda**. Para concluir:

```bash
git push origin main && git push origin vX.Y.Z
```

### O que acontece depois (automático)

O push da tag `v*` dispara `.github/workflows/publish.yml`, que roda no CI:

`npm ci` → `npm test` → `npm run build` → `npm pack` → **`npm publish --provenance`** →
**`gh release create`** (notes lidas da tag anotada + tarball anexado).

Manter as notes dentro da tag é o que permite publicar release notes ricas **sem** colocar uma
API key de IA no CI.

Acompanhe em: <https://github.com/leandrosilvaferreira/gitai-js/actions>

---

## Verificar Publicação (obrigatório)

**CI verde não prova que publicou.** Já aconteceu neste repositório: a `v1.0.8` passou nos testes e
no build e falhou no passo `npm publish` — o npm pula de `1.0.7` para `1.0.9` até hoje porque
ninguém conferiu. Sempre confirme no registry:

```bash
# CI (leva ~30s)
gh run list -R leandrosilvaferreira/gitai-js --workflow=publish.yml --limit 1

# npm — DEVE mostrar a versão que você acabou de publicar
npm view @notyped/gitai version

# GitHub Release
gh release list -R leandrosilvaferreira/gitai-js --limit 1
```

Atualizar a instalação local:

```bash
npm install -g @notyped/gitai@latest
gitai --version
```

---

## Troubleshooting

| Sintoma                                         | Causa / solução                                                                                                                 |
| ----------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------- |
| "Git working directory is not clean"            | Commit ou stash antes de rodar.                                                                                                 |
| Falha ao gerar as notes                         | `.env` ausente ou incompleto (veja Pré-requisitos).                                                                             |
| "Tag already exists"                            | `git tag -d vX.Y.Z && git push origin :refs/tags/vX.Y.Z`, depois rode de novo.                                                  |
| CI não rodou                                    | A tag não chegou no origin: `git push origin vX.Y.Z`.                                                                           |
| CI verde mas `npm view` mostra a versão antiga  | O passo `npm publish` falhou. Leia o log do run e publique uma nova versão patch — o npm não permite republicar uma versão.     |
| npm publicou mas não há GitHub Release          | O passo `gh release create` falhou. Recupere: `gh release create <tag> --title "Release <tag>" --notes-file notes.md <tarball>` |
| Publicou, mas `gitai --version` continua antigo | Problema de instalação local, não de release. Veja abaixo.                                                                      |

### `gitai --version` continua antigo depois de atualizar

Se `npm view @notyped/gitai version` já mostra a versão nova, o release funcionou — o problema é a
instalação local.

Em máquinas com mais de um gerenciador de versões do Node (fnm **e** nvm, por exemplo), cada um tem
seu próprio `node_modules` global. O `npm install -g` pode gravar numa árvore diferente da que o
shell realmente resolve, imprimindo "added N packages" sem trocar o `gitai` do `PATH`.

```bash
which gitai && gitai --version
npm root -g    # pode NÃO ser a árvore de onde vem o gitai do seu shell

# instale na árvore certa e confira lendo o arquivo, não a saída do install
npm install -g --prefix "<prefix-da-arvore>" @notyped/gitai@latest
grep '"version"' "<arvore>/lib/node_modules/@notyped/gitai/package.json"
```

---

## Checklist

- [ ] `.env` presente e preenchido
- [ ] Working tree limpa, em `main`
- [ ] Revisar `git log $(git describe --tags --abbrev=0)..HEAD --oneline`
- [ ] `npm run release` → escolher tipo → revisar notes → confirmar push
- [ ] CI verde em Actions
- [ ] **`npm view @notyped/gitai version` mostra a versão nova**
- [ ] GitHub Release criada

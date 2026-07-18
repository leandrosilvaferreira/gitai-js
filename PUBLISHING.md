# Como Publicar Nova Versão

> **Atalho:** rode `/release` no Claude Code. A skill (`.claude/skills/release/SKILL.md`) conduz o
> processo, valida os pré-requisitos e verifica se a publicação realmente chegou ao npm. Este
> documento é a referência escrita do mesmo processo.

**Antes de qualquer coisa**, rode o diagnóstico (só leitura):

```bash
npm run release:status
```

Ele mostra versão local, versão no npm, última tag, quantos commits estão sem publicar, e o próximo
comando exato. Responde inclusive a dúvida mais comum: _"commitei e dei push, por que não saiu
versão nova?"_ — **push de commit não publica nada; só o push de uma tag `v*` publica.**

O pacote é **`@notyped/gitai`** (com escopo). O comando de CLI é `gitai` — nomes diferentes de
propósito. Nunca use `gitai` sem escopo em comandos npm: **existe um pacote real de outro autor
com esse nome**, e instalá-lo sobrescreve o binário `gitai` da sua máquina.

## Pré-requisitos

1. **`.env` na raiz do projeto** (obrigatório para gerar as release notes):

   ```bash
   cp .env.sample .env   # preencha PROVIDER, MODEL, API_KEY, LANGUAGE
   ```

   `scripts/release-flow.ts` lê essas variáveis via dotenv — **não** usa o `~/.gitai`. A ausência é
   detectada **antes** de qualquer pergunta, com mensagem dizendo o que falta.

2. **`NPM_TOKEN` configurado no GitHub** (só uma vez, por repositório):
   - <https://github.com/leandrosilvaferreira/gitai-js/settings/secrets/actions>
   - Token com permissão de publicação, criado em <https://www.npmjs.com/settings/~/tokens>

3. **Working tree limpa** — as notes são geradas a partir do histórico commitado.

> O `gh` CLI **não** é necessário para publicar. A GitHub Release é criada pelo CI, não localmente.

---

## Processo de Release

Modo automático — sem perguntas, e verifica no npm antes de terminar:

```bash
npm run release -- --type auto --yes
```

Sem flags, roda o assistente interativo (já vem com o bump inferido pré-selecionado):

```bash
npm run release
```

### Flags

| Flag                                 | Efeito                                            |
| ------------------------------------ | ------------------------------------------------- |
| `--type <patch\|minor\|major\|auto>` | Escolhe o bump sem perguntar                      |
| `--version <x.y.z>`                  | Versão explícita (precisa ser maior que a atual)  |
| `--yes`                              | Faz push sem confirmar                            |
| `--no-push`                          | Cria commit e tag localmente e para antes do push |
| `--status`                           | Só diagnostica, não altera nada                   |

`--type auto` infere o bump pelos Conventional Commits desde a última tag: `!` ou `BREAKING CHANGE`
→ major, qualquer `feat:` → minor, senão patch. O script imprime o que inferiu antes de agir.

**Nunca** dirija o assistente interativo mandando teclas por pipe — a sequência de setas depende da
ordem das opções, então uma opção nova faz cortar a versão errada em silêncio. Use as flags.

Antes, veja o que vai entrar na versão:

```bash
git log $(git describe --tags --abbrev=0)..HEAD --oneline
```

### O que o script faz

1. Aborta se houver mudanças não commitadas.
2. Avisa se você não está em `main`/`master`.
3. **Valida o `.env`** antes de qualquer pergunta.
4. Resolve a versão (flag `--type`/`--version`, ou pergunta com o bump inferido pré-selecionado).
5. Aborta se a tag alvo já existir — **antes** de gastar a chamada de IA.
6. Gera release notes com IA (commits desde a última tag).
7. Atualiza `package.json`, `src/version.ts` e `CHANGELOG.md`.
8. Cria o commit `chore: release vX.Y.Z`.
9. Cria a **tag anotada** `vX.Y.Z` com as notes na mensagem.
10. Faz push da branch e da tag (`--yes`, ou confirmação).
11. **Verifica no registry npm** até a versão nova aparecer; sai com erro se não aparecer.

Se você recusar o push (ou usar `--no-push`), **nada foi publicado ainda**. Para concluir:

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

## Verificar Publicação

**CI verde não prova que publicou.** Já aconteceu neste repositório: a `v1.0.8` passou nos testes e
no build e falhou no passo `npm publish` — o npm pula de `1.0.7` para `1.0.9` até hoje porque
ninguém conferiu.

Por isso o `npm run release` **já faz essa verificação sozinho**: depois do push ele consulta o
registry até a versão nova aparecer e sai com erro se ela não chegar. Não é mais um passo manual.

Para conferir depois, a qualquer momento:

```bash
npm run release:status
```

Conferência manual, se precisar do detalhe:

```bash
npm view @notyped/gitai version                                                  # fonte da verdade
gh run list -R leandrosilvaferreira/gitai-js --workflow=publish.yml --limit 1    # run do CI
gh release list -R leandrosilvaferreira/gitai-js --limit 1                       # GitHub Release
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
| Commitei e dei push, não saiu versão nova       | Normal — commit não publica. Rode `npm run release:status` e corte o release.                                                   |
| "Git working directory is not clean"            | Commit ou stash antes de rodar.                                                                                                 |
| "Missing PROVIDER, MODEL, …"                    | `.env` da raiz ausente ou incompleto: `cp .env.sample .env` e preencha.                                                         |
| "Tag vX.Y.Z already exists"                     | `git tag -d vX.Y.Z && git push origin :refs/tags/vX.Y.Z`, depois rode de novo.                                                  |
| "Non-interactive run needs --type …"            | Rodando sem terminal: passe `--type auto` e `--yes` (ou `--no-push`).                                                           |
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

- [ ] `npm run release:status` para ver onde está
- [ ] `.env` presente e preenchido
- [ ] Working tree limpa, em `main`
- [ ] Revisar `git log $(git describe --tags --abbrev=0)..HEAD --oneline`
- [ ] `npm run release -- --type auto --yes` (ou o assistente interativo)
- [ ] O próprio script confirma a publicação no npm — se ele terminou verde, chegou
- [ ] GitHub Release criada

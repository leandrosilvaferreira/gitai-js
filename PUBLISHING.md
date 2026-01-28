# Como Publicar Nova Versão

## Pré-requisitos

1. **NPM_TOKEN configurado no GitHub**:
   - Acesse: https://github.com/[seu-usuario]/gitai-js/settings/secrets/actions
   - Adicione secret `NPM_TOKEN` com seu token do npmjs.com

2. **Token do NPM**:
   - Acesse: https://www.npmjs.com/settings/[seu-usuario]/tokens
   - Crie um token com permissão de publicação

3. **GitHub CLI (opcional, para criar release automaticamente)**:
   ```bash
   brew install gh
   gh auth login
   ```

---

## 🚀 Processo de Release Automatizado

### Executar Script de Release

O script `npm run release` agora atualiza **automaticamente**:
- ✅ `package.json`
- ✅ `src/version.ts`
- ✅ `CHANGELOG.md`

```bash
npm run release
```

### O que o script faz:

1. ✅ **Verifica** se há mudanças não commitadas
2. ✅ **Pergunta** o tipo de release (patch/minor/major/custom)
3. ✅ **Gera** release notes com IA (baseado nos commits desde última tag)
4. ✅ **Atualiza automaticamente**:
   - `package.json` → nova versão
   - `src/version.ts` → nova versão
   - `CHANGELOG.md` → adiciona release notes
5. ✅ **Cria** commit: `chore: release v0.0.X`
6. ✅ **Cria** tag: `v0.0.X`
7. ✅ **Pergunta** se deseja fazer push
8. ✅ **Cria** GitHub Release (se `gh` CLI estiver instalado)

---

## Aguardar Publicação

O GitHub Actions irá:
- ✅ Fazer checkout do código
- ✅ Instalar dependências
- ✅ Rodar lint e build
- ✅ Publicar no npm

Acompanhe em: https://github.com/[seu-usuario]/gitai-js/actions

---

## Verificar Publicação

```bash
# Aguardar ~2 minutos após release

# Verificar no npm
npm view gitai version

# Instalar globalmente
npm install -g gitai@latest

# Testar
gitai --version
```

---

## Troubleshooting

### Erro: "NPM_TOKEN not found"
- Verifique se o secret está configurado no GitHub
- Nome deve ser exatamente `NPM_TOKEN`

### Erro: "Tag already exists"
- Delete a tag local: `git tag -d v0.0.9`
- Delete a tag remota: `git push origin :refs/tags/v0.0.9`
- Execute `npm run release` novamente

### Erro: "Version already published"
- Não é possível republicar a mesma versão
- Execute `npm run release` e escolha uma versão maior

### Erro: "Git working directory is not clean"
- Commit ou stash suas mudanças antes de rodar `npm run release`

---

## Checklist Rápido

- [ ] Executar `npm run release`
- [ ] Escolher tipo de release (patch/minor/major)
- [ ] Revisar release notes geradas
- [ ] Confirmar push
- [ ] Confirmar criação de GitHub Release (se gh CLI disponível)
- [ ] Aguardar GitHub Actions
- [ ] Verificar no npm
- [ ] Testar instalação global

---

## ⚠️ Importante

**Não é mais necessário** editar manualmente:
- ❌ `package.json`
- ❌ `src/version.ts`

O script `npm run release` cuida de tudo automaticamente! 🎉

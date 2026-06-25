# Gitai - Automated Conventional Commits in Git with AI

Choose your language / Escolha o idioma:

- 🇺🇸 [English](#-english)
- 🇧🇷 [Português](#-português)

---

# 🇺🇸 English

[![Release Notes](https://img.shields.io/github/release/leandrosilvaferreira/gitai-js)](https://github.com/leandrosilvaferreira/gitai-js/releases)
[![GitHub star chart](https://img.shields.io/github/stars/leandrosilvaferreira/gitai-js?style=social)](https://star-history.com/#leandrosilvaferreira/gitai-js)
[![GitHub fork](https://img.shields.io/github/forks/leandrosilvaferreira/gitai-js?style=social)](https://github.com/leandrosilvaferreira/gitai-js/fork)

Gitai is a TypeScript/Node.js project that serves as an automation tool for managing Git commits. It is designed to analyze projects written in various programming languages, including Node.js, Python, Java, Go, and PHP.

The application analyzes the changes made in a project, identifies the programming language used, and based on that, generates a detailed commit message following the Conventional Commits standard. This standard is widely adopted to make commit messages more descriptive and useful.

Additionally, Gitai automates the commit process by adding all changes to the Git staging area, committing with the generated message, and optionally pushing the changes to the remote repository.

For generating the commit message, you can choose between the advanced language models from `OpenAI`, `Groq`, or `Anthropic`.

## 🎥 Video Tutorial

Click the image below to watch the video tutorial about Gitai:

[![AUTOMATED GIT COMMITS WITH AI: GITAI (OPEN SOURCE AND FREE)](http://img.youtube.com/vi/GAQ4mmGxg7c/0.jpg)](https://www.youtube.com/watch?v=GAQ4mmGxg7c 'AUTOMATED GIT COMMITS WITH AI: GITAI (OPEN SOURCE AND FREE)')

## 📋 Prerequisites

Before installing Gitai, ensure you have:

- **Node.js 20 or higher** - [Download here](https://nodejs.org/)
- **Git** - [Download here](https://git-scm.com/)

## ⚡ Installing the Application

Gitai can be installed globally via npm, making it available across all your projects:

```bash
npm install -g @notyped/gitai
```

After installation, the `gitai` command will be available in your terminal.

## 🔄 Updating Gitai

To update `gitai` to the latest version, run the following command. This ensures you get the newest features and fixes, bypassing local caches.

```bash
npm install -g @notyped/gitai@latest
```

## 🤖 Choosing the AI Model

Gitai supports three AI providers for generating commit messages: `OpenAI`, `Groq`, and `Anthropic`.

Each has its own characteristics, costs, and usage limits.

All providers are highly capable, but your choice may depend on your specific needs and available budget.

If you need high processing power and can cover the costs, OpenAI is an excellent option. If you prefer a free service and can manage within usage limits, Groq is a viable alternative. For advanced reasoning and large context windows, Anthropic Claude offers cutting-edge capabilities.

Below is detailed information about each provider to help you choose the best one for your needs.

### OpenAI

OpenAI is a paid service that offers advanced language models.

The most efficient available model is `gpt-5.2`, which has a context window of 400K tokens.

- **Website**: [OpenAI](https://platform.openai.com/docs/introduction)

### Groq

Groq is a free service, but with usage limits.

The recommended model is `llama-3.3-70b-versatile`, which offers a context window of 131,072 tokens.

- **Website**: [Groq](https://console.groq.com/)

### Anthropic

Anthropic is a paid service that offers advanced AI models with excellent reasoning capabilities.

The recommended model is `claude-sonnet-4-5-20250929`, which has a context window of 200K tokens.

- **Features**: Advanced reasoning, large context window, excellent code understanding
- **Website**: [Anthropic](https://console.anthropic.com/)

## 🌱 First-Time Setup

The first time you run `gitai`, a friendly **Setup Wizard** will launch automatically to help you configure your preferred AI provider, API key, model, and language.

```bash
gitai
```

The wizard will guide you through:

1. **Language Selection**: Choose your preferred language (English, Portuguese, Spanish, etc.)
2. **Provider Selection**: Choose between OpenAI, Groq, or Anthropic
3. **API Key**: Enter your API key for the selected provider
4. **Model Selection**: Choose the AI model to use (e.g., `gpt-5.2`, `llama-3.3-70b-versatile`, `claude-sonnet-4-5-20250929`)
5. **Custom Base URL** _(optional)_: Point gitai at a custom OpenAI-compatible endpoint (Ollama, LiteLLM, Together AI, etc.) — press Enter to skip

Your configuration is saved globally in `~/.gitai`, so you don't need to configure it for every project. A template with all available options is available in [`.gitai.example`](.gitai.example).

### Example configuration for OpenAI

```dotenv
PROVIDER=openai
API_KEY=your_openai_api_key
MODEL=gpt-5.2
LANGUAGE=en
```

### Example configuration for Groq

```dotenv
PROVIDER=groq
API_KEY=your_groq_api_key
MODEL=llama-3.3-70b-versatile
LANGUAGE=en
```

### Example configuration for Anthropic

```dotenv
PROVIDER=anthropic
API_KEY=your_anthropic_api_key
MODEL=claude-sonnet-4-5-20250929
LANGUAGE=en
```

### Example configuration with a custom base URL (any OpenAI-compatible provider)

```dotenv
PROVIDER=openai
API_KEY=ollama
MODEL=llama3.2
LANGUAGE=en
BASE_URL=http://localhost:11434/v1
```

## 🔌 Custom LLM Providers

Gitai supports any **OpenAI-compatible endpoint** via the optional `BASE_URL` configuration field. This lets you run commits using local models (Ollama), hosted proxies (LiteLLM), or third-party APIs (Together AI, Fireworks, Anyscale, etc.) — without installing any new packages.

Set `PROVIDER=openai` and point `BASE_URL` at your endpoint:

| Provider                                | BASE_URL example                        |
| --------------------------------------- | --------------------------------------- |
| [Ollama](https://ollama.com/) (local)   | `http://localhost:11434/v1`             |
| [LiteLLM](https://litellm.ai/)          | `http://localhost:4000/v1`              |
| [Together AI](https://www.together.ai/) | `https://api.together.xyz/v1`           |
| [Fireworks AI](https://fireworks.ai/)   | `https://api.fireworks.ai/inference/v1` |
| Any OpenAI-compatible proxy             | `https://your-proxy.example.com/v1`     |

**Ollama example** — run `llama3.2` locally, zero cloud cost:

```dotenv
PROVIDER=openai
API_KEY=ollama
MODEL=llama3.2
LANGUAGE=en
BASE_URL=http://localhost:11434/v1
```

`BASE_URL` in `~/.gitai` always takes priority over any environment variable.

## 🔑 Anthropic Auth via Claude Settings

If you use [Claude Code](https://claude.ai/code), gitai automatically reads `ANTHROPIC_AUTH_TOKEN` and `ANTHROPIC_BASE_URL` from your Claude settings — no manual configuration needed.

Priority order (highest wins):

1. `BASE_URL` in `~/.gitai`
2. `ANTHROPIC_BASE_URL` in `~/.claude/settings.local.json`
3. `ANTHROPIC_BASE_URL` in `~/.claude/settings.json`

The `authToken` (OAuth token used by Claude Code) is read from the same files and passed directly to the Anthropic SDK — it is **never** stored in `~/.gitai`.

## 🚀 Using Gitai

After installing and configuring Gitai, you can start using it to automatically generate commit messages for your project.

To use Gitai, open the terminal in your project's root directory. This is important because Gitai needs access to your project's files to analyze the changes and generate commit messages.

Once the terminal is open in your project's root, you can run Gitai with the following command:

```bash
gitai <project_path> '<generic_message>'
```

Replace `<project_path>` with the path to your project's directory and `<generic_message>` with a basic description of the change you made in the project.

For example, if you have the terminal open in your project's root and the change was to add a new feature, you can simply type:

```bash
gitai . 'Added new feature'
```

or just:

```bash
gitai . ''
```

If you wish to analyze only a specific folder or a project in another directory, for example, if you made a change in your project located at `/Users/username/MyProject`, you can run Gitai with the following command:

```bash
gitai /Users/username/MyProject 'Added new feature'
```

To automatically generate the commit and push it, you can add the `--push` flag to the command:

```bash
gitai . 'Added new feature' --push
```

or just:

```bash
gitai . '' --push
```

## 🚀 Generating Release Notes

Gitai includes a built-in release notes generator that analyzes commits since the last tag and creates detailed release documentation.

To generate release notes:

```bash
npm run release-notes -- <old-tag> <new-version>
```

Example:

```bash
npm run release-notes -- v0.0.1 v0.0.2
```

## 👨‍💻 Development

### Prerequisites

- Node.js 20 or higher
- npm (Node package manager)
- git

### Environment Setup

1. Clone the repository to your local machine using `git clone`.

   ```bash
   git clone https://github.com/leandrosilvaferreira/gitai-js
   ```

2. Navigate to the project directory.

   ```bash
   cd gitai-js
   ```

3. Install the project dependencies.

   ```bash
   npm install
   ```

### Building the Project

To build the project, run:

```bash
npm run build
```

This will compile the TypeScript code and bundle it using TSUP.

### Testing Locally

You can test the CLI locally by linking it:

```bash
npm link
```

Then run `gitai` in any directory to test it.

## 🙌 Contributing

We appreciate your interest in contributing to Gitai! Here are some guidelines to help you through the process:

1. **Fork the Repository**: Fork the Gitai repository to your GitHub account. This means you will have a copy of the repository in your own account, allowing you to make changes without affecting the original project.
2. **Clone the Repository**: Clone the repository to your local machine so that you can make changes.
3. **Create a Branch**: Create a new branch in your fork for your changes. This helps separate your changes from others that may be happening simultaneously.
4. **Make Your Changes**: Make the changes that you believe will improve the project. This can be adding a new feature, fixing a bug, or improving the documentation.
5. **Test Your Changes**: Ensure that your changes do not break anything and that the code still works as expected.
6. **Submit a Pull Request**: Submit a pull request to the original repository proposing your changes. Make sure to provide a detailed description of your changes so that the project maintainers can understand what you did and why.

## 📄 Code of Conduct

We ask that all contributors follow our code of conduct. Mutual respect is essential for a healthy collaborative environment. Please be professional and respectful to all contributors.

## 🙋 Support

If you have any questions or issues, please open an issue. We will do our best to help you.

## 📨 Contact

If you wish to contact the project maintainers, please send an email to: [leandro@notyped.com](mailto:leandro@notyped.com)

Thank you for your interest in our project. We look forward to your contributions!

## 🤓 Author

**Leandro Silva Ferreira**

- GitHub: [@leandrosilvaferreira](https://github.com/leandrosilvaferreira)
- Twitter: [@leandrosfer](https://twitter.com/leandrosfer)
- Email: [leandro@notyped.com](mailto:leandro@notyped.com)
- LinkedIn: [Leandro Ferreira](https://www.linkedin.com/in/leandrosilvaferreira/)

## 📄 License

This project is licensed under the MIT License. This means you are free to copy, modify, merge, publish, distribute, sublicense, and/or sell copies of the software, provided that you give appropriate credit to the original author and reproduce the license in all copies or substantial portions of the software.

For more details, see the [LICENSE](LICENSE.md) file in the repository.

---

# 🇧🇷 Português

# Gitai - Conventional Commits automatizados no Git com IA

[![Release Notes](https://img.shields.io/github/release/leandrosilvaferreira/gitai-js)](https://github.com/leandrosilvaferreira/gitai-js/releases)
[![GitHub star chart](https://img.shields.io/github/stars/leandrosilvaferreira/gitai-js?style=social)](https://star-history.com/#leandrosilvaferreira/gitai-js)
[![GitHub fork](https://img.shields.io/github/forks/leandrosilvaferreira/gitai-js?style=social)](https://github.com/leandrosilvaferreira/gitai-js/fork)

Gitai é um projeto TypeScript/Node.js que serve como uma ferramenta de automação para gerenciamento de commits no Git. Ele é projetado para analisar projetos escritos em várias linguagens de programação, incluindo Node.js, Python, Java, Go e PHP.

A aplicação analisa as alterações feitas em um projeto, identifica a linguagem de programação usada e, com base nisso, gera uma mensagem de commit detalhada seguindo o padrão Conventional Commits. Este padrão é amplamente adotado para tornar as mensagens de commit mais descritivas e úteis.

Além disso, Gitai automatiza o processo de commit, adicionando todas as alterações ao índice do Git, realizando o commit com a mensagem gerada e, opcionalmente, fazendo push das alterações para o repositório remoto.

Para a geração da mensagem de commit, é possível escolher entre os modelos de linguagem avançados da `OpenAI`, `Groq` ou `Anthropic`.

## 🎥 Tutorial em Vídeo

Clique na imagem abaixo para assistir ao tutorial em vídeo sobre o Gitai:

[![AUTOMATIZAÇÃO DE COMMITS DO GIT COM IA: GITAI (OPEN SOURCE E GRATUITO)](http://img.youtube.com/vi/GAQ4mmGxg7c/0.jpg)](https://www.youtube.com/watch?v=GAQ4mmGxg7c 'AUTOMATIZAÇÃO DE COMMITS DO GIT COM IA: GITAI (OPEN SOURCE E GRATUITO)')

## 📋 Pré-requisitos

Antes de instalar o Gitai, certifique-se de ter:

- **Node.js 20 ou superior** - [Baixe aqui](https://nodejs.org/)
- **Git** - [Baixe aqui](https://git-scm.com/)

## ⚡ Instalando a Aplicação

O Gitai pode ser instalado globalmente via npm, tornando-o disponível em todos os seus projetos:

```bash
npm install -g @notyped/gitai
```

Após a instalação, o comando `gitai` estará disponível no seu terminal.

## 🔄 Atualizando o Gitai

Para atualizar o `gitai` para a versão mais recente, execute o comando abaixo. Isso garante que você receba os recursos e correções mais novos, ignorando caches locais.

```bash
npm install -g @notyped/gitai@latest
```

## 🤖 Escolhendo o Modelo de IA

O Gitai oferece suporte a três provedores de IA para gerar mensagens de commit: `OpenAI`, `Groq` e `Anthropic`.

Cada um tem suas características, custos e limites de utilização.

Todos os provedores são altamente capazes, mas sua escolha pode depender de suas necessidades específicas e do orçamento disponível.

Se você precisa de uma grande capacidade de processamento e pode arcar com os custos, OpenAI é uma excelente opção. Se você prefere um serviço sem custo e pode gerenciar dentro dos limites de utilização, Groq é uma alternativa viável. Para raciocínio avançado e grandes janelas de contexto, Anthropic Claude oferece capacidades de ponta.

Abaixo estão as informações detalhadas sobre cada provedor para ajudá-lo a escolher o melhor para suas necessidades.

### OpenAI

OpenAI é um serviço pago que oferece modelos de linguagem avançados.

O modelo mais eficiente disponível é o `gpt-5.2`, que tem uma janela de contexto de 400K tokens.

- **Site**: [OpenAI](https://platform.openai.com/docs/introduction)

### Groq

Groq é um serviço gratuito, mas com limites de utilização.

O modelo recomendado é o `llama-3.3-70b-versatile`, que oferece uma janela de contexto de 131,072 tokens.

- **Site**: [Groq](https://console.groq.com/)

### Anthropic

Anthropic é um serviço pago que oferece modelos de IA avançados com excelentes capacidades de raciocínio.

O modelo recomendado é o `claude-sonnet-4-5-20250929`, que tem uma janela de contexto de 200K tokens.

- **Características**: Raciocínio avançado, grande janela de contexto, excelente compreensão de código
- **Site**: [Anthropic](https://console.anthropic.com/)

## 🌱 Configuração Inicial

Na primeira vez que você executar o `gitai`, um **Assistente de Configuração** amigável será iniciado automaticamente para ajudá-lo a configurar seu provedor de IA preferido, chave de API, modelo e idioma.

```bash
gitai
```

O assistente irá guiá-lo através de:

1. **Seleção de Idioma**: Escolha seu idioma preferido (Inglês, Português, Espanhol, etc.)
2. **Seleção de Provedor**: Escolha entre OpenAI, Groq ou Anthropic
3. **Chave de API**: Insira sua chave de API para o provedor selecionado
4. **Seleção de Modelo**: Escolha o modelo de IA a ser usado (ex: `gpt-5.2`, `llama-3.3-70b-versatile`, `claude-sonnet-4-5-20250929`)
5. **URL Base customizada** _(opcional)_: Aponte o gitai para um endpoint compatível com OpenAI (Ollama, LiteLLM, Together AI, etc.) — pressione Enter para pular

Sua configuração é salva globalmente em `~/.gitai`, então você não precisa configurá-la para cada projeto. Um modelo com todas as opções disponíveis está em [`.gitai.example`](.gitai.example).

### Exemplo de configuração para OpenAI

```dotenv
PROVIDER=openai
API_KEY=your_openai_api_key
MODEL=gpt-5.2
LANGUAGE=en
```

### Exemplo de configuração para Groq

```dotenv
PROVIDER=groq
API_KEY=your_groq_api_key
MODEL=llama-3.3-70b-versatile
LANGUAGE=en
```

### Exemplo de configuração para Anthropic

```dotenv
PROVIDER=anthropic
API_KEY=your_anthropic_api_key
MODEL=claude-sonnet-4-5-20250929
LANGUAGE=en
```

### Exemplo de configuração com URL base customizada (qualquer provedor compatível com OpenAI)

```dotenv
PROVIDER=openai
API_KEY=ollama
MODEL=llama3.2
LANGUAGE=en
BASE_URL=http://localhost:11434/v1
```

## 🔌 Provedores LLM Customizados

O Gitai suporta qualquer **endpoint compatível com OpenAI** via campo opcional `BASE_URL`. Isso permite executar commits usando modelos locais (Ollama), proxies hospedados (LiteLLM) ou APIs de terceiros (Together AI, Fireworks, etc.) — sem instalar novos pacotes.

Configure `PROVIDER=openai` e aponte `BASE_URL` para o seu endpoint:

| Provedor                                | Exemplo de BASE_URL                     |
| --------------------------------------- | --------------------------------------- |
| [Ollama](https://ollama.com/) (local)   | `http://localhost:11434/v1`             |
| [LiteLLM](https://litellm.ai/)          | `http://localhost:4000/v1`              |
| [Together AI](https://www.together.ai/) | `https://api.together.xyz/v1`           |
| [Fireworks AI](https://fireworks.ai/)   | `https://api.fireworks.ai/inference/v1` |
| Qualquer proxy compatível com OpenAI    | `https://seu-proxy.exemplo.com/v1`      |

**Exemplo com Ollama** — execute `llama3.2` localmente, sem custo de nuvem:

```dotenv
PROVIDER=openai
API_KEY=ollama
MODEL=llama3.2
LANGUAGE=en
BASE_URL=http://localhost:11434/v1
```

`BASE_URL` em `~/.gitai` sempre tem prioridade sobre qualquer variável de ambiente.

## 🔑 Autenticação Anthropic via Claude Settings

Se você usa o [Claude Code](https://claude.ai/code), o gitai lê automaticamente `ANTHROPIC_AUTH_TOKEN` e `ANTHROPIC_BASE_URL` das suas configurações do Claude — sem configuração manual necessária.

Ordem de prioridade (maior vence):

1. `BASE_URL` em `~/.gitai`
2. `ANTHROPIC_BASE_URL` em `~/.claude/settings.local.json`
3. `ANTHROPIC_BASE_URL` em `~/.claude/settings.json`

O `authToken` (token OAuth usado pelo Claude Code) é lido dos mesmos arquivos e passado diretamente ao SDK Anthropic — **nunca** é armazenado em `~/.gitai`.

## 🚀 Usando o Gitai

Depois de instalar e configurar o Gitai, você pode começar a usá-lo para gerar mensagens de commit automaticamente para o seu projeto.

Para usar o Gitai, você precisa abrir o terminal na raiz do seu projeto. Isso é importante porque o Gitai precisa ter acesso aos arquivos do seu projeto para analisar as alterações e gerar as mensagens de commit.

Uma vez que o terminal esteja aberto na raiz do seu projeto, você pode executar o Gitai com o seguinte comando:

```bash
gitai <caminho_do_projeto> '<mensagem_genérica>'
```

Substitua `<caminho_do_projeto>` pelo caminho do diretório do seu projeto e `<mensagem_genérica>` por uma descrição básica da mudança que você fez no projeto.

Se você estiver com o terminal aberto na raiz do seu projeto e a mudança foi para adicionar uma nova funcionalidade, você pode simplesmente digitar:

```bash
gitai . 'Adicionada nova funcionalidade'
```

ou somente:

```bash
gitai . ''
```

Se você deseja analisar somente uma pasta específica ou um projeto em outra pasta, por exemplo, se você fez uma alteração no seu projeto localizado em `/Users/username/MeuProjeto`, você pode executar o Gitai com o seguinte comando:

```bash
gitai /Users/username/MeuProjeto 'Adicionada nova funcionalidade'
```

Para gerar o commit e fazer push de forma automática, você pode adicionar a flag `--push` ao comando:

```bash
gitai . 'Adicionada nova funcionalidade' --push
```

ou somente:

```bash
gitai . '' --push
```

## 🚀 Gerando Notas de Lançamento (Release Notes)

O Gitai inclui um gerador de notas de lançamento integrado que analisa os commits desde a última tag e cria documentação de lançamento detalhada.

Para gerar notas de lançamento:

```bash
npm run release-notes -- <tag-antiga> <nova-versão>
```

Exemplo:

```bash
npm run release-notes -- v0.0.1 v0.0.2
```

## 👨‍💻 Desenvolvimento

### Pré-requisitos

- Node.js 20 ou superior
- npm (gerenciador de pacotes do Node)
- git

### Configuração do Ambiente

1. Clone o repositório para a sua máquina local usando `git clone`.

```bash
git clone https://github.com/leandrosilvaferreira/gitai-js
```

2. Navegue até o diretório do projeto.

```bash
cd gitai-js
```

3. Instale as dependências do projeto.

```bash
npm install
```

### Compilando o Projeto

Para compilar o projeto, execute:

```bash
npm run build
```

Isso irá compilar o código TypeScript e empacotá-lo usando TSUP.

### Testando Localmente

Você pode testar a CLI localmente fazendo um link:

```bash
npm link
```

Depois execute `gitai` em qualquer diretório para testá-lo.

## 🙌 Contribuindo

Agradecemos o seu interesse em contribuir para o Gitai! Aqui estão algumas diretrizes que podem ajudá-lo no processo:

1. **Fork o Repositório**: Faça um fork do repositório Gitai para a sua conta do GitHub. Isso significa que você terá uma cópia do repositório em sua própria conta, permitindo que você faça alterações sem afetar o projeto original.

2. **Clone o Repositório**: Clone o repositório para a sua máquina local para que você possa fazer alterações.

3. **Crie uma Branch**: Crie uma nova branch em seu fork para fazer suas alterações. Isso ajuda a separar suas alterações de outras que possam estar acontecendo simultaneamente.

4. **Faça suas Alterações**: Faça as alterações que você acha que melhorariam o projeto. Isso pode ser a adição de uma nova funcionalidade, a correção de um bug ou a melhoria da documentação.

5. **Teste suas Alterações**: Certifique-se de que suas alterações não quebram nada e que o código ainda funciona como esperado.

6. **Envie um Pull Request**: Envie um pull request para o repositório original propondo suas alterações. Certifique-se de dar uma descrição detalhada de suas alterações para que os mantenedores do projeto possam entender o que você fez e por quê.

## 📄 Código de Conduta

Pedimos que todos os contribuintes sigam nosso código de conduta. Respeito mútuo é fundamental para um ambiente de colaboração saudável. Por favor, seja profissional e respeitoso com os outros contribuintes.

## 🙋 Suporte

Se você tiver alguma dúvida ou problema, por favor, abra uma issue. Faremos o nosso melhor para ajudá-lo.

## 📨 Contato

Se você quiser entrar em contato com os mantenedores do projeto, por favor, envie um e-mail para: [leandro@notyped.com](mailto:leandro@notyped.com)

Obrigado por seu interesse em nosso projeto. Estamos ansiosos para ver suas contribuições!

## 🤓 Autor

**Leandro Silva Ferreira**

- GitHub: [@leandrosilvaferreira](https://github.com/leandrosilvaferreira)
- Twitter: [@leandrosfer](https://twitter.com/leandrosfer)
- Email: [leandro@notyped.com](mailto:leandro@notyped.com)
- LinkedIn: [Leandro Ferreira](https://www.linkedin.com/in/leandrosilvaferreira/)

## 📄 Licença

Este projeto está licenciado sob a Licença MIT. Isso significa que você é livre para copiar, modificar, mesclar, publicar, distribuir, sublicenciar e/ou vender cópias do software, desde que você dê o crédito apropriado ao autor original e reproduza a licença em todas as cópias ou partes substanciais do software.

Para mais detalhes, consulte o arquivo [LICENSE](LICENSE.md) no repositório.

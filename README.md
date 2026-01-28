# GitAI (JS Edition)

AI-powered git commit assistant and release note generator. Now rewritten in TypeScript for easy distribution via `npx`!

## 🚀 User Guide
 
 ### Installation
 
 Install GitAI globally on your machine:
 
 ```bash
 npm install -g gitai
 ```
 
 This makes the `gitai` command available in your terminal across all your projects.
 
 ### Setup
 
 The first time you run `gitai`, a friendly **Setup Wizard** will launch automatically to help you configure your preferred AI provider, API key, and language.
 
 ```bash
 gitai
 ```
 
 Your configuration is saved globally in `~/.gitai`, so you don't need to configure it for every project.
 
 ### Usage
 
 Just run `gitai` in any git repository:
 
 ```bash
 gitai
 ```
 
 ### Options
 
 ```bash
 # Provide a base hint for the commit message
 gitai . "refactoring auth logic"
 
 # Automatically push changes if the branch is ahead
 gitai . --push
 ```

## 📦 For Developers

### Installation

```bash
npm install
```

### Build

```bash
npm run build
```

### Release Notes (Internal)

To generate release notes between a tag and HEAD:

```bash
npm run release-notes -- <old-tag> <new-version>
# Example
npm run release-notes -- v0.0.1 v0.0.2
 ```
 
 ### Testing (Local Configuration)
 
 You can verify the global wizard flow locally:
 
 1. **Install Globally (Simulated)**:
    ```bash
    npm link
    ```
 
 2. **First Run**:
    ```bash
    gitai
    ```
    > You should see the "Welcome to GitAI Setup!" wizard.
 
 3. **Configure**:
    - Select Language
    - Select Provider
    - Enter API Key
 
 4. **Verify Persistence**:
    ```bash
    cat ~/.gitai
    ```
 
 5. **Subsequent Runs**:
    Run `gitai` again. It should skip the wizard.

## 📄 License

MIT

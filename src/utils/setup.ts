import chalk from 'chalk';
import { execa } from 'execa';
import inquirer from 'inquirer';
import { createRequire } from 'module';
import { AppConfig, CONFIG_PATH, saveConfig } from './config.js';

const require = createRequire(import.meta.url);
const pkg = require('../../package.json');

export async function runSetup(): Promise<AppConfig> {
    console.clear();
    console.log(chalk.bold.blue(`\n🚀 Welcome to GitAI v${pkg.version} Setup! 🚀`));
    console.log(chalk.dim('Let\'s get you ready to code with AI assistance.\n'));

    // 1. Check Prerequisites
    try {
        await execa('git', ['--version']);
        console.log(chalk.green('✅ Git is installed!'));
    } catch (e) {
        console.log(chalk.red('❌ Git is NOT installed or not accessible from PATH.'));
        console.log(chalk.yellow('Please install Git before proceeding.'));
        process.exit(1);
    }
    
    console.log(chalk.cyan('\n⚙️  Global Configuration (saved to ' + CONFIG_PATH + ')\n'));

    // 2. Prompts
    // Inquirer v12+ types might need check, but standard array syntax usually persists or we use separate imports.
    // Assuming standard prompt syntax works for this version as it is the default export typically.
    
    const answers = await inquirer.prompt([
        {
            type: 'list',
            name: 'LANGUAGE',
            message: 'What language should the AI use for commit messages?',
            choices: [
                { name: 'English', value: 'en' },
                { name: 'Portuguese (Brasil)', value: 'pt-br' },
                { name: 'Spanish', value: 'es' },
                { name: 'French', value: 'fr' },
                { name: 'German', value: 'de' },
                { name: 'Italian', value: 'it' },
                { name: 'Chinese', value: 'zh' },
                { name: 'Japanese', value: 'ja' },
                { name: 'Korean', value: 'ko' }
            ],
            default: 'en'
        },
        {
            type: 'list',
            name: 'PROVIDER',
            message: 'Which AI Provider do you want to use?',
            choices: [
                { name: 'OpenAI', value: 'openai' },
                { name: 'Anthropic', value: 'anthropic' },
                { name: 'Groq', value: 'groq' }
            ],
            default: 'openai'
        },
        {
            type: 'password',
            name: 'API_KEY',
            message: 'Enter your API Key:',
            mask: '*',
            validate: (input: string) => input.length > 0 ? true : 'API Key is required'
        },
        {
            type: 'input',
            name: 'MODEL',
            message: 'Model ID (e.g., gpt-4o, claude-3-5-sonnet):',
            default: (answers: any) => {
                if (answers.PROVIDER === 'openai') return 'gpt-4o';
                if (answers.PROVIDER === 'anthropic') return 'claude-3-5-sonnet-20240620';
                if (answers.PROVIDER === 'groq') return 'llama3-70b-8192';
                return 'gpt-4o';
            }
        }
    ]);

    const config: AppConfig = {
        LANGUAGE: answers.LANGUAGE,
        PROVIDER: answers.PROVIDER,
        API_KEY: answers.API_KEY,
        MODEL: answers.MODEL
    };

    saveConfig(config);

    console.log(chalk.green('\n✨ Configuration saved successfully! ✨'));
    console.log(chalk.dim('You are all set. Running GitAI...\n'));

    return config;
}

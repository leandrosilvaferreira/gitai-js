import chalk from 'chalk';
import { execa } from 'execa';
import inquirer from 'inquirer';
import { AppConfig, CONFIG_PATH, checkConfigExists, loadConfig, saveConfig } from './config.js';

import { version } from '../version.js';

export async function runSetup(): Promise<AppConfig> {
    console.clear();
    console.log(chalk.bold.blue(`\n🚀 Welcome to GitAI v${version} Setup! 🚀`));
    console.log(chalk.dim('Let\'s get you ready to code with AI assistance.\n'));

    // 1. Check Prerequisites
    try {
        await execa('git', ['--version']);
        console.log(chalk.green('✅ Git is installed!'));
    } catch {
        console.log(chalk.red('❌ Git is NOT installed or not accessible from PATH.'));
        console.log(chalk.yellow('Please install Git before proceeding.'));
        process.exit(1);
    }
    
    console.log(chalk.cyan('\n⚙️  Global Configuration (saved to ' + CONFIG_PATH + ')\n'));

    // 2. Load Existing Configuration
    let currentConfig: Partial<AppConfig> = {};
    if (checkConfigExists()) {
        try {
            currentConfig = loadConfig();
            console.log(chalk.green(`✅ Found existing configuration at ${CONFIG_PATH}`));
        } catch {
            console.log(chalk.yellow('⚠️  Could not load existing configuration, starting fresh.'));
        }
    }

    const requiredKeys: (keyof AppConfig)[] = ['LANGUAGE', 'PROVIDER', 'API_KEY', 'MODEL'];
    const missingKeys = requiredKeys.filter(key => !currentConfig[key]);

    if (missingKeys.length === 0) {
        console.log(chalk.green('✅ Configuration is complete and valid!'));

        return currentConfig as AppConfig;
    }

    if (Object.keys(currentConfig).length > 0) {
        console.log(chalk.yellow(`⚠️  Missing configuration for: ${missingKeys.join(', ')}`));
        console.log(chalk.dim('Please provide the missing details.\n'));
    }

    // 3. Prompts
    const prompts = [
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
            default: 'en',
            when: () => !currentConfig.LANGUAGE
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
            default: 'openai',
            when: () => !currentConfig.PROVIDER
        },
        {
            type: 'password',
            name: 'API_KEY',
            message: 'Enter your API Key:',
            mask: '*',
            validate: (input: string) => input.length > 0 ? true : 'API Key is required',
            when: () => !currentConfig.API_KEY
        },
        {
            type: 'input',
            name: 'MODEL',
            message: 'Model ID (e.g., gpt-5.2, claude-3-5-sonnet, llama-3.3-70b-versatile):',
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            default: (answers: any) => {
                const provider = answers.PROVIDER || currentConfig.PROVIDER;
                if (provider === 'openai') return 'gpt-5.2';
                if (provider === 'anthropic') return 'claude-3-5-sonnet-20240620';
                if (provider === 'groq') return 'llama-3.3-70b-versatile';
                return 'gpt-5.2';
            },
             when: () => !currentConfig.MODEL
        }
    ];
    
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const answers = await inquirer.prompt(prompts as any);

    const config: AppConfig = {
        LANGUAGE: answers.LANGUAGE || currentConfig.LANGUAGE!,
        PROVIDER: answers.PROVIDER || currentConfig.PROVIDER!,
        API_KEY: answers.API_KEY || currentConfig.API_KEY!,
        MODEL: answers.MODEL || currentConfig.MODEL!
    };

    saveConfig(config);

    console.log(chalk.green('\n✨ Configuration saved successfully! ✨'));


    return config;
}

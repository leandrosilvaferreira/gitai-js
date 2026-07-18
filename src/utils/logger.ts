import chalk from 'chalk';

export const logger = {
  header: (message: string) => {
    console.log(chalk.cyan.bold(`🚀 ${message}`));
  },
  success: (message: string) => {
    console.log(chalk.green.bold(`✅ ${message}`));
  },
  info: (message: string) => {
    console.log(chalk.blue.bold(`ℹ️  ${message}`));
  },
  warning: (message: string) => {
    console.log(chalk.yellow.bold(`⚠️  ${message}`));
  },
  error: (message: string) => {
    console.log(chalk.red.bold(`❌ ${message}`));
  },
  git: (message: string) => {
    console.log(chalk.magenta.bold(`🔄 ${message}`));
  },
  ai: (message: string) => {
    console.log(chalk.cyan.bold(`🤖 ${message}`));
  },
  commit: (message: string) => {
    console.log('\n' + chalk.bgBlue.white.bold(' Generated commit message: ') + '\n');
    console.log(chalk.white.bold(message));
    console.log();
  },
};

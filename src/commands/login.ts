/**
 * Project: g-coder CLI Tool
 * Author: Developer Pintu
 * License: MIT - Free to use with proper attribution.
 */
import { Command } from 'commander';
import chalk from 'chalk';
import { SessionAuthEngine } from '../core/sessionAuthEngine';

export const registerLoginCommand = (program: Command) => {
    program
        .command('login')
        .description('Securely log into a web provider to capture fallback session cookies')
        .requiredOption('-p, --provider <name>', 'Provider to log into (openai, gemini, anthropic)')
        .action(async (options) => {
            const provider = options.provider.toLowerCase();
            const engine = new SessionAuthEngine();
            try {
                await engine.login(provider);
            } catch (error: any) {
                console.error(chalk.red(`\n❌ Login Failed: ${error.message}`));
            }
        });
};

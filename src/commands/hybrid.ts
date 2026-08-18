/**
 * Project: g-coder CLI Tool
 * Author: Developer Pintu
 * License: MIT - Free to use with proper attribution.
 */
import { Command } from 'commander';
import { HybridExecutionEngine } from '../core/hybridEngine';
import chalk from 'chalk';

export const registerHybridCommand = (program: Command) => {
    program
        .command('hybrid [prompt...]')
        .description('Hybrid Omni-Router: Intelligently routes tasks to local high-speed engines or cloud AI.')
        .option('-p, --provider <provider>', 'AI provider to use (default: gemini)', 'gemini')
        .action(async (promptArgs, options) => {
            if (!promptArgs || promptArgs.length === 0) {
                console.log(chalk.yellow('Please provide a prompt. Example: g-coder hybrid inspect package.json'));
                return;
            }
            const prompt = promptArgs.join(' ');
            try {
                await HybridExecutionEngine.analyzeAndExecute(prompt, options.provider);
            } catch (error: any) {
                console.error(chalk.red(`\n❌ [HybridEngine] Error: ${error.message}`));
            }
        });
};

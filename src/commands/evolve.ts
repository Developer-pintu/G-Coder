/**
 * Project: g-coder CLI Tool
 * Author: Developer Pintu
 * License: MIT - Free to use with proper attribution.
 */
import { Command } from 'commander';
import { SelfEvolvingEngine } from '../core/selfEvolvingEngine';
import chalk from 'chalk';

export const registerEvolveCommand = (program: Command) => {
    program
        .command('evolve <capability...>')
        .description('Self-Evolving Engine: Dynamically synthesize and execute a missing capability.')
        .option('-p, --provider <provider>', 'AI provider to use (default: gemini)', 'gemini')
        .action(async (capabilityArgs, options) => {
            const intent = capabilityArgs.join(' ');
            try {
                await SelfEvolvingEngine.synthesizeCapability(intent, options.provider);
            } catch (error: any) {
                console.error(chalk.red(`\n❌ [SelfEvolvingEngine] Error: ${error.message}`));
            }
        });
};

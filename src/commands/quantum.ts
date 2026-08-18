/**
 * Project: g-coder CLI Tool
 * Author: Developer Pintu
 * License: MIT - Free to use with proper attribution.
 */
import { Command } from 'commander';
import chalk from 'chalk';
import { QuantumDebugger } from '../core/quantumDebugger';

export const registerQuantumCommand = (program: Command) => {
    program
        .command('quantum <testCommand> <goodCommit>')
        .description('Quantum Debugger: Autonomous Git Bisect regression hunter.')
        .option('-p, --provider <provider>', 'AI provider to use (default: gemini)', 'gemini')
        .action(async (testCommand, goodCommit, options) => {
            const debuggerEngine = new QuantumDebugger();
            try {
                await debuggerEngine.huntRegression(testCommand, goodCommit, options.provider);
            } catch (error: any) {
                console.error(chalk.red(`\n❌ [Quantum Debugger] Error: ${error.message}`));
            }
        });
};

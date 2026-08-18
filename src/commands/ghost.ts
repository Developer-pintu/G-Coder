/**
 * Project: g-coder CLI Tool
 * Author: Developer Pintu
 * License: MIT - Free to use with proper attribution.
 */
import { Command } from 'commander';
import chalk from 'chalk';
import { GhostServer } from '../core/ghostServer';

export const registerGhostCommand = (program: Command) => {
    program
        .command('ghost-server')
        .description('Live Ghost Coder: Starts the WebSocket IPC bridge for live IDE code streaming.')
        .option('-p, --port <port>', 'WebSocket port to listen on', '8080')
        .option('--provider <provider>', 'AI provider to use (default: gemini)', 'gemini')
        .action(async (options) => {
            const ghostServer = new GhostServer();
            try {
                await ghostServer.start(parseInt(options.port), options.provider);
            } catch (error: any) {
                console.error(chalk.red(`\n❌ [Ghost Server] Error: ${error.message}`));
            }
        });
};

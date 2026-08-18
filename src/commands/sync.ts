/**
 * Project: g-coder CLI Tool
 * Author: Developer Pintu
 * License: MIT - Free to use with proper attribution.
 */
import { Command } from 'commander';
import { IdeSync } from '../core/ideSync';

export const registerSyncCommand = (program: Command) => {
    program
        .command('sync')
        .description('IDE Live Sync: Start a WebSocket bridge to mirror AI edits in VS Code')
        .action(() => {
            const ide = IdeSync.getInstance();
            ide.startServer(8080);
        });
};

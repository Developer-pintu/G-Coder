import { Command } from 'commander';
import { GhostCoder } from '../core/ghostCoder';

export const registerWatchCommand = (program: Command) => {
    program
        .command('watch')
        .description('Ghost Coder: Run in background and auto-implement // TODO comments on file save')
        .option('-p, --provider <provider>', 'Specify AI Provider', 'gemini')
        .action(async (options) => {
            const ghost = new GhostCoder();
            await ghost.watchWorkspace(options.provider);
        });
};

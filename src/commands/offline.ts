import { Command } from 'commander';
import { OfflineModeEngine } from '../core/offlineMode';

export const registerOfflineCommand = (program: Command) => {
    program
        .command('offline')
        .description('Air-Gapped Privacy Mode: Toggle local AI execution via Ollama')
        .option('-m, --model <name>', 'Local Ollama model to use', 'llama3')
        .action(async (options) => {
            const offline = new OfflineModeEngine();
            await offline.toggleOffline(options.model);
        });
};

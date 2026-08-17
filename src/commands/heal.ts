import { Command } from 'commander';
import { TestHealer } from '../core/testHealer';

export const registerHealCommand = (program: Command) => {
    program
        .command('heal')
        .description('Self-Healing Test Simulator: runs tests and patches code until green')
        .option('-c, --cmd <command>', 'Test command to run', 'npm test')
        .option('-p, --provider <provider>', 'AI provider to use', 'gemini')
        .option('-m, --max <number>', 'Maximum healing cycles', '3')
        .action(async (options) => {
            const healer = new TestHealer();
            await healer.autoHealTests(options.cmd, options.provider, parseInt(options.max, 10));
        });
};

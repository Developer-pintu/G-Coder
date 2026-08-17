import { Command } from 'commander';
import { ChaosEngine } from '../core/chaosEngine';

export const registerChaosCommand = (program: Command) => {
    program
        .command('chaos <file>')
        .description('Sentient Chaos Engine: Autonomously fuzz-tests a file to crash it, then mathematically fortifies it')
        .option('-p, --provider <provider>', 'Specify AI Provider', 'gemini')
        .action(async (file: string, options) => {
            const chaos = new ChaosEngine();
            await chaos.fuzzTest(file, options.provider);
        });
};

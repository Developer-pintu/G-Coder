import { Command } from 'commander';
import { CicdHealer } from '../core/cicdHealer';

export const registerHealCommand = (program: Command) => {
    program
        .command('heal <log_file>')
        .description('Auto-Healing CI/CD: Analyze a failed pipeline log and auto-fix the code')
        .option('-p, --provider <provider>', 'Specify AI Provider', 'gemini')
        .action(async (logFile: string, options) => {
            const healer = new CicdHealer();
            await healer.healPipeline(logFile, options.provider);
        });
};

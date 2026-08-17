import { Command } from 'commander';
import { DevSecOpsFortifier } from '../core/fortifier';

export const registerFortifyCommand = (program: Command) => {
    program
        .command('fortify')
        .description('Autonomously scans and patches OWASP Top 10 vulnerabilities via AI')
        .option('-p, --provider <provider>', 'AI provider to use (gemini, openai, anthropic)', 'gemini')
        .action(async (options) => {
            const fortifier = new DevSecOpsFortifier();
            await fortifier.fortifyWorkspace(options.provider);
        });
};

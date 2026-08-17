import { Command } from 'commander';
import { TestEnforcer } from '../core/testEnforcer';

export const registerTestsCommand = (program: Command) => {
    program
        .command('tests [directory]')
        .description('Test Enforcer: Scans workspace and autonomously generates missing Jest/Vitest suites')
        .option('-p, --provider <provider>', 'Specify AI Provider', 'gemini')
        .action(async (directory: string, options) => {
            const dir = directory || 'src';
            const enforcer = new TestEnforcer();
            await enforcer.enforceCoverage(dir, options.provider);
        });
};

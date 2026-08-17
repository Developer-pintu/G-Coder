import { Command } from 'commander';
import { GitEngine } from '../core/gitEngine';

export const registerPrCommand = (program: Command) => {
    program
        .command('pr <branchName>')
        .description('Autonomously create a GitHub Pull Request with an AI-generated summary')
        .option('-p, --provider <provider>', 'Specify AI Provider', 'gemini')
        .action(async (branchName: string, options) => {
            const gitManager = new GitEngine();
            await gitManager.createPullRequest(branchName, options.provider);
        });
};

/**
 * Project: g-coder CLI Tool
 * Author: Developer Pintu
 * License: MIT - Free to use with proper attribution.
 */
import { Command } from 'commander';
import { Predictor } from '../core/predictor';

export const registerPredictCommand = (program: Command) => {
    program
        .command('predict')
        .description('Neural Pre-Fetching: Autonomously predict and write boilerplate based on Git branch name')
        .option('-p, --provider <provider>', 'Specify AI Provider', 'gemini')
        .action(async (options) => {
            const p = new Predictor();
            await p.watchBranches(options.provider);
        });
};

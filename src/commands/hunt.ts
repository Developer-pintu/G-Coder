/**
 * Project: g-coder CLI Tool
 * Author: Developer Pintu
 * License: MIT - Free to use with proper attribution.
 */
import { Command } from 'commander';
import { BugHunter } from '../core/bugHunter';

export const registerHuntCommand = (program: Command) => {
    program
        .command('hunt')
        .description('Deeply scans the project to find silent logic flaws and outputs BUG_BOUNTY_REPORT.md')
        .option('-p, --provider <provider>', 'AI provider to use', 'gemini')
        .option('-l, --limit <number>', 'Max files to scan', '10')
        .action(async (options) => {
            const hunter = new BugHunter();
            await hunter.huntForBugs(options.provider, parseInt(options.limit, 10));
        });
};

/**
 * Project: g-coder CLI Tool
 * Author: Developer Pintu
 * License: MIT - Free to use with proper attribution.
 */
import { Command } from 'commander';
import { RedTeamEngine } from '../core/redTeam';

export const registerRedTeamCommand = (program: Command) => {
    program
        .command('redteam <directory>')
        .description('Zero-Day Threat Hunter: Autonomous Red/Blue team vulnerability scanning and patching')
        .option('-p, --provider <provider>', 'Specify AI Provider', 'gemini')
        .action(async (directory: string, options) => {
            const redTeam = new RedTeamEngine();
            await redTeam.huntThreats(directory, options.provider);
        });
};

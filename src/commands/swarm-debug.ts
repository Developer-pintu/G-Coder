/**
 * Project: g-coder CLI Tool
 * Author: Developer Pintu
 * License: MIT - Free to use with proper attribution.
 */
import { Command } from 'commander';
import { SwarmDebugger } from '../core/swarmDebugger';

export const registerSwarmDebugCommand = (program: Command) => {
    program
        .command('swarm-debug <file> <issue_description>')
        .description('Swarm Debugger: Spawns Architect, QA, and Dev agents to debate and fix a complex bug')
        .option('-p, --provider <provider>', 'Specify AI Provider', 'gemini')
        .action(async (file: string, issue: string, options) => {
            const swarm = new SwarmDebugger();
            await swarm.debateAndFix(file, issue, options.provider);
        });
};

/**
 * Project: g-coder CLI Tool
 * Author: Developer Pintu
 * License: MIT - Free to use with proper attribution.
 */
import { Command } from 'commander';
import { DeployerEngine } from '../core/deployer';

export const registerDeployCommand = (program: Command) => {
    program
        .command('deploy <target>')
        .description('1-Click Deployer: Auto-generate Docker, Vercel, or cloud deployment configs')
        .option('-p, --provider <provider>', 'Specify AI Provider', 'gemini')
        .action(async (target: string, options) => {
            const deployer = new DeployerEngine();
            await deployer.deploy(target, options.provider);
        });
};

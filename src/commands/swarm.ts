import { Command } from 'commander';
import chalk from 'chalk';
import { SwarmEngine } from '../core/swarmEngine';

export const registerSwarmCommand = (program: Command) => {
    program
        .command('swarm <goal>')
        .description('Trigger the multi-agent swarm (Architect -> Developer -> QA -> Security)')
        .option('-p, --provider <provider>', 'Specify AI Provider', 'gemini')
        .action(async (goal: string, options) => {
            console.log(chalk.cyan(`\nInitiating G-Coder Swarm Engine...`));
            const swarm = new SwarmEngine();
            try {
                await swarm.executeSwarm(goal, options.provider);
            } catch (error: any) {
                console.error(chalk.red(`\n❌ Swarm Execution Failed: ${error.message}`));
            }
        });
};

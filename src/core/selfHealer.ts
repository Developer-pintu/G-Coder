/**
 * Project: g-coder CLI Tool
 * Author: Developer Pintu
 * License: MIT - Free to use with proper attribution.
 */
import chalk from 'chalk';
import ora from 'ora';
import { executeAiRequest, buildAiPrompt } from './api';
import { SystemAgent } from './agentEngine';
import { EnvironmentManager } from './envManager';
import { CommandRunner, StructuredCommand } from './commandRunner';

export class SelfHealer {
    private engine: SystemAgent;
    private maxRetries = 3;

    constructor(engine: SystemAgent) {
        this.engine = engine;
    }

    public async verifyAndHeal(providerOpt: string, buildCommand: StructuredCommand = { executable: process.platform === 'win32' ? 'npm.cmd' : 'npm', args: ['run', 'build'] }): Promise<boolean> {
        try {
            await new EnvironmentManager().ensure(process.cwd());
        } catch (error: any) {
            console.log(chalk.red(`Environment preparation failed: ${error.message}`));
            return false;
        }
        let attempts = 0;
        const renderedCommand = [buildCommand.executable, ...(buildCommand.args ?? [])].join(' ');
        const runner = new CommandRunner(process.cwd());

        while (attempts < this.maxRetries) {
            console.log(chalk.cyan(`\n🔧 Verifying Workspace (Attempt ${attempts + 1}/${this.maxRetries})...`));
            const spinner = ora(`Running: ${renderedCommand}`).start();
            
            try {
                // Execute build command
                const result = await runner.run(buildCommand);
                if (result.exitCode !== 0) throw new Error(result.stderr || result.stdout || `Exit code ${result.exitCode}`);
                spinner.succeed(chalk.green(`Verification passed! The code compiles successfully.`));
                return true;
            } catch (error: any) {
                spinner.fail(chalk.red(`Verification failed!`));
                const errorOutput = error.stderr || error.stdout || error.message;
                console.log(chalk.gray(`\nError Output:\n${errorOutput.substring(0, 1000)}...\n`));

                attempts++;
                if (attempts >= this.maxRetries) {
                    console.log(chalk.red.bold(`❌ Auto-healing failed after ${this.maxRetries} attempts.`));
                    return false;
                }

                console.log(chalk.magenta(`\n🔄 Self-Healing triggered. Asking AI to fix the error...`));
                
                const healInstruction = `The execution of the following command failed.\n` +
                                        `Command run: ${renderedCommand}\n` +
                                        `Error output:\n${errorOutput}\n\n` +
                                        `Please analyze this error and provide JSON actions (write/read/run/patch) to fix it.`;
                
                const fullPrompt = buildAiPrompt('run', healInstruction);
                const res = await executeAiRequest(fullPrompt, providerOpt);
                
                const actions = this.engine.parseActions(res);
                if (actions.length > 0) {
                    console.log(chalk.cyan(`Applying proposed fixes...`));
                    await this.engine.executeActions(actions);
                } else {
                    console.log(chalk.yellow(`AI could not propose a fix. Aborting self-healing.`));
                    return false;
                }
            }
        }

        return false;
    }
}

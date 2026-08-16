import cp from 'child_process';
import chalk from 'chalk';
import ora from 'ora';
import { executeAiRequest, buildAiPrompt } from './api';
import { SystemAgent } from './agentEngine';
import { EnvironmentManager } from './envManager';

export class SelfHealer {
    private engine: SystemAgent;
    private maxRetries = 3;

    constructor(engine: SystemAgent) {
        this.engine = engine;
    }

    public async verifyAndHeal(providerOpt: string, buildCommand: string = 'npm run build'): Promise<boolean> {
        try {
            await new EnvironmentManager().ensure(process.cwd());
        } catch (error: any) {
            console.log(chalk.red(`Environment preparation failed: ${error.message}`));
            return false;
        }
        let attempts = 0;

        while (attempts < this.maxRetries) {
            console.log(chalk.cyan(`\n🔧 Verifying Workspace (Attempt ${attempts + 1}/${this.maxRetries})...`));
            const spinner = ora(`Running: ${buildCommand}`).start();
            
            try {
                // Execute build command
                cp.execSync(buildCommand, { cwd: process.cwd(), encoding: 'utf-8', stdio: 'pipe' });
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
                
                const healInstruction = `The previous code changes caused a build error.\n` +
                                        `Command run: ${buildCommand}\n` +
                                        `Error output:\n${errorOutput}\n\n` +
                                        `Please analyze this error and provide JSON actions (write/read/run) to fix it.`;
                
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

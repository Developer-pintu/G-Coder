/**
 * Project: g-coder CLI Tool
 * Author: Developer Pintu
 * License: MIT - Free to use with proper attribution.
 */
import chalk from 'chalk';
import cp from 'child_process';
import ora from 'ora';
import inquirer from 'inquirer';
import { executeAiRequest, buildAiPrompt } from './api';
import { SystemAgent } from './agentEngine';

export class QuantumDebugger {
    private engine: SystemAgent;

    constructor() {
        this.engine = new SystemAgent();
    }

    /**
     * Executes an autonomous git bisect to find the exact historical commit that broke a test,
     * feeds the bad diff to the AI, and formulates a patch in the current timeline.
     */
    public async huntRegression(testCommand: string, goodCommit: string, provider: string) {
        console.log(chalk.magenta.bold(`\n⏱️  [Quantum Debugger] Initiating Time-Travel Git Bisect...`));
        console.log(chalk.gray(`Test Command: ${testCommand}`));
        console.log(chalk.gray(`Good Commit: ${goodCommit}`));

        const spinner = ora('Travelling back in time to find the exact anomaly...').start();
        
        try {
            // 1. Initialize Git Bisect
            cp.execSync('git bisect start', { encoding: 'utf8', stdio: 'ignore' });
            cp.execSync('git bisect bad', { encoding: 'utf8', stdio: 'ignore' }); // Assume current HEAD is bad
            cp.execSync(`git bisect good ${goodCommit}`, { encoding: 'utf8', stdio: 'ignore' });

            // 2. Autonomous Bisect Run
            spinner.text = 'Bisecting history...';
            const bisectLog = cp.execSync(`git bisect run ${testCommand}`, { encoding: 'utf8' });
            spinner.succeed('Time-Travel Complete. Anomaly found!');
            
            // Extract the first bad commit hash
            const match = bisectLog.match(/([a-f0-9]{7,40}) is the first bad commit/i);
            if (!match) {
                console.log(chalk.yellow(`\n⚠ Could not clearly identify the first bad commit. Reverting to present time...`));
                cp.execSync('git bisect reset', { encoding: 'utf8', stdio: 'ignore' });
                return;
            }

            const badCommit = match[1];
            console.log(chalk.red.bold(`\n💀 FIRST BAD COMMIT: ${badCommit}`));

            // 3. Extract the diff of the bad commit
            const diff = cp.execSync(`git show ${badCommit}`, { encoding: 'utf8' });

            console.log(chalk.cyan(`\n🧠 Analyzing the historical anomaly...`));

            // Return to the present timeline BEFORE patching
            cp.execSync('git bisect reset', { encoding: 'utf8', stdio: 'ignore' });
            console.log(chalk.gray(`Timeline restored to present (HEAD).`));

            const prompt = `Act as an Elite Principal Developer. A regression bug was found in this exact historical commit diff:
${diff.substring(0, 8000)}

Analyze the diff, find the logic flaw that broke the tests, and output valid JSON 'patch' actions to fix it in the current timeline. Ensure you use standard file actions.`;

            const res = await executeAiRequest(buildAiPrompt('run', prompt, 'architect'), provider);
            const actions = this.engine.parseActions(res);

            if (actions.length > 0) {
                const { confirm } = await inquirer.prompt([{
                    type: 'confirm',
                    name: 'confirm',
                    message: `Quantum Engine has formulated a mathematical patch for the regression. Apply to current timeline?`,
                    default: true
                }]);

                if (confirm) {
                    await this.engine.executeActions(actions);
                    console.log(chalk.green.bold(`\n✅ Quantum Patch Applied. The timeline is now secure.`));
                }
            } else {
                console.log(chalk.yellow(`\n⚠ Could not formulate a confident patch.`));
            }

        } catch (error: any) {
            spinner.fail('Time-Travel Engine collapsed.');
            console.error(chalk.red(`Error: ${error.message}`));
            try {
                // Ensure we always abort bisect to not leave user in detached state
                cp.execSync('git bisect reset', { stdio: 'ignore' });
            } catch(e) {}
        }
    }
}

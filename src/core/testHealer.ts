/**
 * Project: g-coder CLI Tool
 * Author: Developer Pintu
 * License: MIT - Free to use with proper attribution.
 */
import cp from 'child_process';
import fs from 'fs';
import path from 'path';
import chalk from 'chalk';
import { executeAiRequest, buildAiPrompt } from './api';

export class TestHealer {

    /**
     * Runs tests, parses failure stack traces, and loops AI patching until all pass.
     */
    public async autoHealTests(testCommand: string, provider: string, maxLoops = 3) {
        console.log(chalk.magenta.bold(`\n🧪 Self-Healing Test Simulator Initiated`));
        console.log(chalk.gray(`Running test suite: ${testCommand}`));

        let currentLoop = 0;
        let isGreen = false;

        while (currentLoop < maxLoops && !isGreen) {
            currentLoop++;
            console.log(chalk.cyan(`\n[Cycle ${currentLoop}/${maxLoops}] Executing tests...`));

            try {
                cp.execSync(testCommand, { stdio: 'inherit' });
                console.log(chalk.green.bold(`\n✅ All tests passed! Workspace is stable.`));
                isGreen = true;
            } catch (error: any) {
                console.log(chalk.red(`\n❌ Tests failed. Capturing stack trace for AI Healer...`));
                const stderr = error.stderr ? error.stderr.toString() : error.message;
                const stdout = error.stdout ? error.stdout.toString() : '';
                const fullLog = (stdout + '\n' + stderr).substring(0, 3000);

                // Attempt to parse the failing file from the stack trace
                const fileMatch = fullLog.match(/(src\/[a-zA-Z0-9_\-\/\.]+\.(ts|js|py))/i);
                
                if (fileMatch) {
                    const failingFile = fileMatch[1];
                    console.log(chalk.yellow(`Identified failing module: ${failingFile}`));
                    const absolutePath = path.resolve(process.cwd(), failingFile);

                    if (fs.existsSync(absolutePath)) {
                        const content = fs.readFileSync(absolutePath, 'utf-8');
                        const prompt = `The test suite failed due to an error in this file. 
Fix the logic to make the tests pass. Output ONLY the raw fixed code, no markdown.

Test Output:
${fullLog}

File Content:
${content}`;

                        try {
                            const fixedCode = await executeAiRequest(buildAiPrompt('run', prompt, 'architect'), provider);
                            const cleanCode = fixedCode.replace(/```[a-z]*\n?/gi, '').replace(/```/g, '').trim();
                            fs.writeFileSync(absolutePath, cleanCode, 'utf-8');
                            console.log(chalk.green(`✔ Applied AI patch to ${failingFile}. Re-running tests...`));
                        } catch (e: any) {
                            console.log(chalk.red(`API Error during healing: ${e.message}`));
                            break;
                        }
                    } else {
                        console.log(chalk.yellow(`Could not read ${failingFile}. Healing aborted.`));
                        break;
                    }
                } else {
                    console.log(chalk.yellow(`Could not confidently parse the failing file from stack trace. Manual intervention required.`));
                    break;
                }
            }
        }

        if (!isGreen) {
            console.log(chalk.red.bold(`\n☠ Maximum healing cycles reached or fatal error. Tests are still failing.`));
        }
    }
}

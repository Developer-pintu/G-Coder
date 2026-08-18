/**
 * Project: g-coder CLI Tool
 * Author: Developer Pintu
 * License: MIT - Free to use with proper attribution.
 */
import { spawn } from 'child_process';
import chalk from 'chalk';
import path from 'path';
import fs from 'fs';
import { executeAiRequest, buildAiPrompt } from './api';
import { SystemAgent } from './agentEngine';

export class ExecutionDebugger {
    private engine: SystemAgent;

    constructor() {
        this.engine = new SystemAgent();
    }

    public async debugScript(targetFile: string, provider: string) {
        console.log(chalk.magenta.bold(`\n🐛 [Execution Debugger] Attaching to: ${targetFile}`));

        const absolutePath = path.resolve(process.cwd(), targetFile);
        if (!fs.existsSync(absolutePath)) {
            console.error(chalk.red(`❌ Target file not found: ${absolutePath}`));
            return;
        }

        // Determine runner (node for js/ts, python for py, etc.)
        const ext = path.extname(absolutePath);
        let cmd = 'node';
        if (ext === '.ts') cmd = 'npx ts-node'; // assuming ts-node is available
        else if (ext === '.py') cmd = 'python';

        console.log(chalk.gray(`> Executing: ${cmd} ${targetFile}\n`));

        // Use spawn to capture output
        const parts = cmd.split(' ');
        const executable = parts[0];
        const args = [...parts.slice(1), targetFile];

        const child = spawn(executable, args, { cwd: process.cwd() });
        
        let stdoutData = '';
        let stderrData = '';

        child.stdout.on('data', (data) => {
            process.stdout.write(chalk.white(data.toString()));
            stdoutData += data.toString();
        });

        child.stderr.on('data', (data) => {
            process.stderr.write(chalk.red(data.toString()));
            stderrData += data.toString();
        });

        child.on('close', async (code) => {
            if (code === 0) {
                console.log(chalk.green(`\n✔ Process exited cleanly with code 0. No bugs detected!`));
            } else {
                console.log(chalk.yellow(`\n⚠️ Process crashed with code ${code}. Initiating Time-Travel Debugger...`));
                
                const prompt = `Act as an elite Systems Engineer. I executed the script '${targetFile}' and it crashed.
Here is the runtime execution trace (stderr):
=== CRASH LOG ===
${stderrData.substring(0, 5000)}
=== END LOG ===

And here was the stdout before the crash:
=== STDOUT ===
${stdoutData.substring(0, 2000)}
=== END STDOUT ===

Your task:
1. Analyze the stack trace.
2. Formulate the exact fix.
3. Automatically patch the broken code using 'patch' or 'write' actions in JSON.`;

                const fullPrompt = buildAiPrompt('run', prompt, 'qa');
                
                try {
                    const res = await executeAiRequest(fullPrompt, provider);
                    const actions = this.engine.parseActions(res);

                    if (actions.length > 0) {
                        console.log(chalk.green(`\n✔ Debugger formulated ${actions.length} fixes. Applying patches...`));
                        await this.engine.executeActions(actions);
                        console.log(chalk.cyan(`\n[Debugger] Fix applied! Try running the script again.`));
                    } else {
                        console.log(chalk.yellow(`\nDebugger analyzed the crash but provided no file actions:\n\n${res}`));
                    }
                } catch (error: any) {
                    console.error(chalk.red(`\n❌ Debugging Engine Failed: ${error.message}`));
                }
            }
        });
    }
}

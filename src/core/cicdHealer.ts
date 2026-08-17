import fs from 'fs';
import path from 'path';
import chalk from 'chalk';
import { executeAiRequest, buildAiPrompt } from './api';
import { SystemAgent } from './agentEngine';

export class CicdHealer {
    private engine: SystemAgent;

    constructor() {
        this.engine = new SystemAgent();
    }

    public async healPipeline(logPath: string, provider: string) {
        console.log(chalk.red.bold(`\n🚑 [CI/CD Healer] Analyzing Pipeline Failure Log: ${logPath}`));

        const absolutePath = path.resolve(process.cwd(), logPath);
        if (!fs.existsSync(absolutePath)) {
            console.error(chalk.red(`❌ Log file not found at: ${absolutePath}`));
            return;
        }

        const logContent = fs.readFileSync(absolutePath, 'utf8');
        // Truncate if logs are too massive
        const truncatedLog = logContent.length > 50000 ? logContent.substring(logContent.length - 50000) : logContent;

        const prompt = `Act as an elite DevOps and Systems Engineer. 
I am providing you the raw stderr/stdout logs from a failed CI/CD pipeline (e.g., GitHub Actions, Jenkins). 
Your task is to:
1. Diagnose the exact root cause of the failure.
2. Locate the offending code within my workspace.
3. Automatically patch the code using the appropriate JSON actions (patch/write/run).

Here is the failed log:
=== LOG START ===
${truncatedLog}
=== LOG END ===`;

        const fullPrompt = buildAiPrompt('run', prompt, 'qa');

        try {
            const res = await executeAiRequest(fullPrompt, provider);
            const actions = this.engine.parseActions(res);

            if (actions.length > 0) {
                console.log(chalk.green(`\n✔ Healer generated ${actions.length} automated fixes. Applying patches...`));
                await this.engine.executeActions(actions);
                console.log(chalk.cyan(`\n[CI/CD Healer] Fixes applied! Please commit and re-trigger the pipeline.`));
            } else {
                console.log(chalk.yellow(`\nHealer provided advice but no direct code fixes:\n\n${res}`));
            }
        } catch (error: any) {
            console.error(chalk.red(`\n❌ Healing Failed: ${error.message}`));
        }
    }
}

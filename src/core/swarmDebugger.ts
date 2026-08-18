/**
 * Project: g-coder CLI Tool
 * Author: Developer Pintu
 * License: MIT - Free to use with proper attribution.
 */
import fs from 'fs';
import path from 'path';
import chalk from 'chalk';
import { executeAiRequest, buildAiPrompt } from './api';
import { SystemAgent } from './agentEngine';

export class SwarmDebugger {
    private engine: SystemAgent;

    constructor() {
        this.engine = new SystemAgent();
    }

    public async debateAndFix(targetFile: string, issueDesc: string, provider: string) {
        const absolutePath = path.resolve(process.cwd(), targetFile);
        if (!fs.existsSync(absolutePath)) {
            console.error(chalk.red(`❌ File not found: ${absolutePath}`));
            return;
        }

        console.log(chalk.magenta.bold(`\n🤖 [Swarm Debugger] Initializing AI Debate Swarm...`));
        const fileContent = fs.readFileSync(absolutePath, 'utf8');

        // Step 1: The Architect analyzes the root cause
        console.log(chalk.cyan(`\n🏗️  The Architect is analyzing the architecture...`));
        const architectPrompt = `Act as a Principal Solutions Architect. Analyze this file for the following issue:\nIssue: ${issueDesc}\n\nFile Content:\n${fileContent}\n\nProvide a technical explanation of WHY this is happening and a high-level strategy to fix it. Do not write code yet.`;
        const architectResponse = await executeAiRequest(buildAiPrompt('ask', architectPrompt, 'architect'), provider);
        console.log(chalk.gray(`Architect:\n${architectResponse}\n`));

        // Step 2: The QA Tester critiques the Architect's plan
        console.log(chalk.yellow(`\n🕵️  The QA Tester is finding flaws in the Architect's plan...`));
        const qaPrompt = `Act as an Elite QA Tester. The Architect has proposed this fix strategy:\n\n${architectResponse}\n\nFor the original issue: ${issueDesc}\n\nCritique the Architect's plan. Point out potential edge cases, memory leaks, or logical flaws that the Architect missed.`;
        const qaResponse = await executeAiRequest(buildAiPrompt('ask', qaPrompt, 'qa'), provider);
        console.log(chalk.gray(`QA Tester:\n${qaResponse}\n`));

        // Step 3: The Senior Developer synthesizes the debate and writes the final code
        console.log(chalk.green(`\n👨‍💻 The Senior Developer is writing the bulletproof fix...`));
        const devPrompt = `Act as an Elite Senior Developer.
You are fixing this issue: ${issueDesc} in the file ${absolutePath}.

Here is the Architect's Strategy:
${architectResponse}

Here are the QA Tester's Edge Cases to avoid:
${qaResponse}

Original File Content:
${fileContent}

Synthesize this debate into a bulletproof fix. Output valid JSON 'patch' or 'write' actions to apply the final code safely.`;

        const devResponse = await executeAiRequest(buildAiPrompt('run', devPrompt, 'dev'), provider);
        const actions = this.engine.parseActions(devResponse);

        if (actions.length > 0) {
            console.log(chalk.green.bold(`\n✔ Swarm Consensus Reached! Applying fixes...`));
            await this.engine.executeActions(actions);
            console.log(chalk.cyan(`[Swarm] Fix successfully implemented in ${path.basename(targetFile)}!`));
        } else {
            console.log(chalk.red(`\n❌ Swarm could not reach a consensus or generate a valid patch.`));
        }
    }
}

/**
 * Project: g-coder CLI Tool
 * Author: Developer Pintu
 * License: MIT - Free to use with proper attribution.
 */
import chalk from 'chalk';
import { executeAiRequest, buildAiPrompt } from './api';
import { SystemAgent } from './agentEngine';

export class SwarmEngine {
    private engine: SystemAgent;

    constructor() {
        this.engine = new SystemAgent();
    }

    /**
     * Executes a complex task using a swarm of specialized AI agents:
     * Architect -> Developer -> QA -> Security.
     * @param goal The high-level project goal.
     * @param provider The LLM provider to use.
     */
    public async executeSwarm(goal: string, provider: string): Promise<void> {
        console.log(chalk.magenta.bold(`\n🐝 [SwarmEngine] Initiating Multi-Agent Swarm for Goal: ${goal}`));

        // Step 1: Architect (Planning)
        console.log(chalk.blue.bold(`\n🧑‍💻 [Agent 1: Architect] Designing the system...`));
        const plan = await this.runAgent(
            'architect',
            `Design a comprehensive architecture and execution plan for the following goal: ${goal}. Create necessary structural files (e.g. package.json, tsconfig.json, or folders). Do not implement the core logic yet.`,
            provider
        );

        // Step 2: Developer (Implementation)
        console.log(chalk.blue.bold(`\n👨‍💻 [Agent 2: Developer] Implementing the core logic...`));
        const implementation = await this.runAgent(
            'developer',
            `Based on the Architect's plan, implement the complete core logic for this goal: ${goal}.\nArchitect's Plan summary:\n${plan.substring(0, 500)}...`,
            provider
        );

        // Step 3: QA Engineer (Testing)
        console.log(chalk.blue.bold(`\n🕵️ [Agent 3: QA Engineer] Writing tests and edge cases...`));
        await this.runAgent(
            'qa',
            `The Developer has implemented the logic for: ${goal}. Please write exhaustive unit tests, catch edge cases, and ensure maximum code coverage for the newly created files.`,
            provider
        );

        // Step 4: Security Expert (Audit)
        console.log(chalk.blue.bold(`\n🛡️ [Agent 4: Security Expert] Auditing for vulnerabilities...`));
        await this.runAgent(
            'security',
            `Perform a strict security audit on the codebase for the goal: ${goal}. Look for injection flaws, unhandled exceptions, and insecure dependencies. Patch any vulnerabilities immediately.`,
            provider
        );

        console.log(chalk.green.bold(`\n✅ [SwarmEngine] Swarm execution complete! All agents have successfully fulfilled their roles.`));
    }

    private async runAgent(role: string, prompt: string, provider: string): Promise<string> {
        const fullPrompt = buildAiPrompt('plan', prompt, role);
        const res = await executeAiRequest(fullPrompt, provider);
        
        const actions = this.engine.parseActions(res);
        if (actions.length > 0) {
            console.log(chalk.cyan(`[SwarmEngine] Agent '${role}' proposed ${actions.length} actions. Executing...`));
            await this.engine.executeActions(actions, undefined, { nonInteractive: true });
        } else {
            console.log(chalk.yellow(`[SwarmEngine] Agent '${role}' completed its thought process but proposed no direct file/system actions.`));
        }

        return res;
    }
}

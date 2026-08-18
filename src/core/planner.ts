/**
 * Project: g-coder CLI Tool
 * Author: Developer Pintu
 * License: MIT - Free to use with proper attribution.
 */
import chalk from 'chalk';
import { executeAiRequest, buildAiPrompt } from './api';
import { confirmAction } from './utils';

export interface AgentPlanStep {
    step: number;
    description: string;
}

export class Planner {
    public async createAndConfirmPlan(prompt: string, providerOpt: string): Promise<boolean> {
        console.log(chalk.magenta.bold(`\n🧠 Generating Execution Plan...`));
        
        const planInstruction = `Analyze this task: "${prompt}"\n` +
                                `Output a step-by-step execution plan as a JSON array.\n` +
                                `You must wrap the output EXACTLY in \`\`\`json ... \`\`\`.\n` +
                                `Schema:\n` +
                                `[\n` +
                                `  { "step": 1, "description": "Analyze existing code" },\n` +
                                `  { "step": 2, "description": "Modify file X" }\n` +
                                `]`;
        
        const fullPrompt = buildAiPrompt('plan', planInstruction);
        const res = await executeAiRequest(fullPrompt, providerOpt);
        
        const plan = this.parsePlan(res);
        if (plan.length === 0) {
            console.log(chalk.yellow('Warning: Could not parse a structured plan from the AI. Proceeding with raw execution.'));
            return true;
        }

        console.log(chalk.cyan.bold(`\n📋 Proposed Action Plan:`));
        plan.forEach(p => {
            console.log(chalk.white(`  ${p.step}. `) + chalk.gray(`${p.description}`));
        });
        console.log('');

        const isConfirmed = await confirmAction(chalk.cyan.bold('Do you approve this plan?'));
        if (!isConfirmed) {
            console.log(chalk.yellow('Execution aborted by user.'));
            return false;
        }

        return true;
    }

    private parsePlan(responseText: string): AgentPlanStep[] {
        try {
            const jsonMatch = responseText.match(/```json\s*([\s\S]*?)\s*```/i);
            if (jsonMatch && jsonMatch[1]) {
                const parsed = JSON.parse(jsonMatch[1]);
                if (Array.isArray(parsed)) return parsed;
                if (parsed.actions) return parsed.actions; // fallback
            }
        } catch (e) {
            // fail silently
        }
        return [];
    }
}

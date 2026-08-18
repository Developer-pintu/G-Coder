/**
 * Project: g-coder CLI Tool
 * Author: Developer Pintu
 * License: MIT - Free to use with proper attribution.
 */

import chalk from 'chalk';
import ora from 'ora';
import { executeAiRequest } from './api';
import { OSAutomationEngine } from './osAutomationEngine';
import { MetadataEngine } from './metadataEngine';
import { SelfEvolvingEngine } from './selfEvolvingEngine';
import { WebSearchEngine } from './webSearchEngine';

export class HybridExecutionEngine {
    /**
     * Intelligently routes a user prompt to the optimal execution engine (Local vs Cloud).
     * @param prompt The natural language command from the user
     * @param provider The chosen AI provider for fallback
     */
    public static async analyzeAndExecute(prompt: string, provider: string): Promise<void> {
        const normalizedPrompt = prompt.toLowerCase().trim();

        console.log(chalk.cyan(`\n[Hybrid Engine] Analyzing intent: "${prompt}"...`));

        // 1. OFFLINE-FIRST LOCAL ROUTING (Zero API Tokens, Max Speed)
        
        // Metadata / Forensics Heuristic
        if (normalizedPrompt.includes('metadata') || normalizedPrompt.includes('inspect file') || normalizedPrompt.startsWith('inspect')) {
            const filePathMatch = prompt.match(/(?:metadata|inspect)(?:\s+for)?\s+([^\s]+)/i);
            if (filePathMatch && filePathMatch[1]) {
                const targetFile = filePathMatch[1].replace(/['"]/g, '');
                console.log(chalk.green(`⚡ Routed to [Local Metadata Engine] -> ${targetFile}`));
                try {
                    const metadata = await MetadataEngine.extractMetadata(targetFile);
                    console.log(MetadataEngine.formatAnsi(metadata));
                } catch (e: any) {
                    console.log(chalk.red(`Failed local metadata extraction: ${e.message}`));
                }
                return;
            }
        }

        // OS Automation / Hardware Heuristic
        if (normalizedPrompt.includes('format') || normalizedPrompt.includes('bootable') || normalizedPrompt.includes('list drives') || normalizedPrompt.includes('partition')) {
            console.log(chalk.green(`⚡ Routed to [OS Automation Engine]`));
            
            if (normalizedPrompt.includes('list drives')) {
                const drives = await OSAutomationEngine.detectHardwareSafely();
                console.log(chalk.cyan('\n--- Safe Hardware Detection ---'));
                console.log(drives);
                return;
            }

            const commands = await OSAutomationEngine.parseIntent(prompt, provider);
            await OSAutomationEngine.executeSafely(commands);
            return;
        }

        // Web Search / RAG Heuristic
        if (normalizedPrompt.startsWith('search') || normalizedPrompt.includes('latest version of') || normalizedPrompt.includes('google')) {
            console.log(chalk.green(`⚡ Routed to [Web Search Engine]`));
            const query = prompt.replace(/^(search|google)\s+/i, '');
            const results = await WebSearchEngine.search(query);
            
            if (results.length > 0) {
                const context = WebSearchEngine.buildRagContext(query, results);
                const answerSpinner = ora('Synthesizing search results with AI...').start();
                try {
                    const answer = await executeAiRequest(context, provider);
                    answerSpinner.succeed('Synthesis Complete:');
                    console.log(`\n${chalk.white(answer)}\n`);
                } catch (error: any) {
                    answerSpinner.fail(`Synthesis Failed.`);
                    throw error; // Re-throw to be caught by the command handler
                }
            }
            return;
        }

        // 2. CAPABILITY GAP DETECTION -> SELF-EVOLVING ENGINE
        // If the user explicitly asks to "build a tool to..." or "create a script that..."
        if (normalizedPrompt.startsWith('evolve') || normalizedPrompt.startsWith('synthesize') || normalizedPrompt.includes('create a script that')) {
            console.log(chalk.magenta(`⚡ Routed to [Self-Evolving Engine]`));
            const intent = prompt.replace(/^(evolve|synthesize)\s+/i, '');
            const success = await SelfEvolvingEngine.synthesizeCapability(intent, provider);
            // We assume the generated module name is returned or we just exit after synthesis.
            // For full autonomy, SelfEvolvingEngine handles execution internally.
            if (success) {
                console.log(chalk.green('Evolution successful. Ready for next command.'));
            }
            return;
        }

        // 3. CLOUD AI ROUTING (Fallback for complex logical reasoning, code refactoring, architecture)
        console.log(chalk.blue(`☁️ Routed to [Cloud AI Engine] (Complex Reasoning Required)`));
        const spinner = ora('Engaging Deep Architecture Models...').start();
        try {
            const response = await executeAiRequest(prompt, provider);
            spinner.succeed('Execution Complete:');
            console.log(`\n${chalk.white(response)}\n`);
        } catch (error: any) {
            spinner.fail(`Cloud Execution Failed: ${error.message}`);
        }
    }
}

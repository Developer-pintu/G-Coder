import chalk from 'chalk';
import { executeAiRequest, buildAiPrompt } from './api';
import { PolyglotEngine } from './polyglotEngine';

export class QaEngine {
    
    public async askOmniscientMentor(question: string, provider: string, contextFile?: string) {
        console.log(chalk.magenta.bold(`\n🧠 [Omniscient QA Mentor] Analyzing architecture...`));

        let fileContext = '';
        let guardrails = '';
        if (contextFile) {
            const polyglot = new PolyglotEngine();
            try {
                const chunks = polyglot.chunkFileSyntactically(contextFile, 1500);
                fileContext = `\nContext File (${polyglot.detectLanguage(contextFile)}):\n${chunks[0]}\n`;
                guardrails = polyglot.getCompilerGuardrails(polyglot.detectLanguage(contextFile));
            } catch (e: any) {
                console.log(chalk.yellow(`⚠ Could not load context file: ${e.message}`));
            }
        }

        const prompt = `Act as an Infallible Principal Systems Architect and Global Mentor.
The developer is asking a conceptual, architectural, or algorithmic question.
Provide a mathematically and structurally precise, production-grade answer.
Use markdown, code snippets, and provide trade-off analysis (Pros/Cons) where applicable.
${guardrails}

Question:
${question}
${fileContext}`;

        try {
            console.log(chalk.cyan(`Synthesizing elite knowledge...`));
            const response = await executeAiRequest(buildAiPrompt('ask', prompt, 'architect'), provider);
            
            console.log(chalk.green(`\n=========================================\n`));
            console.log(chalk.white(response));
            console.log(chalk.green(`\n=========================================\n`));
        } catch (e: any) {
            console.error(chalk.red(`❌ QA Engine Error: ${e.message}`));
        }
    }
}

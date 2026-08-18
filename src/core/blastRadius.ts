/**
 * Project: g-coder CLI Tool
 * Author: Developer Pintu
 * License: MIT - Free to use with proper attribution.
 */
import chalk from 'chalk';
import { executeAiRequest, buildAiPrompt } from './api';

export class BlastRadiusPredictor {
    /**
     * Analyzes the AST/diff to predict the blast radius of a change before pushing.
     */
    public static async analyze(diff: string, provider: string): Promise<boolean> {
        console.log(chalk.cyan(`\n💥 Running AST Blast-Radius Prediction...`));
        
        const prompt = `Analyze this git diff and predict its blast radius (impact on other files). 
Output ONLY a JSON object: {"isHighRisk": boolean, "affectedFiles": ["file1", "file2"], "reason": "why"}.
Diff:
${diff.substring(0, 3000)}`;

        try {
            const rawResponse = await executeAiRequest(buildAiPrompt('ask', prompt), provider);
            
            // Extract JSON
            const match = rawResponse.match(/\{[\s\S]*\}/);
            if (match) {
                const result = JSON.parse(match[0]);
                if (result.isHighRisk) {
                    console.log(chalk.bgYellow.black.bold(`\n ⚠ HIGH BLAST RADIUS WARNING `));
                    console.log(chalk.yellow(`Reason: ${result.reason}`));
                    console.log(chalk.gray(`Affected Files: ${result.affectedFiles.join(', ')}`));
                    console.log(chalk.red(`Pushing this without updating dependents may break production!`));
                    // Returning true means "Risk Detected"
                    return true; 
                }
            }
            console.log(chalk.green(`✔ Blast Radius is Low. Safe to proceed.`));
            return false;
        } catch (e) {
            // Failsafe: if AI fails, proceed normally
            console.log(chalk.gray(`Blast Radius prediction skipped.`));
            return false;
        }
    }
}

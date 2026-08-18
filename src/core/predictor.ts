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

export class Predictor {
    private lastBranch: string = '';

    public async watchBranches(provider: string) {
        console.log(chalk.magenta.bold(`\n🔮 [Neural Predictor] Activated! Monitoring git branch events...`));
        const gitHeadPath = path.resolve(process.cwd(), '.git', 'HEAD');
        
        if (!fs.existsSync(gitHeadPath)) {
            console.error(chalk.red(`❌ Not a git repository. Predictor requires git to monitor branches.`));
            return;
        }

        this.lastBranch = this.getCurrentBranch();
        
        fs.watch(gitHeadPath, async () => {
            const currentBranch = this.getCurrentBranch();
            if (currentBranch && currentBranch !== this.lastBranch) {
                console.log(chalk.cyan(`\n🔮 Branch change detected: -> `) + chalk.white(currentBranch));
                this.lastBranch = currentBranch;
                await this.preFetchCode(currentBranch, provider);
            }
        });
    }

    private getCurrentBranch(): string {
        try {
            return cp.execSync('git rev-parse --abbrev-ref HEAD', { encoding: 'utf8' }).trim();
        } catch (e) {
            return '';
        }
    }

    private async preFetchCode(branchName: string, provider: string) {
        // e.g. feature/stripe-webhook
        if (branchName === 'main' || branchName === 'master') return;

        console.log(chalk.gray(`[Predictor] Analyzing branch intent...`));
        const shadowDir = path.resolve(process.cwd(), '.gcode_shadow');
        if (!fs.existsSync(shadowDir)) fs.mkdirSync(shadowDir, { recursive: true });

        const prompt = `Act as an Elite Predictive AI. The developer just switched to a new git branch: ${branchName}.
Predict what 2 foundational files (TypeScript/JavaScript) the developer will most likely need to create for this feature.
Output ONLY a JSON array of objects. Example:
[
  { "filename": "stripeWebhook.ts", "content": "export const webhookHandler..." },
  { "filename": "stripeTypes.ts", "content": "export interface Event..." }
]
Do not output markdown block ticks, just the pure JSON.`;

        try {
            const res = await executeAiRequest(buildAiPrompt('ask', prompt, 'architect'), provider);
            const cleanJson = res.replace(/```json/g, '').replace(/```/g, '').trim();
            const predictions = JSON.parse(cleanJson);

            for (const file of predictions) {
                const shadowPath = path.join(shadowDir, file.filename);
                fs.writeFileSync(shadowPath, file.content, 'utf8');
                console.log(chalk.green(`✔ Predicted & Cached: ${file.filename}`));
            }
            console.log(chalk.cyan(`[Predictor] Pre-fetch complete. Files ready in .gcode_shadow/`));
        } catch (e: any) {
            console.log(chalk.yellow(`⚠ Predictive generation skipped due to limit/parse error.`));
        }
    }
}

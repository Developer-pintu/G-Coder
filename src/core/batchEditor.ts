import chalk from 'chalk';
import fse from 'fs-extra';
import path from 'path';
import { executeAiRequest, buildAiPrompt } from './api';
import { SystemAgent } from './agentEngine';
import { Planner } from './planner';
import { GitGuard } from './gitGuard';
import { SelfHealer } from './selfHealer';

export class BatchEditor {
    private engine: SystemAgent;
    private planner: Planner;
    private gitGuard: GitGuard;
    private healer: SelfHealer;

    constructor() {
        this.engine = new SystemAgent();
        this.planner = new Planner();
        this.gitGuard = new GitGuard();
        this.healer = new SelfHealer(this.engine);
    }

    public async editBatch(prompt: string, files: string[], providerOpt: string, noHeal: boolean = false) {
        console.log(chalk.magenta.bold(`\n📚 Initializing Batch Multi-File Editor...`));
        
        let batchContext = `The user wants to edit the following files atomically based on this prompt: "${prompt}"\n\n`;
        
        for (const file of files) {
            const absPath = path.resolve(process.cwd(), file);
            if (fse.existsSync(absPath)) {
                const content = fse.readFileSync(absPath, 'utf-8');
                batchContext += `--- FILE: ${file} ---\n${content}\n--------------------\n\n`;
            } else {
                console.log(chalk.yellow(`Warning: Target file not found, will be created: ${file}`));
                batchContext += `--- FILE: ${file} (NEW FILE) ---\n\n`;
            }
        }

        const fullInstruction = `${prompt}\n\nBatch Files Context:\n${batchContext}`;

        // 1. Plan Phase
        const isPlanApproved = await this.planner.createAndConfirmPlan(fullInstruction, providerOpt);
        if (!isPlanApproved) return;

        // 2. Git Checkpoint Phase
        this.gitGuard.checkpoint();

        // 3. Execution Phase
        console.log(chalk.magenta.bold(`\n⚙️ Executing Atomic Batch Edit...`));
        const fullPrompt = buildAiPrompt('run', fullInstruction);
        const res = await executeAiRequest(fullPrompt, providerOpt);
        
        const actions = this.engine.parseActions(res);
        let executionSuccess = true;

        if (actions.length > 0) {
            try {
                await this.engine.executeActions(actions);
            } catch (e: any) {
                console.log(chalk.red(`Execution Error: ${e.message}`));
                executionSuccess = false;
            }
        } else {
            console.log(chalk.yellow('[BatchEditor] No specific file writes were proposed by the AI.'));
        }

        // 4. Self-Healing Verification Phase
        if (executionSuccess && !noHeal) {
            const hasPackageJson = fse.existsSync(path.join(process.cwd(), 'package.json'));
            if (hasPackageJson) {
                const buildPassed = await this.healer.verifyAndHeal(providerOpt, 'npm run build');
                if (!buildPassed) executionSuccess = false;
            }
        }

        // 5. Atomic Cleanup/Rollback
        if (executionSuccess) {
            this.gitGuard.cleanup();
            console.log(chalk.green.bold(`\n✅ Atomic Batch Edit completed successfully!`));
        } else {
            console.log(chalk.red.bold(`\n❌ Batch task failed or rejected. Rolling back all files.`));
            this.gitGuard.rollback();
        }
    }
}

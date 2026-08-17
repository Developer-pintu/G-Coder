import fs from 'fs';
import path from 'path';
import chalk from 'chalk';
import cp from 'child_process';
import { executeAiRequest, buildAiPrompt } from './api';
import { SystemAgent } from './agentEngine';

export class HologramRefactor {
    private engine: SystemAgent;

    constructor() {
        this.engine = new SystemAgent();
    }

    public async executeHologram(targetTerm: string, provider: string) {
        console.log(chalk.magenta.bold(`\n🌌 [Hologram Engine] Initializing Holographic Project Refactor...`));
        console.log(chalk.gray(`Targeting all files dependent on: ${targetTerm}`));

        // 1. Ripgrep equivalent via node to find all files containing the term
        const srcDir = path.resolve(process.cwd(), 'src');
        if (!fs.existsSync(srcDir)) {
            console.error(chalk.red(`❌ Cannot find 'src' directory.`));
            return;
        }

        const filesToRefactor: string[] = [];
        this.searchFiles(srcDir, targetTerm, filesToRefactor);

        if (filesToRefactor.length === 0) {
            console.log(chalk.yellow(`⚠ No dependencies found for '${targetTerm}'.`));
            return;
        }

        console.log(chalk.cyan(`\nFound ${filesToRefactor.length} dependent files. Loading Hologram into Memory...`));

        // 2. Load into virtual memory (JSON Map)
        let virtualFileSystem = '';
        for (const file of filesToRefactor) {
            const relPath = path.relative(process.cwd(), file);
            virtualFileSystem += `\n--- FILE: ${relPath} ---\n${fs.readFileSync(file, 'utf8')}\n`;
        }

        // 3. AI Atomic Refactor
        console.log(chalk.cyan(`Applying architectural rewrite to Hologram...`));
        const prompt = `Act as an Elite Principal Architect. I need to universally refactor the entity/term '${targetTerm}' across this entire project hologram.
I want you to automatically deduce the best modern, clean architecture pattern for it and apply the refactor safely to ALL these files.

Virtual File System (Hologram):
${virtualFileSystem.substring(0, 8000)} // Truncated for safety

Output valid JSON 'patch' or 'write' actions for each file modified.`;

        try {
            const res = await executeAiRequest(buildAiPrompt('run', prompt, 'architect'), provider);
            const actions = this.engine.parseActions(res);

            if (actions.length > 0) {
                console.log(chalk.green(`\n✔ Hologram successfully mutated! Applying atomic disk transaction...`));
                await this.engine.executeActions(actions);
                console.log(chalk.green.bold(`✅ Project-wide Refactor Complete.`));
            } else {
                console.log(chalk.yellow(`⚠ AI could not formulate a safe holographic patch.`));
            }
        } catch (e: any) {
            console.log(chalk.red(`\n❌ Hologram Engine Failed: ${e.message}`));
        }
    }

    private searchFiles(dir: string, term: string, result: string[]) {
        const files = fs.readdirSync(dir);
        for (const file of files) {
            const fullPath = path.join(dir, file);
            if (fs.statSync(fullPath).isDirectory()) {
                this.searchFiles(fullPath, term, result);
            } else if (fullPath.match(/\.(ts|js|tsx|jsx)$/)) {
                const content = fs.readFileSync(fullPath, 'utf8');
                if (content.includes(term)) {
                    result.push(fullPath);
                }
            }
        }
    }
}

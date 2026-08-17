import fs from 'fs';
import path from 'path';
import chalk from 'chalk';
import cp from 'child_process';
import { executeAiRequest, buildAiPrompt } from './api';
import { SystemAgent } from './agentEngine';

export class GhostCoder {
    private engine: SystemAgent;
    private isProcessing: boolean = false;
    private debounceTimers: Map<string, NodeJS.Timeout> = new Map();

    constructor() {
        this.engine = new SystemAgent();
    }

    public async watchWorkspace(provider: string) {
        const targetDir = path.resolve(process.cwd(), 'src');
        if (!fs.existsSync(targetDir)) {
            console.error(chalk.red(`❌ Could not find 'src' directory to watch.`));
            return;
        }

        console.log(chalk.cyan.bold(`\n👻 [Ghost Coder v2] Activated! Watching for Magic Tags in ${targetDir}`));
        console.log(chalk.gray(`Tags supported: // TODO:, // FIX:, // REFACTOR:, // SECURE:, // OPTIMIZE:, // CREATE:`));
        console.log(chalk.gray(`Press Ctrl+C to exit.\n`));

        fs.watch(targetDir, { recursive: true }, (eventType, filename) => {
            if (!filename || !filename.match(/\.(ts|js|tsx|jsx)$/)) return;
            
            const absolutePath = path.join(targetDir, filename);
            if (!fs.existsSync(absolutePath)) return;

            if (this.debounceTimers.has(absolutePath)) {
                clearTimeout(this.debounceTimers.get(absolutePath)!);
            }

            this.debounceTimers.set(absolutePath, setTimeout(() => {
                this.processFile(absolutePath, provider);
            }, 1000));
        });
    }

    private extractLocalImports(content: string, baseDir: string): string {
        const importRegex = /import\s+.*?\s+from\s+['"](\..*?)['"]/g;
        let match;
        let injectedContext = "";

        while ((match = importRegex.exec(content)) !== null) {
            const importPath = match[1];
            try {
                // Try to resolve the actual file (.ts, .js)
                const resolvedPath = require.resolve(path.resolve(baseDir, importPath), { paths: [baseDir] });
                if (resolvedPath && fs.existsSync(resolvedPath)) {
                    const importedContent = fs.readFileSync(resolvedPath, 'utf8');
                    injectedContext += `\n--- Context from ${importPath} ---\n${importedContent.substring(0, 1500)}\n`;
                }
            } catch (e) {
                // Ignore resolve errors gracefully
            }
        }
        return injectedContext;
    }

    private async runSelfHealingVerification(provider: string, originalContent: string, filePath: string, retries = 1): Promise<boolean> {
        try {
            console.log(chalk.gray(`[Ghost] Verifying syntax using tsc...`));
            cp.execSync('npx tsc --noEmit', { stdio: 'pipe' });
            return true; // No errors
        } catch (error: any) {
            const stderr = error.stdout ? error.stdout.toString() : error.message;
            if (retries <= 0) {
                console.log(chalk.red(`❌ Self-Healing failed. Reverting file...`));
                fs.writeFileSync(filePath, originalContent, 'utf8');
                return false;
            }

            console.log(chalk.yellow(`⚠ Syntax error detected! Self-healing (Retries left: ${retries})...`));
            const currentContent = fs.readFileSync(filePath, 'utf8');

            const prompt = `Act as an Elite TypeScript Developer. You recently updated this file, but it introduced a compilation error.
File: ${filePath}
Error:
${stderr}

Current Content:
${currentContent}

Output valid JSON actions (patch or write) to fix the error.`;

            const fullPrompt = buildAiPrompt('run', prompt);
            try {
                const res = await executeAiRequest(fullPrompt, provider);
                const actions = this.engine.parseActions(res);
                if (actions.length > 0) {
                    await this.engine.executeActions(actions);
                    return await this.runSelfHealingVerification(provider, originalContent, filePath, retries - 1);
                }
            } catch (e) {}

            fs.writeFileSync(filePath, originalContent, 'utf8');
            return false;
        }
    }

    private async processFile(filePath: string, provider: string) {
        if (this.isProcessing) return;

        try {
            const content = fs.readFileSync(filePath, 'utf8');
            
            // Magic Action Tags Parser
            const magicRegex = /\/\/\s*(TODO|FIX|REFACTOR|SECURE|OPTIMIZE|CREATE):\s*(.+)/i;
            const blockRegex = /\/\*\s*(TODO|FIX|REFACTOR|SECURE|OPTIMIZE|CREATE):\s*(.+?)\s*\*\//i;
            
            const match = content.match(magicRegex) || content.match(blockRegex);

            if (match && match[1] && match[2]) {
                const tagType = match[1].toUpperCase();
                const instruction = match[2].trim();
                
                console.log(chalk.magenta(`\n👻 Ghost Coder detected [${tagType}] in ${path.basename(filePath)}:`));
                console.log(chalk.white(`   "${instruction}"`));

                this.isProcessing = true;
                
                // Intelligent Cross-File Context Injection
                console.log(chalk.gray(`[Ghost] Analyzing cross-file imports for context...`));
                const context = this.extractLocalImports(content, path.dirname(filePath));
                
                const prompt = `Act as an elite Developer. I have placed a ${tagType} tag in the following file:
File: ${filePath}

Instruction: ${instruction}

Your task is to implement the exact code required by the instruction.
- You may update the current file using 'patch' or 'write' actions.
- You MUST remove the magic comment after fulfilling it.
- If the instruction requires creating new files (like new components), you CAN output multiple 'write' actions to create them simultaneously.

File Content:
${content}

${context ? `External Dependencies Context:\n${context}` : ''}`;

                const fullPrompt = buildAiPrompt('run', prompt);
                const res = await executeAiRequest(fullPrompt, provider);
                const actions = this.engine.parseActions(res);

                if (actions.length > 0) {
                    await this.engine.executeActions(actions);
                    console.log(chalk.cyan(`[Ghost] Code applied. Verifying integrity...`));
                    
                    const success = await this.runSelfHealingVerification(provider, content, filePath);
                    
                    if (success) {
                        console.log(chalk.green(`✔ Ghost Coder successfully implemented the [${tagType}] instruction!`));
                    }
                } else {
                    console.log(chalk.yellow(`⚠ Ghost Coder could not generate a patch for this instruction.`));
                }
            }
        } catch (e: any) {
            console.error(chalk.red(`Ghost Coder error: ${e.message}`));
        } finally {
            this.isProcessing = false;
        }
    }
}

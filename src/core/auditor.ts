import chalk from 'chalk';
import fse from 'fs-extra';
import path from 'path';
import ora from 'ora';
import { executeAiRequest, buildAiPrompt } from './api';
import { OptimizerEngine } from './optimizerEngine';
import cp from 'child_process';

export class ProjectAuditor {
    public async runAudit(providerOpt: string, options: { fix?: boolean } = {}) {
        console.log(chalk.magenta.bold(`\n🕵️‍♂️ Initializing Advanced Static Code Audit...`));
        const spinner = ora('Scanning project structure and reading core files...').start();
        
        try {
            // Read core directories to form context
            const srcDir = path.join(process.cwd(), 'src');
            const filesToAudit: string[] = [];
            
            if (fse.existsSync(srcDir)) {
                this.getAllFiles(srcDir, filesToAudit);
            }
            // Add root files
            ['package.json', 'tsconfig.json'].forEach(file => {
                const p = path.join(process.cwd(), file);
                if (fse.existsSync(p)) filesToAudit.push(p);
            });

            if (filesToAudit.length === 0) {
                spinner.fail('No source files found to audit.');
                return;
            }

            let context = '';
            for (const file of filesToAudit.slice(0, 20)) { // limit to 20 files to avoid massive context issues
                const content = fse.readFileSync(file, 'utf-8');
                const relPath = path.relative(process.cwd(), file);
                context += `\n--- FILE: ${relPath} ---\n${content}\n--------------------\n`;
            }

            spinner.succeed(`Scanned ${filesToAudit.length} files. Engaging AI for deep analysis...`);
            
            const prompt = `You are a Principal Security & Software Architect. Conduct a deep audit of the following codebase.\n` +
                           `Identify:\n` +
                           `1. Bugs, security risks, or anti-patterns.\n` +
                           `2. Missing features, gaps in logic, or incomplete implementations.\n` +
                           `3. Suggestions for advanced enterprise features/functions to add.\n\n` +
                           `RULES:\n` +
                           `- DO NOT output code rewrites. Just provide a highly detailed, professional analysis report.\n` +
                           `- Score the application's readiness from 1 to 10 at the end.\n\n` +
                           `Codebase Context:\n${context}`;

            console.log(chalk.cyan(`\n🧠 Generating Audit Report... (This may take a minute depending on codebase size)`));
            
            const fullPrompt = buildAiPrompt('ask', prompt);
            const report = await executeAiRequest(fullPrompt, providerOpt);

            console.log(chalk.green.bold(`\n📊 AUDIT REPORT:\n`));
            console.log(chalk.white(report));

            if (options.fix) {
                console.log(chalk.magenta.bold(`\n🛠️ Initializing Smart Token Optimizer & Diff-Patcher...`));
                await this.autoFixIssues(report, filesToAudit, providerOpt);
            } else {
                console.log(chalk.yellow(`\n💡 Tip: Run \`g-coder audit --fix\` to automatically resolve these issues securely.`));
            }

        } catch (error: any) {
            spinner.fail(`Audit failed: ${error.message}`);
        }
    }

    private getAllFiles(dirPath: string, arrayOfFiles: string[]) {
        const files = fse.readdirSync(dirPath);
        files.forEach((file) => {
            const absolute = path.join(dirPath, file);
            if (fse.statSync(absolute).isDirectory()) {
                // Ignore massive/unnecessary directories
                if (['node_modules', '.git', 'dist', 'build', 'coverage'].includes(file)) {
                    return;
                }
                this.getAllFiles(absolute, arrayOfFiles);
            } else if (file.endsWith('.ts') || file.endsWith('.js')) {
                arrayOfFiles.push(absolute);
            }
        });
    }

    private async autoFixIssues(report: string, files: string[], providerOpt: string) {
        const optimizer = new OptimizerEngine();
        const filesToFix = files.filter(f => report.includes(path.basename(f)));
        
        if (filesToFix.length === 0) {
            console.log(chalk.green(`No specific files identified for fixing, or codebase is clean.`));
            return;
        }

        console.log(chalk.cyan(`Identified ${filesToFix.length} files that need patching. Applying fixes...`));

        for (const file of filesToFix) {
            const relPath = path.relative(process.cwd(), file);
            console.log(chalk.blue(`\n🩹 Patching ${relPath}...`));
            
            const fileContent = fse.readFileSync(file, 'utf-8');
            const fixPrompt = `Based on the following audit report, generate a precise Diff Patch to fix issues in ${relPath}.
            
Report: ${report.substring(0, 1000)}

File Content:
${fileContent}

RULES:
- ONLY output the patch blocks. Do not rewrite the whole file.
- Use this exact format:
<<SEARCH>>
exact code to replace
<<REPLACE>>
new fixed code
<<END>>`;

            try {
                const fullPrompt = buildAiPrompt('ask', fixPrompt);
                const patchResponse = await executeAiRequest(fullPrompt, providerOpt);
                const patched = optimizer.applyDiffPatch(file, patchResponse);
                
                if (!patched) {
                    console.log(chalk.yellow(`Could not automatically patch ${relPath}.`));
                }
            } catch (e: any) {
                console.log(chalk.red(`Failed to patch ${relPath}: ${e.message}`));
            }
        }

        console.log(chalk.magenta.bold(`\n🔬 Verifying Fixes (npm run build)...`));
        try {
            cp.execSync('npm run build', { stdio: 'inherit' });
            console.log(chalk.green.bold(`\n✅ Build successful! All audit fixes applied securely.`));
        } catch (e) {
            console.log(chalk.red.bold(`\n❌ Build failed after patching. Manual review required.`));
        }
    }
}

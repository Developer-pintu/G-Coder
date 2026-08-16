import chalk from 'chalk';
import fse from 'fs-extra';
import path from 'path';
import ora from 'ora';
import { executeAiRequest, buildAiPrompt } from './api';

export class ProjectAuditor {
    public async runAudit(providerOpt: string) {
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
            console.log(chalk.yellow(`\n💡 Tip: If you agree with these suggestions, you can run \`g-coder run "<suggestion>"\` to implement them.`));

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
}

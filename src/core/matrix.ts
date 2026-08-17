import fs from 'fs';
import path from 'path';
import chalk from 'chalk';
import { executeAiRequest, buildAiPrompt } from './api';
import { SystemAgent } from './agentEngine';

export class MatrixEngine {
    private engine: SystemAgent;

    constructor() {
        this.engine = new SystemAgent();
    }

    public async refactorDependencies(componentName: string, provider: string) {
        console.log(chalk.blue.bold(`\n🕸️  [Monorepo Maestro] Searching for dependencies of: ${componentName}`));

        const files: string[] = [];
        this.getAllFiles(process.cwd(), files);

        // Simple heuristic: search for the component name in file contents
        const dependentFiles = files.filter(f => {
            const content = fs.readFileSync(f, 'utf8');
            return content.includes(componentName);
        });

        if (dependentFiles.length === 0) {
            console.log(chalk.yellow(`No files found importing or using ${componentName}.`));
            return;
        }

        console.log(chalk.green(`✔ Found ${dependentFiles.length} dependent files. Formulating atomic mass-refactor...`));

        const prompt = `Act as an elite Systems Architect managing a massive monorepo.
I have recently modified the core component/module: '${componentName}'.
The following files depend on it and likely need to be updated to match the new API/signature.

Dependent files:
${dependentFiles.map(f => `- ${f}`).join('\n')}

Your task is to:
1. Understand how they might be using '${componentName}'.
2. Write 'patch' or 'write' actions in JSON to safely update all of them simultaneously.
Be precise and atomic.`;

        const fullPrompt = buildAiPrompt('run', prompt, 'architect');
        
        try {
            const res = await executeAiRequest(fullPrompt, provider);
            const actions = this.engine.parseActions(res);

            if (actions.length > 0) {
                console.log(chalk.green(`\n✔ Matrix Engine formulated ${actions.length} synchronized updates. Executing...`));
                await this.engine.executeActions(actions);
                console.log(chalk.cyan(`\n[Matrix] Mass-refactor complete!`));
            } else {
                console.log(chalk.yellow(`\nMatrix Engine analyzed the files but suggested no changes:\n\n${res}`));
            }
        } catch (error: any) {
            console.error(chalk.red(`\n❌ Matrix Engine Failed: ${error.message}`));
        }
    }

    private getAllFiles(dirPath: string, arrayOfFiles: string[]) {
        const files = fs.readdirSync(dirPath);

        files.forEach((file) => {
            if (fs.statSync(path.join(dirPath, file)).isDirectory()) {
                if (file !== 'node_modules' && file !== '.git' && file !== 'dist' && file !== 'build') {
                    this.getAllFiles(path.join(dirPath, file), arrayOfFiles);
                }
            } else {
                if (file.endsWith('.ts') || file.endsWith('.js') || file.endsWith('.tsx') || file.endsWith('.jsx') || file.endsWith('.py')) {
                    arrayOfFiles.push(path.join(dirPath, file));
                }
            }
        });
    }
}

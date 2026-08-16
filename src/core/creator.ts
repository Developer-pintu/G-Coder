import chalk from 'chalk';
import inquirer from 'inquirer';
import fse from 'fs-extra';
import path from 'path';
import cp from 'child_process';
import ora from 'ora';
import { executeAiRequest, buildAiPrompt } from './api';
import { confirmAction } from './utils';
import { PreviewEngine } from './previewEngine';
import { PromptEnhancer } from './promptEnhancer';
import { StateManager } from './stateManager';

export interface BlueprintFile {
    path: string;
    description: string;
}

export class ProjectCreator {
    public async createProject(prompt: string, providerOpt: string) {
        console.log(chalk.magenta.bold(`\n🚀 Initializing Zero-Knowledge Project Generator...`));
        const originalPrompt = prompt;
        prompt = new PromptEnhancer().enhance(prompt).enhanced;
        const stateManager = new StateManager();
        stateManager.start(originalPrompt, prompt);

        // 1. Get Project Name
        const { projectName } = await inquirer.prompt([{
            type: 'input',
            name: 'projectName',
            message: chalk.cyan('Enter a name for your new project folder (or press Enter for current dir):'),
            default: '.'
        }]);

        const outDir = path.resolve(process.cwd(), projectName);

        // 2. Blueprint Phase
        console.log(chalk.cyan(`\n🧠 Architecting Application Blueprint...`));
        const blueprint = await this.generateBlueprint(prompt, providerOpt);
        
        if (blueprint.length === 0) {
            console.log(chalk.red('Failed to generate a valid project blueprint. Aborting.'));
            return;
        }

        console.log(chalk.green.bold(`\n📁 Proposed Project Structure:`));
        this.displayTree(blueprint, projectName);
        console.log('');

        const isConfirmed = await confirmAction(chalk.yellow.bold(`Ready to generate this application?`));
        if (!isConfirmed) {
            console.log(chalk.yellow('Project creation aborted.'));
            return;
        }

        // 3. Generation Phase
        fse.ensureDirSync(outDir);
        console.log(chalk.magenta.bold(`\n⚡ Generating Files...`));

        // Create a summary of the blueprint to pass as context
        const blueprintContext = blueprint.map(b => `- ${b.path}: ${b.description}`).join('\n');

        const generatePromises = blueprint.map(async (file) => {
            const spinner = ora(`Generating ${chalk.white.bold(file.path)}...`).start();
            try {
                const fileCode = await this.generateFileContent(file, prompt, blueprintContext, providerOpt);
                const fullPath = path.join(outDir, file.path);
                fse.outputFileSync(fullPath, fileCode);
                stateManager.recordStep(`create:${file.path}`, `Generated ${file.path}`, file.path);
                spinner.succeed(`Created ${chalk.white(file.path)}`);
            } catch (error: any) {
                spinner.fail(`Failed to generate ${chalk.red(file.path)}: ${error.message}`);
            }
        });

        await Promise.all(generatePromises);

        // 4. Dependency Setup
        const packageJsonPath = path.join(outDir, 'package.json');
        if (fse.existsSync(packageJsonPath)) {
            console.log(chalk.cyan.bold(`\n📦 Installing Dependencies...`));
            try {
                cp.execSync('npm install', { cwd: outDir, stdio: 'inherit' });
                console.log(chalk.green(`✔ Dependencies installed successfully.`));
            } catch (err: any) {
                console.log(chalk.red(`\n✖ npm install failed. You may need to run it manually.`));
            }
        }

        console.log(chalk.green.bold(`\n🎉 Project Generation Complete! Your app is ready at:`));
        console.log(chalk.white(outDir));
        stateManager.complete();

        // 5. Visual Preview Phase
        const wantPreview = await confirmAction(chalk.yellow.bold(`\n📸 Do you want me to capture and show a visual preview screenshot?`));
        if (wantPreview) {
            const preview = new PreviewEngine();
            await preview.capturePreview(outDir);
        }
    }

    private async generateBlueprint(prompt: string, providerOpt: string): Promise<BlueprintFile[]> {
        const instruction = `Create a comprehensive file blueprint for this application: "${prompt}"\n` +
                            `Return ONLY a JSON array of objects, where each object has 'path' (relative file path) and 'description' (what the file does and what exports it has).\n` +
                            `Ensure you include all necessary configuration files like package.json, tsconfig.json, etc. if it's a web/Node app.\n` +
                            `Wrap the output EXACTLY in \`\`\`json ... \`\`\`.`;
        
        const fullPrompt = buildAiPrompt('plan', instruction);
        const res = await executeAiRequest(fullPrompt, providerOpt);
        
        try {
            const jsonMatch = res.match(/```json\s*([\s\S]*?)\s*```/i);
            if (jsonMatch && jsonMatch[1]) {
                return JSON.parse(jsonMatch[1]);
            }
            // fallback
            return JSON.parse(res);
        } catch (e) {
            return [];
        }
    }

    private async generateFileContent(file: BlueprintFile, overallPrompt: string, blueprintContext: string, providerOpt: string): Promise<string> {
        const instruction = `You are an elite coding agent. Your task is to generate the EXACT complete file content for: ${file.path}\n` +
                            `This file's purpose: ${file.description}\n\n` +
                            `Overall Project Goal: ${overallPrompt}\n\n` +
                            `Project Architecture Context:\n${blueprintContext}\n\n` +
                            `RULES:\n` +
                            `1. Output ONLY the raw source code for ${file.path}.\n` +
                            `2. Do NOT use markdown code blocks (\`\`\`javascript) around the file content. Just the raw text/code.\n` +
                            `3. Do NOT add any conversational text before or after the code.\n` +
                            `4. Ensure the code is production-ready, complete, and properly handles imports/exports according to the Project Architecture Context.`;
                            
        const fullPrompt = buildAiPrompt('ask', instruction);
        let res = await executeAiRequest(fullPrompt, providerOpt);
        
        // Strip markdown if the AI stubbornly included it
        res = res.trim();
        if (res.startsWith('```')) {
            const lines = res.split('\n');
            lines.shift(); // remove first ```lang line
            if (lines[lines.length - 1].startsWith('```')) {
                lines.pop(); // remove last ``` line
            }
            res = lines.join('\n');
        }
        
        return res;
    }

    private displayTree(blueprint: BlueprintFile[], rootName: string) {
        console.log(chalk.cyan(rootName === '.' ? process.cwd() : rootName));
        blueprint.forEach((file, index) => {
            const isLast = index === blueprint.length - 1;
            const prefix = isLast ? '└── ' : '├── ';
            console.log(chalk.gray(prefix) + chalk.white(file.path) + chalk.gray(` - ${file.description.substring(0, 50)}`));
        });
    }
}

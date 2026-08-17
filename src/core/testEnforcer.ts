import fs from 'fs';
import path from 'path';
import chalk from 'chalk';
import { executeAiRequest, buildAiPrompt } from './api';
import { SystemAgent } from './agentEngine';
import { confirmAction } from './utils';

export class TestEnforcer {
    private engine: SystemAgent;

    constructor() {
        this.engine = new SystemAgent();
    }

    public async enforceCoverage(targetDir: string, provider: string) {
        console.log(chalk.magenta.bold(`\n🧪 [Test Enforcer] Scanning workspace for missing tests in: ${targetDir}`));

        const absoluteDir = path.resolve(process.cwd(), targetDir);
        if (!fs.existsSync(absoluteDir)) {
            console.error(chalk.red(`❌ Target directory not found: ${absoluteDir}`));
            return;
        }

        const files: string[] = [];
        this.getAllSourceFiles(absoluteDir, files);

        const filesWithoutTests = files.filter(f => {
            const ext = path.extname(f);
            const baseName = path.basename(f, ext);
            const dir = path.dirname(f);
            
            // Check for standard test naming conventions
            const hasTest = fs.existsSync(path.join(dir, `${baseName}.test${ext}`)) || 
                            fs.existsSync(path.join(dir, `${baseName}.spec${ext}`));
            return !hasTest;
        });

        if (filesWithoutTests.length === 0) {
            console.log(chalk.green.bold(`\n✅ 100% Test Coverage! No files are missing tests.`));
            return;
        }

        console.log(chalk.yellow(`\n⚠ Found ${filesWithoutTests.length} files missing test coverage.`));
        const confirm = await confirmAction(chalk.yellow.bold(`Do you want G-Coder to autonomously generate Jest/Vitest suites for ALL these files?`));

        if (!confirm) {
            console.log(chalk.gray(`Test enforcement aborted.`));
            return;
        }

        for (const file of filesWithoutTests) {
            console.log(chalk.cyan(`\n🧪 Generating tests for: ${path.basename(file)}...`));
            
            try {
                const content = fs.readFileSync(file, 'utf8');
                const testFilePath = file.replace(path.extname(file), `.test${path.extname(file)}`);

                const prompt = `Act as an Elite QA Automation Engineer.
I have a source file that currently lacks unit tests.

Target File: ${file}
Content:
${content}

Your task:
1. Understand the logic, edge cases, and exported functions in this file.
2. Write a comprehensive Jest/Vitest test suite for it.
3. Automatically mock any external dependencies (like 'fs', 'axios', or other internal modules) so the tests run cleanly in isolation.
4. Output a JSON 'write' action to create the test file exactly at: ${testFilePath}`;

                const fullPrompt = buildAiPrompt('run', prompt, 'qa');
                const res = await executeAiRequest(fullPrompt, provider);
                const actions = this.engine.parseActions(res);

                if (actions.length > 0) {
                    await this.engine.executeActions(actions);
                    console.log(chalk.green(`✔ Created test suite: ${path.basename(testFilePath)}`));
                } else {
                    console.log(chalk.yellow(`⚠ Could not generate tests for ${path.basename(file)}.`));
                }

                // Add a small delay to avoid hammering the API
                await new Promise(r => setTimeout(r, 2000));

            } catch (e: any) {
                console.error(chalk.red(`Failed to generate tests for ${file}: ${e.message}`));
            }
        }

        console.log(chalk.green.bold(`\n🎉 Test Enforcement Complete! Run your testing framework (e.g., 'npm test') to verify.`));
    }

    private getAllSourceFiles(dirPath: string, arrayOfFiles: string[]) {
        const files = fs.readdirSync(dirPath);

        files.forEach((file) => {
            const absolutePath = path.join(dirPath, file);
            if (fs.statSync(absolutePath).isDirectory()) {
                if (!file.match(/node_modules|\.git|dist|build|coverage|__tests__/)) {
                    this.getAllSourceFiles(absolutePath, arrayOfFiles);
                }
            } else {
                if (file.match(/\.(ts|js|tsx|jsx)$/) && !file.match(/\.(test|spec)\.(ts|js|tsx|jsx)$/) && !file.endsWith('.d.ts')) {
                    arrayOfFiles.push(absolutePath);
                }
            }
        });
    }
}

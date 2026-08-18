/**
 * Project: g-coder CLI Tool
 * Author: Developer Pintu
 * License: MIT - Free to use with proper attribution.
 */

import * as fs from 'fs';
import * as path from 'path';
import chalk from 'chalk';
import ora from 'ora';
import inquirer from 'inquirer';
import crossSpawn from 'cross-spawn';
import { executeAiRequest } from './api';

export class SelfEvolvingEngine {
    private static SANDBOX_DIR = path.resolve(process.cwd(), '.g-coder-capabilities');

    /**
     * Initializes the sandbox directory for dynamically generated capabilities.
     */
    private static initSandbox() {
        if (!fs.existsSync(this.SANDBOX_DIR)) {
            fs.mkdirSync(this.SANDBOX_DIR, { recursive: true });
            // Add a local package.json to the sandbox to manage dynamic dependencies safely
            fs.writeFileSync(path.join(this.SANDBOX_DIR, 'package.json'), JSON.stringify({
                name: "g-coder-dynamic-capabilities",
                version: "1.0.0",
                private: true,
                dependencies: {}
            }, null, 2));
        }
    }

    /**
     * Checks if a specific dynamic capability exists in the sandbox.
     */
    public static hasCapability(capabilityName: string): boolean {
        const capabilityPath = path.join(this.SANDBOX_DIR, `${capabilityName}.ts`);
        return fs.existsSync(capabilityPath);
    }

    /**
     * Synthesizes a new module/script on the fly using the LLM.
     * @param intent The missing capability required
     * @param provider LLM provider
     */
    public static async synthesizeCapability(intent: string, provider: string): Promise<boolean> {
        this.initSandbox();
        
        console.log(chalk.yellow(`\n⚠️  [g-coder Self-Evolve]: Missing dynamic capability detected.`));
        console.log(chalk.gray(`> Goal: ${intent}`));

        // 1. Intelligent Developer Communication
        const { confirm } = await inquirer.prompt([
            {
                type: 'confirm',
                name: 'confirm',
                message: 'Would you like me to generate, install dependencies, and execute this module automatically?',
                default: false
            }
        ]);

        if (!confirm) {
            console.log(chalk.red('Self-evolution aborted. Fallback to standard error pipeline.'));
            return false;
        }

        const spinner = ora('Architecting new capability...').start();

        const prompt = `
You are the Self-Evolving Engine inside g-coder.
The user requested a capability that does not exist in the current codebase: "${intent}"
You must write a standalone Node.js TypeScript script to accomplish this exactly.

Requirements:
1. Return ONLY a valid JSON object. Do not include markdown blocks outside the JSON.
2. The JSON object must match this schema:
{
  "moduleName": "camelCaseNameOfCapability",
  "dependencies": ["list", "of", "npm", "packages", "required"],
  "code": "The raw TypeScript code as a single string. Use standard imports. Ensure it is self-executing or exports a main function we can call."
}
3. The code MUST be safe, robust, and handle errors.
`;

        try {
            const rawResponse = await executeAiRequest(prompt, provider);
            
            const jsonMatch = rawResponse.match(/\{[\s\S]*\}/);
            if (!jsonMatch) throw new Error("Failed to parse synthesized capability JSON.");
            
            const payload = JSON.parse(jsonMatch[0]);
            
            spinner.succeed(`Architected dynamic capability: ${chalk.cyan(payload.moduleName)}`);
            
            // 2. Auto-Patching Dependencies
            if (payload.dependencies && payload.dependencies.length > 0) {
                const depSpinner = ora(`Installing dynamic dependencies: ${payload.dependencies.join(', ')}...`).start();
                await new Promise<void>((resolve, reject) => {
                    const child = crossSpawn('npm', ['install', ...payload.dependencies], { cwd: this.SANDBOX_DIR });
                    child.on('close', code => code === 0 ? resolve() : reject(new Error(`npm install failed with code ${code}`)));
                });
                depSpinner.succeed('Dependencies installed into sandbox.');
            }

            // 3. Save the synthesized code
            const modulePath = path.join(this.SANDBOX_DIR, `${payload.moduleName}.ts`);
            fs.writeFileSync(modulePath, payload.code);
            console.log(chalk.green(`✔ Synthesized logic securely saved to sandbox: ${modulePath}`));
            
            return true;
        } catch (error: any) {
            spinner.fail(chalk.red(`Self-evolution failed: ${error.message}`));
            return false;
        }
    }

    /**
     * Executes a dynamically generated capability from the sandbox.
     */
    public static async executeCapability(capabilityName: string, args: string[] = []): Promise<void> {
        const modulePath = path.join(this.SANDBOX_DIR, `${capabilityName}.ts`);
        if (!fs.existsSync(modulePath)) {
            console.error(chalk.red(`Capability ${capabilityName} not found in sandbox.`));
            return;
        }

        console.log(chalk.cyan(`\n⚡ Executing Dynamic Capability: ${capabilityName}...`));
        
        return new Promise<void>((resolve, reject) => {
            // Using ts-node to execute the raw typescript dynamically
            const child = crossSpawn('npx', ['ts-node', modulePath, ...args], { stdio: 'inherit', cwd: this.SANDBOX_DIR });
            child.on('close', code => {
                if (code === 0) {
                    console.log(chalk.green(`\n✔ Capability execution completed successfully.`));
                    resolve();
                } else {
                    console.error(chalk.red(`\n✖ Capability execution failed with exit code ${code}.`));
                    reject(new Error(`Execution failed`));
                }
            });
        });
    }
}

/**
 * Project: g-coder CLI Tool
 * Author: Developer Pintu
 * License: MIT - Free to use with proper attribution.
 */

import crossSpawn from 'cross-spawn';
import inquirer from 'inquirer';
import chalk from 'chalk';
import ora from 'ora';
import { executeAiRequest } from './api';
import * as os from 'os';

export interface OsCommand {
    description: string;
    executable: string;
    args: string[];
}

export class OSAutomationEngine {
    /**
     * Translates a natural language intent into a sequence of safe OS commands.
     * @param intent The natural language intent (e.g. "Make 8GB pendrive Windows bootable")
     * @param provider The LLM provider to use for translation
     * @returns A parsed list of commands
     */
    static async parseIntent(intent: string, provider: string): Promise<OsCommand[]> {
        const spinner = ora('Analyzing system intent and generating safe commands...').start();
        
        const platform = os.platform();
        const prompt = `
You are an expert Operating System Automation Engineer.
The user wants to perform the following action on their system: "${intent}"
Their OS platform is: ${platform}

Return a valid JSON array of commands required to achieve this. Do NOT include markdown blocks around the JSON, just the JSON array.
If the action is destructive (like formatting a drive), ensure the commands use standard, built-in CLI tools (like diskpart/powershell on Windows, or diskutil on Mac) but DO NOT auto-confirm them. Provide safe, step-by-step commands.
Ensure arguments are separated correctly as an array of strings.
Format exactly like this:
[
  { "description": "What this step does", "executable": "command", "args": ["arg1", "arg2"] }
]
`;

        try {
            const rawResponse = await executeAiRequest(prompt, provider);
            
            // Clean markdown if the LLM wraps it in JSON code blocks
            const jsonMatch = rawResponse.match(/\[[\s\S]*\]/);
            if (!jsonMatch) {
                throw new Error("Could not parse JSON commands from AI response.");
            }
            
            const commands: OsCommand[] = JSON.parse(jsonMatch[0]);
            spinner.succeed(chalk.green(`Successfully mapped intent to ${commands.length} OS commands.`));
            return commands;
        } catch (error: any) {
            spinner.fail(chalk.red(`Failed to parse intent: ${error.message}`));
            return [];
        }
    }

    /**
     * Safe hardware detection using native OS commands to list drives and partitions.
     * Useful for safely showing the user their connected drives before they format anything.
     */
    static async detectHardwareSafely(): Promise<string> {
        return new Promise((resolve, reject) => {
            const platform = os.platform();
            let executable = '';
            let args: string[] = [];
            
            if (platform === 'win32') {
                // Use PowerShell to securely get disk info without launching interactive diskpart prompts
                executable = 'powershell';
                args = ['-NoProfile', '-Command', 'Get-Disk | Select-Object Number, FriendlyName, Size, OperationalStatus | ConvertTo-Json'];
            } else if (platform === 'darwin') {
                executable = 'diskutil';
                args = ['list'];
            } else {
                executable = 'lsblk';
                args = ['-o', 'NAME,SIZE,TYPE,MOUNTPOINT'];
            }

            const child = crossSpawn(executable, args);
            let output = '';

            child.stdout?.on('data', data => output += data.toString());
            child.stderr?.on('data', data => output += data.toString());

            child.on('close', code => {
                if (code === 0) {
                    resolve(output.trim());
                } else {
                    reject(new Error(`Hardware detection failed with code ${code}: ${output}`));
                }
            });
        });
    }

    /**
     * Executes a list of parsed OS commands sequentially with strict user confirmation safeguards.
     * @param commands The sequence of commands to run
     */
    static async executeSafely(commands: OsCommand[]): Promise<void> {
        if (commands.length === 0) {
            console.log(chalk.yellow('No commands to execute.'));
            return;
        }

        console.log(chalk.cyan.bold('\n--- OS Automation Execution Plan ---'));
        
        // Explicitly print the execution plan to the terminal
        commands.forEach((cmd, idx) => {
            console.log(chalk.white(`\nStep ${idx + 1}: ${cmd.description}`));
            console.log(chalk.gray(`> ${cmd.executable} ${cmd.args.join(' ')}`));
        });

        console.log(chalk.yellow.bold('\n⚠️  WARNING: You are about to execute system-level commands. Ensure you have reviewed them carefully.'));
        
        // Strict explicit confirmation safeguard
        const { confirm } = await inquirer.prompt([
            {
                type: 'confirm',
                name: 'confirm',
                message: 'Do you want to safely proceed with this execution plan?',
                default: false
            }
        ]);

        if (!confirm) {
            console.log(chalk.red('\nExecution aborted by user. No system changes were made. Stay safe!'));
            return;
        }

        console.log(chalk.green('\nStarting safe execution...\n'));

        // Step-by-Step execution with progress UI
        for (let i = 0; i < commands.length; i++) {
            const cmd = commands[i];
            const stepSpinner = ora(`Executing: ${cmd.description}...`).start();

            try {
                await new Promise<void>((resolve, reject) => {
                    const child = crossSpawn(cmd.executable, cmd.args, { stdio: 'pipe' });
                    
                    let errorLog = '';
                    child.stderr?.on('data', data => {
                        errorLog += data.toString();
                    });

                    child.on('close', code => {
                        if (code === 0) {
                            resolve();
                        } else {
                            reject(new Error(`Command failed with code ${code}\nLog: ${errorLog.trim()}`));
                        }
                    });
                });
                
                stepSpinner.succeed(chalk.green(`Completed: ${cmd.description}`));
            } catch (error: any) {
                stepSpinner.fail(chalk.red(`Failed: ${cmd.description}`));
                console.error(chalk.red(`Error details: ${error.message}`));
                console.log(chalk.yellow('\nHalting remaining execution pipeline for safety to prevent data corruption.'));
                break;
            }
        }
        
        console.log(chalk.cyan.bold('\n--- OS Automation Complete ---\n'));
    }
}

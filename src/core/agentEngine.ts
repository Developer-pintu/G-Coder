/**
 * Project: g-coder CLI Tool
 * Author: Developer Pintu
 * License: MIT - Free to use with proper attribution.
 */
import * as fse from 'fs-extra';
import * as path from 'path';
import chalk from 'chalk';
import ignore from 'ignore';
import { confirmAction } from './utils';
import { OptimizerEngine } from './optimizerEngine';
import { PermissionProfile, PolicyEngine } from './policyEngine';
import { CommandRunner } from './commandRunner';
import { SandboxManager } from './sandboxManager';
import { PatchValidator } from './patchValidator';

export interface Action {
    type: 'write' | 'read' | 'delete' | 'move' | 'run' | 'patch' | 'done';
    path?: string;
    destination?: string;
    content?: string;
    command?: string;
    executable?: string;
    args?: string[];
    cwd?: string;
    timeoutMs?: number;
    patchBlock?: string;
}

export class SystemAgent {
    private cwd: string;

    constructor() {
        this.cwd = process.cwd();
    }

    /**
     * Resolves a path. If it's absolute, returns as-is. If relative, resolves against current cwd.
     */
    private resolvePath(p: string): string {
        return path.isAbsolute(p) ? p : path.resolve(this.cwd, p);
    }

    /**
     * Scans the workspace to provide context to the LLM.
     */
    public scanWorkspace(): string {
        let structure = '';
        try {
            const ig = ignore();
            const gitignorePath = path.join(this.cwd, '.gitignore');
            if (fse.existsSync(gitignorePath)) {
                ig.add(fse.readFileSync(gitignorePath, 'utf8'));
            }
            ig.add(['node_modules', '.git']);

            const items = fse.readdirSync(this.cwd);
            // Filter using ignore rules
            structure = items.filter(i => {
                try { return !ig.ignores(i); } catch (e) { return true; }
            }).join(', ');
        } catch (e) {
            structure = 'Failed to read directory.';
        }
        return `Current Workspace: ${this.cwd}\nDirectory Tree: ${structure}\n`;
    }

    /**
     * Reads contents of files mentioned in the prompt to provide better context.
     * Supports absolute paths.
     */
    public readMentionedFiles(prompt: string): string {
        return ''; // Disabled to enforce lazy loading (tool calling) and reduce token waste
    }

    /**
     * Parses the LLM output for structured JSON actions.
     */
    public parseActions(llmResponse: string): Action[] {
        const actions: Action[] = [];
        const jsonMatch = llmResponse.match(/```json\s*(\{[\s\S]*?\})\s*```/);

        if (jsonMatch && jsonMatch[1]) {
            try {
                const parsed = JSON.parse(jsonMatch[1]);
                if (parsed.actions && Array.isArray(parsed.actions)) {
                    return parsed.actions;
                }
            } catch (e) {
                console.log(chalk.yellow('[SystemAgent] Failed to parse JSON block from AI. Response might be plain text.'));
            }
        }
        return actions;
    }

    /**
     * Confirms and executes actions safely with strict human-in-the-loop permission.
     * Captures and returns the execution output to feed back into the AI loop.
     */
    public async executeActions(
        actions: Action[],
        onActionComplete?: (action: Action, index: number) => void,
        options: { dryRun?: boolean; nonInteractive?: boolean; permission?: PermissionProfile; sandbox?: boolean } = {}
    ): Promise<{ success: boolean, output: string }> {
        if (actions.length === 0) return { success: true, output: 'No actions to execute.' };
        const optimizer = new OptimizerEngine();
        const policy = new PolicyEngine(this.cwd, options.permission ?? 'workspace-write');
        const commandRunner = new CommandRunner(this.cwd);
        const sandboxManager = new SandboxManager(this.cwd, commandRunner);
        const patchValidator = new PatchValidator(this.cwd);

        console.log(chalk.blue('\n[SystemAgent] The AI wants to perform the following system actions:\n'));

        let executionOutput = '';
        let hadFailure = false;

        let hasDangerousAction = false;
        let actionDescriptions: string[] = [];

        for (const action of actions) {
            if (action.type === 'done') continue;
            if (action.type === 'run' && !action.executable) {
                console.log(chalk.red('[Policy] Legacy shell command strings are prohibited. The AI must provide executable and args.'));
                return { success: false, output: 'Policy denied an unstructured shell command.' };
            }
            const decision = policy.evaluate({ action: action.type as any, target: action.type === 'run' ? action.cwd : action.path, executable: action.executable, args: action.args });
            if (!decision.allowed || (options.nonInteractive && decision.risk === 'high')) {
                console.log(chalk.red(`[Policy] ${decision.reason}`));
                return { success: false, output: `Policy denied ${action.type}: ${decision.reason}` };
            }
            if (action.type === 'move' && action.destination) {
                const destination = policy.evaluate({ action: 'move', target: action.destination });
                if (!destination.allowed) return { success: false, output: `Policy denied move destination: ${destination.reason}` };
            }
        }

        actions.forEach((action, idx) => {
            if (action.type === 'write') {
                const target = this.resolvePath(action.path || '');
                console.log(chalk.yellow(` ${idx + 1}. WRITE FILE: ${target}`));
                actionDescriptions.push(`Write to ${target}`);
                hasDangerousAction = true;
            } else if (action.type === 'read') {
                const target = this.resolvePath(action.path || '');
                console.log(chalk.cyan(` ${idx + 1}. READ FILE/DIR: ${target}`));
            } else if (action.type === 'delete') {
                const target = this.resolvePath(action.path || '');
                console.log(chalk.red(` ${idx + 1}. DELETE: ${target}`));
                actionDescriptions.push(`Delete ${target}`);
                hasDangerousAction = true;
            } else if (action.type === 'move') {
                const src = this.resolvePath(action.path || '');
                const dest = this.resolvePath(action.destination || '');
                console.log(chalk.magenta(` ${idx + 1}. MOVE: ${src} -> ${dest}`));
                actionDescriptions.push(`Move ${src} to ${dest}`);
                hasDangerousAction = true;
            } else if (action.type === 'patch') {
                const target = this.resolvePath(action.path || '');
                console.log(chalk.yellow(` ${idx + 1}. PATCH FILE: ${target}`));
                actionDescriptions.push(`Patch ${target}`);
                hasDangerousAction = true;
            } else if (action.type === 'run') {
                const rendered = [action.executable, ...(action.args ?? [])].join(' ');
                const displayCmd = rendered.length > 80 ? rendered.substring(0, 80) + '...' : rendered;
                console.log(chalk.red.bold(` ${idx + 1}. RUN COMMAND: ${displayCmd}`));
                actionDescriptions.push(`Run command: ${displayCmd}`);
                hasDangerousAction = true;
            } else if (action.type === 'done') {
                console.log(chalk.green(` ${idx + 1}. TASK DONE`));
            }
        });

        if (options.dryRun) {
            console.log(chalk.cyan('\n[Dry Run] Policy validation passed; no actions were executed.'));
            return { success: true, output: 'Dry run completed without side effects.' };
        }

        if (hasDangerousAction && !options.nonInteractive) {
            console.log(chalk.red.bold(`\n⚠️ DANGER: You are about to execute modifications or system commands:`));
            actionDescriptions.forEach(desc => console.log(chalk.red(`   - ${desc}`)));
            console.log('');

            const isConfirmed = await confirmAction(chalk.red.bold('Are you sure you want to proceed?'));
            if (!isConfirmed) {
                console.log(chalk.yellow('Actions aborted by user. Safety first.'));
                return { success: false, output: 'Execution aborted by user.' };
            }
        } else if (!hasDangerousAction && !options.nonInteractive) {
            const isConfirmed = await confirmAction(chalk.cyan('Do you want to allow these read actions?'));
            if (!isConfirmed) {
                console.log(chalk.yellow('Actions aborted by user.'));
                return { success: false, output: 'Execution aborted by user.' };
            }
        }

        console.log(chalk.green('\nExecuting Actions...'));
        for (const [index, action] of actions.entries()) {
            let completed = false;
            try {
                if (action.type === 'write' && action.path && action.content) {
                    const target = this.resolvePath(action.path);
                    fse.outputFileSync(target, action.content, 'utf-8');
                    console.log(chalk.green(`✔ Successfully Wrote: ${target}`));
                    executionOutput += `\n[WRITE SUCCESS] ${target}`;
                    completed = true;
                } else if (action.type === 'read' && action.path) {
                    const target = this.resolvePath(action.path);
                    if (fse.existsSync(target)) {
                        const stat = fse.statSync(target);
                        if (stat.isFile()) {
                            const content = fse.readFileSync(target, 'utf-8');
                            console.log(chalk.cyan(`✔ Read File: ${target} (${content.length} chars)`));
                            executionOutput += `\n[READ FILE ${target}]\n${content}\n`;
                            completed = true;
                        } else {
                            const items = fse.readdirSync(target);
                            console.log(chalk.cyan(`✔ Read Directory: ${target}\nContents: ${items.join(', ')}`));
                            executionOutput += `\n[READ DIR ${target}]\n${items.join(', ')}\n`;
                            completed = true;
                        }
                    } else {
                        console.log(chalk.yellow(`✖ Read Failed: Path not found: ${target}`));
                        executionOutput += `\n[READ FAILED] Path not found: ${target}`;
                    }
                } else if (action.type === 'delete' && action.path) {
                    const target = this.resolvePath(action.path);
                    fse.removeSync(target);
                    console.log(chalk.green(`✔ Successfully Deleted: ${target}`));
                    executionOutput += `\n[DELETE SUCCESS] ${target}`;
                    completed = true;
                } else if (action.type === 'move' && action.path && action.destination) {
                    const src = this.resolvePath(action.path);
                    const dest = this.resolvePath(action.destination);
                    fse.moveSync(src, dest, { overwrite: true });
                    console.log(chalk.green(`✔ Successfully Moved: ${src} -> ${dest}`));
                    executionOutput += `\n[MOVE SUCCESS] ${src} -> ${dest}`;
                    completed = true;
                } else if (action.type === 'patch' && action.path && action.patchBlock) {
                    const validation = patchValidator.validate(action.path, action.patchBlock);
                    if (!validation.valid) throw new Error(`Patch policy rejected: ${validation.reason}`);
                    const patched = optimizer.applyDiffPatch(action.path, action.patchBlock);
                    if (!patched) {
                        hadFailure = true;
                        console.log(chalk.red(`✖ Failed to apply precise diff patch to: ${action.path}`));
                        executionOutput += `\n[PATCH FAILED] Could not apply patch to ${action.path}. Ensure <<SEARCH>> block exactly matches existing file contents.`;
                    } else {
                        executionOutput += `\n[PATCH SUCCESS] ${action.path}`;
                        completed = true;
                    }
                } else if (action.type === 'run' && action.executable) {
                    const rendered = [action.executable, ...(action.args ?? [])].join(' ');
                    const displayCmd = rendered.length > 60 ? rendered.substring(0, 60) + '...' : rendered;
                    console.log(chalk.cyan(`► Running: ${displayCmd}`));
                    try {
                        const structured = { executable: action.executable, args: action.args, cwd: action.cwd, timeoutMs: action.timeoutMs };
                        const result = options.sandbox ? await sandboxManager.run(structured) : await commandRunner.run(structured);
                        console.log(chalk.gray(result.stdout));
                        if (result.exitCode !== 0) throw new Error(result.stderr || `Command exited with ${result.exitCode}`);
                        console.log(chalk.green(`✔ Command Success`));
                        executionOutput += `\n[RUN: ${rendered}]\nSTDOUT:\n${result.stdout}\n`;
                        completed = true;
                    } catch (cmdErr: any) {
                        hadFailure = true;
                        console.log(chalk.red(`✖ Command Failed`));
                        executionOutput += `\n[RUN FAILED: ${rendered}]\nERROR:\n${cmdErr.message}\n`;
                    }
                } else if (action.type === 'done') {
                    executionOutput += `\n[TASK DONE]`;
                    completed = true;
                }
                if (completed) onActionComplete?.(action, index);
            } catch (e: any) {
                hadFailure = true;
                console.error(chalk.red(`✖ Action Failed [${action.type}]: ${e.message}`));
                executionOutput += `\n[ACTION FAILED ${action.type}] ${e.message}`;
            }
        }
        console.log(chalk.green('\nAll authorized actions completed.\n'));
        return { success: !hadFailure, output: executionOutput };
    }
}

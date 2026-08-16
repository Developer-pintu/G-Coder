import * as fse from 'fs-extra';
import * as path from 'path';
import * as cp from 'child_process';
import inquirer from 'inquirer';
import chalk from 'chalk';
import ignore from 'ignore';
import { confirmAction } from './utils';
import { OptimizerEngine } from './optimizerEngine';

export interface Action {
    type: 'write' | 'read' | 'delete' | 'move' | 'run' | 'patch';
    path?: string;
    destination?: string;
    content?: string;
    command?: string;
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
        let pkgContext = '';
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

            const pkgPath = path.join(this.cwd, 'package.json');
            if (fse.existsSync(pkgPath)) {
                pkgContext = `\npackage.json Snippet: ${fse.readFileSync(pkgPath, 'utf8').substring(0, 500)}...`;
            }
        } catch (e) {
            structure = 'Failed to read directory.';
        }
        return `Current Workspace: ${this.cwd}\nFiles: ${structure}${pkgContext}\n`;
    }

    /**
     * Reads contents of files mentioned in the prompt to provide better context.
     * Supports absolute paths.
     */
    public readMentionedFiles(prompt: string): string {
        // Broad regex to catch absolute windows paths like C:/foo or relative ./foo
        const pathRegex = /(?:[A-Za-z]:[\\/]|(?:\.?\/?[\w-]+\/)*)[\w-]+\.\w+/gi;
        const matches = prompt.match(pathRegex) || [];

        let fileContexts = '';
        const uniquePaths = [...new Set(matches)];

        for (const p of uniquePaths) {
            const absolutePath = this.resolvePath(p);
            if (fse.existsSync(absolutePath) && fse.statSync(absolutePath).isFile()) {
                try {
                    const content = fse.readFileSync(absolutePath, 'utf8');
                    fileContexts += `\n--- Contents of ${absolutePath} ---\n${content}\n------------------------\n`;
                } catch (e) {
                    // skip
                }
            }
        }

        return fileContexts;
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
     */
    public async executeActions(actions: Action[]): Promise<void> {
        if (actions.length === 0) return;
        const optimizer = new OptimizerEngine();

        console.log(chalk.blue('\n[SystemAgent] The AI wants to perform the following system actions:\n'));

        let hasDangerousAction = false;
        let actionDescriptions: string[] = [];

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
                const displayCmd = action.command && action.command.length > 60
                    ? action.command.substring(0, 60) + '... (script hidden for UI)'
                    : action.command;
                console.log(chalk.red.bold(` ${idx + 1}. RUN COMMAND: ${displayCmd}`));
                actionDescriptions.push(`Run command: ${displayCmd}`);
                hasDangerousAction = true;
            }
        });

        if (hasDangerousAction) {
            console.log(chalk.red.bold(`\n⚠️ DANGER: You are about to execute modifications or system commands:`));
            actionDescriptions.forEach(desc => console.log(chalk.red(`   - ${desc}`)));
            console.log('');

            const isConfirmed = await confirmAction(chalk.red.bold('Are you sure you want to proceed?'));
            if (!isConfirmed) {
                console.log(chalk.yellow('Actions aborted by user. Safety first.'));
                return;
            }
        } else {
            const isConfirmed = await confirmAction(chalk.cyan('Do you want to allow these read actions?'));
            if (!isConfirmed) {
                console.log(chalk.yellow('Actions aborted by user.'));
                return;
            }
        }

        console.log(chalk.green('\nExecuting Actions...'));
        for (const action of actions) {
            try {
                if (action.type === 'write' && action.path && action.content) {
                    const target = this.resolvePath(action.path);
                    fse.outputFileSync(target, action.content, 'utf-8');
                    console.log(chalk.green(`✔ Successfully Wrote: ${target}`));
                } else if (action.type === 'read' && action.path) {
                    const target = this.resolvePath(action.path);
                    if (fse.existsSync(target)) {
                        const stat = fse.statSync(target);
                        if (stat.isFile()) {
                            const content = fse.readFileSync(target, 'utf-8');
                            console.log(chalk.cyan(`✔ Read File: ${target} (${content.length} chars)`));
                        } else {
                            const items = fse.readdirSync(target);
                            console.log(chalk.cyan(`✔ Read Directory: ${target}\nContents: ${items.join(', ')}`));
                        }
                    } else {
                        console.log(chalk.yellow(`✖ Read Failed: Path not found: ${target}`));
                    }
                } else if (action.type === 'delete' && action.path) {
                    const target = this.resolvePath(action.path);
                    fse.removeSync(target);
                    console.log(chalk.green(`✔ Successfully Deleted: ${target}`));
                } else if (action.type === 'move' && action.path && action.destination) {
                    const src = this.resolvePath(action.path);
                    const dest = this.resolvePath(action.destination);
                    fse.moveSync(src, dest, { overwrite: true });
                    console.log(chalk.green(`✔ Successfully Moved: ${src} -> ${dest}`));
                } else if (action.type === 'patch' && action.path && action.patchBlock) {
                    const patched = optimizer.applyDiffPatch(action.path, action.patchBlock);
                    if (!patched) {
                        console.log(chalk.red(`✖ Failed to apply precise diff patch to: ${action.path}`));
                    }
                } else if (action.type === 'run' && action.command) {
                    const displayCmd = action.command.length > 60
                        ? action.command.substring(0, 60) + '...'
                        : action.command;
                    console.log(chalk.cyan(`► Running: ${displayCmd}`));
                    const out = cp.execSync(action.command, { cwd: this.cwd, encoding: 'utf-8', stdio: 'pipe' });
                    console.log(chalk.gray(out));
                    console.log(chalk.green(`✔ Command Success`));
                }
            } catch (e: any) {
                console.error(chalk.red(`✖ Action Failed [${action.type}]: ${e.message}`));
            }
        }
        console.log(chalk.green('\nAll authorized actions completed.\n'));
    }
}

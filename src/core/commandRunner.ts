import cp from 'child_process';
import path from 'path';

export interface StructuredCommand {
    executable: string;
    args?: string[];
    cwd?: string;
    timeoutMs?: number;
    env?: Record<string, string>;
}

export interface CommandExecutionResult {
    exitCode: number;
    stdout: string;
    stderr: string;
    durationMs: number;
    timedOut: boolean;
}

export class CommandRunner {
    constructor(private readonly workspace: string = process.cwd()) {}

    public run(command: StructuredCommand): Promise<CommandExecutionResult> {
        const cwd = path.resolve(this.workspace, command.cwd ?? '.');
        const relation = path.relative(this.workspace, cwd);
        if (relation.startsWith('..') || path.isAbsolute(relation)) return Promise.reject(new Error('Command working directory is outside the workspace.'));
        const timeoutMs = Math.min(Math.max(command.timeoutMs ?? 120_000, 1000), 30 * 60_000);
        const started = Date.now();
        return new Promise((resolve, reject) => {
            const child = cp.spawn(command.executable, command.args ?? [], {
                cwd,
                shell: false,
                windowsHide: true,
                env: { ...process.env, ...(command.env ?? {}) },
                stdio: ['ignore', 'pipe', 'pipe']
            });
            let stdout = '';
            let stderr = '';
            let timedOut = false;
            const timer = setTimeout(() => { timedOut = true; child.kill('SIGTERM'); }, timeoutMs);
            child.stdout.on('data', chunk => { stdout = (stdout + chunk.toString()).slice(-500_000); });
            child.stderr.on('data', chunk => { stderr = (stderr + chunk.toString()).slice(-500_000); });
            child.once('error', error => { clearTimeout(timer); reject(error); });
            child.once('close', code => {
                clearTimeout(timer);
                resolve({ exitCode: code ?? 1, stdout, stderr, durationMs: Date.now() - started, timedOut });
            });
        });
    }
}

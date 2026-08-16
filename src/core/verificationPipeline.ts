import fse from 'fs-extra';
import path from 'path';
import { CommandRunner, StructuredCommand } from './commandRunner';

export interface VerificationCheck { name: string; command: StructuredCommand; status: 'passed' | 'failed' | 'skipped'; durationMs: number; output?: string; }
export interface VerificationReport { passed: boolean; checks: VerificationCheck[]; }

export class VerificationPipeline {
    constructor(private readonly workspace: string = process.cwd(), private readonly runner = new CommandRunner(workspace)) {}
    public detect(): Array<{ name: string; command: StructuredCommand }> {
        const checks: Array<{ name: string; command: StructuredCommand }> = [];
        const pkgFile = path.join(this.workspace, 'package.json');
        if (fse.existsSync(pkgFile)) {
            const pkg = fse.readJsonSync(pkgFile); for (const script of ['lint', 'typecheck', 'test', 'build']) if (pkg.scripts?.[script]) checks.push({ name: `npm ${script}`, command: { executable: process.platform === 'win32' ? 'npm.cmd' : 'npm', args: ['run', script], timeoutMs: 10 * 60_000 } });
        }
        if (fse.existsSync(path.join(this.workspace, 'Cargo.toml'))) checks.push({ name: 'cargo test', command: { executable: 'cargo', args: ['test'], timeoutMs: 15 * 60_000 } });
        if (fse.existsSync(path.join(this.workspace, 'go.mod'))) checks.push({ name: 'go test', command: { executable: 'go', args: ['test', './...'], timeoutMs: 10 * 60_000 } });
        if (fse.existsSync(path.join(this.workspace, 'requirements.txt')) || fse.existsSync(path.join(this.workspace, 'pyproject.toml'))) {
            const python = process.platform === 'win32' ? path.join('.venv', 'Scripts', 'python.exe') : path.join('.venv', 'bin', 'python');
            checks.push({ name: 'python compile', command: { executable: python, args: ['-m', 'compileall', '.'], timeoutMs: 5 * 60_000 } });
        }
        return checks;
    }
    public async run(): Promise<VerificationReport> {
        const checks: VerificationCheck[] = [];
        for (const item of this.detect()) {
            try { const result = await this.runner.run(item.command); checks.push({ ...item, status: result.exitCode === 0 ? 'passed' : 'failed', durationMs: result.durationMs, output: (result.stderr || result.stdout).slice(-4000) }); if (result.exitCode !== 0) break; }
            catch (error: any) { checks.push({ ...item, status: 'failed', durationMs: 0, output: error.message }); break; }
        }
        return { passed: checks.every(check => check.status === 'passed'), checks };
    }
}

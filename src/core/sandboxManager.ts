import path from 'path';
import cp from 'child_process';
import { CommandRunner, CommandExecutionResult, StructuredCommand } from './commandRunner';
export interface SandboxPolicy { image?: string; network?: 'disabled' | 'enabled'; memoryMb?: number; cpuCount?: number; timeoutMs?: number; }
export class SandboxManager {
    constructor(private readonly workspace: string = process.cwd(), private readonly runner = new CommandRunner(workspace)) {}
    public commandAvailable(): boolean { try { return cp.spawnSync('docker', ['--version'], { stdio: 'ignore', shell: false }).status === 0; } catch { return false; } }
    public run(command: StructuredCommand, policy: SandboxPolicy = {}): Promise<CommandExecutionResult> {
        if (!this.commandAvailable()) return Promise.reject(new Error('Docker is unavailable; sandbox execution cannot continue.'));
        const image = policy.image ?? 'node:22-alpine'; if (!/^[A-Za-z0-9._:/-]{1,160}$/.test(image)) return Promise.reject(new Error('Invalid sandbox image.'));
        const args = ['run', '--rm', '--read-only', '--cap-drop=ALL', '--security-opt=no-new-privileges', '--memory', `${policy.memoryMb ?? 1024}m`, '--cpus', String(policy.cpuCount ?? 1), '--mount', `type=bind,src=${path.resolve(this.workspace)},dst=/workspace`, '--workdir', '/workspace'];
        if ((policy.network ?? 'disabled') === 'disabled') args.push('--network', 'none');
        args.push(image, command.executable, ...(command.args ?? []));
        return this.runner.run({ executable: 'docker', args, timeoutMs: policy.timeoutMs ?? command.timeoutMs });
    }
}

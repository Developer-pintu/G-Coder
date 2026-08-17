import cp from 'child_process';
import fse from 'fs-extra';
import os from 'os';
import path from 'path';
export interface DoctorCheck { name: string; status: 'pass' | 'warn' | 'fail'; detail: string; }
export class Doctor {
    public run(workspace: string = process.cwd()): DoctorCheck[] {
        const checks: DoctorCheck[] = [];
        for (const [name, command] of [['Node.js', 'node'], ['Git', 'git'], ['npm', process.platform === 'win32' ? 'npm.cmd' : 'npm'], ['Docker', 'docker']] as const) {
            const result = cp.spawnSync(command, ['--version'], { encoding: 'utf8', shell: false, windowsHide: true }); checks.push({ name, status: result.status === 0 ? 'pass' : name === 'Docker' ? 'warn' : 'fail', detail: result.status === 0 ? String(result.stdout || result.stderr).trim() : 'Not available' });
        }
        const config = path.join(os.homedir(), '.g-coder', '.env'); checks.push({ name: 'Credentials', status: fse.existsSync(config) ? 'pass' : 'warn', detail: fse.existsSync(config) ? 'Global configuration exists' : 'Run g-coder config' });
        const state = path.join(workspace, '.g-coder-state.json'); try { if (fse.existsSync(state)) fse.readJsonSync(state); checks.push({ name: 'Session state', status: 'pass', detail: fse.existsSync(state) ? 'Valid JSON state' : 'No active state' }); } catch { checks.push({ name: 'Session state', status: 'fail', detail: 'State file is corrupt' }); }
        return checks;
    }
}

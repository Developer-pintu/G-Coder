import path from 'path';

export type PermissionProfile = 'read-only' | 'workspace-write' | 'full';
export type RiskLevel = 'low' | 'medium' | 'high' | 'critical';

export interface PolicyRequest {
    action: 'read' | 'write' | 'patch' | 'delete' | 'move' | 'run';
    target?: string;
    executable?: string;
    args?: string[];
}

export interface PolicyDecision {
    allowed: boolean;
    risk: RiskLevel;
    requiresConfirmation: boolean;
    reason: string;
}

const CRITICAL_COMMANDS = new Set(['shutdown', 'reboot', 'mkfs', 'format', 'diskpart', 'dd']);
const HIGH_RISK_ARGS = /(^|\s)(--force|-rf|reset\s+--hard|clean\s+-fd|publish|push)(\s|$)/i;
const SENSITIVE_PATHS = /(^|[\\/])(\.ssh|\.aws|\.gnupg|id_rsa|id_ed25519|credentials)([\\/]|$)/i;

export class PolicyEngine {
    private readonly workspace: string;

    constructor(workspace: string = process.cwd(), private readonly profile: PermissionProfile = 'workspace-write') {
        this.workspace = path.resolve(workspace);
    }

    public evaluate(request: PolicyRequest): PolicyDecision {
        if (request.action === 'run') {
            if (request.target) {
                const cwd = path.resolve(this.workspace, request.target);
                const relation = path.relative(this.workspace, cwd);
                if ((relation.startsWith('..') || path.isAbsolute(relation)) && this.profile !== 'full') return this.deny('critical', 'Command working directory is outside the workspace.');
            }
            return this.evaluateCommand(request.executable ?? '', request.args ?? []);
        }
        const target = path.resolve(this.workspace, request.target ?? '');
        const relation = path.relative(this.workspace, target);
        const outsideWorkspace = relation.startsWith('..') || path.isAbsolute(relation);
        if (SENSITIVE_PATHS.test(target)) return this.deny('critical', 'Access to credential and identity directories is prohibited.');
        if (outsideWorkspace && this.profile !== 'full') return this.deny('critical', 'Path is outside the active workspace.');
        if (this.profile === 'read-only' && request.action !== 'read') return this.deny('high', 'Permission profile is read-only.');
        const risk: RiskLevel = request.action === 'read' ? 'low' : request.action === 'delete' || request.action === 'move' ? 'high' : 'medium';
        return { allowed: true, risk, requiresConfirmation: risk !== 'low', reason: outsideWorkspace ? 'Full-access profile permits this external path.' : 'Action is within the workspace policy.' };
    }

    private evaluateCommand(executable: string, args: string[]): PolicyDecision {
        const base = path.basename(executable).toLowerCase().replace(/\.(exe|cmd|bat)$/i, '');
        if (path.isAbsolute(executable)) {
            const relation = path.relative(this.workspace, executable);
            if ((relation.startsWith('..') || path.isAbsolute(relation)) && this.profile !== 'full') return this.deny('critical', 'Executable path is outside the workspace.');
        } else if ((executable.includes('/') || executable.includes('\\')) && !executable.startsWith('./') && !executable.startsWith('.\\')) {
            return this.deny('critical', 'Relative executable paths must be explicitly workspace-relative.');
        }
        if (!/^[a-z0-9._+-]{1,80}$/i.test(base)) return this.deny('critical', 'Executable name is invalid or contains path separators.');
        if (CRITICAL_COMMANDS.has(base)) return this.deny('critical', `Executable ${base} is prohibited.`);
        const joined = args.join(' ');
        if (args.some(arg => /[\r\n\0]/.test(arg))) return this.deny('critical', 'Command arguments contain control characters.');
        if (this.profile === 'read-only') return this.deny('high', 'Commands are disabled by the read-only profile.');
        const risk: RiskLevel = HIGH_RISK_ARGS.test(`${base} ${joined}`) ? 'high' : 'medium';
        return { allowed: true, risk, requiresConfirmation: true, reason: 'Structured command passed executable and argument validation.' };
    }

    private deny(risk: RiskLevel, reason: string): PolicyDecision {
        return { allowed: false, risk, requiresConfirmation: false, reason };
    }
}

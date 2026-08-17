import cp from 'child_process';
import path from 'path';
import chalk from 'chalk';
import fse from 'fs-extra';
import ignore, { Ignore } from 'ignore';
import ora from 'ora';
import { buildAiPrompt, executeAiRequest } from './api';
import { OptimizerEngine } from './optimizerEngine';

export type FindingSeverity = 'critical' | 'high' | 'medium' | 'low';

export interface AuditFinding {
    rule: string;
    severity: FindingSeverity;
    file: string;
    line: number;
    message: string;
    autoFixable: boolean;
}

export interface AuditReport {
    scannedFiles: number;
    findings: AuditFinding[];
    readinessScore: number;
}

const SOURCE_EXTENSIONS = new Set(['.ts', '.tsx', '.js', '.jsx', '.mjs', '.cjs', '.json']);
const REQUIRED_PROVIDERS = ['gemini', 'anthropic', 'deepseek', 'openai', 'groq', 'openrouter'];
const SECRET_ASSIGNMENT = /\b(password|passwd|api[_-]?key|secret|access[_-]?token)\b\s*[:=]\s*['"`]([^'"`\s]{8,})['"`]/i;

export class ProjectAuditor {
    private readonly workspace = process.cwd();

    public async runAudit(providerOpt: string, options: { fix?: boolean } = {}): Promise<AuditReport> {
        console.log(chalk.magenta.bold('\n🛡️  G-Coder Deterministic Security Audit'));
        const spinner = ora('Scanning the complete workspace...').start();
        try {
            const files = this.collectFiles();
            const findings = files.flatMap(file => this.scanFile(file));
            findings.push(...this.scanProviderCoverage(files));
            const report = this.createReport(files.length, findings);
            spinner.succeed(`Scanned ${files.length} source and configuration files.`);
            this.printReport(report);

            if (options.fix && findings.some(finding => finding.autoFixable)) {
                await this.autoFixIssues(report, providerOpt);
            } else if (!options.fix && findings.some(finding => finding.autoFixable)) {
                console.log(chalk.yellow('\nRun `g-coder audit --fix` to apply reviewed, build-verified patches.'));
            }
            return report;
        } catch (error: any) {
            spinner.fail(`Audit failed: ${error.message}`);
            throw error;
        }
    }

    private collectFiles(): string[] {
        const matcher = this.createIgnoreMatcher();
        const results: string[] = [];
        const visit = (directory: string): void => {
            for (const entry of fse.readdirSync(directory, { withFileTypes: true })) {
                const absolute = path.join(directory, entry.name);
                const relative = path.relative(this.workspace, absolute).replace(/\\/g, '/');
                if (matcher.ignores(relative) || matcher.ignores(`${relative}/`)) continue;
                if (entry.isDirectory()) visit(absolute);
                else if (SOURCE_EXTENSIONS.has(path.extname(entry.name).toLowerCase())) results.push(absolute);
            }
        };
        visit(this.workspace);
        return results.sort();
    }

    private createIgnoreMatcher(): Ignore {
        const matcher = ignore().add(['.git/', 'node_modules/', 'dist/', 'build/', 'coverage/', '.next/']);
        const gitignore = path.join(this.workspace, '.gitignore');
        if (fse.existsSync(gitignore)) matcher.add(fse.readFileSync(gitignore, 'utf8'));
        return matcher;
    }

    private scanFile(absolutePath: string): AuditFinding[] {
        const relative = path.relative(this.workspace, absolutePath).replace(/\\/g, '/');
        let content: string;
        try { content = fse.readFileSync(absolutePath, 'utf8'); }
        catch { return []; }
        if (content.includes('\0')) return [];

        const findings: AuditFinding[] = [];
        const lines = content.split(/\r?\n/);
        lines.forEach((line, index) => {
            const lineNumber = index + 1;
            const secret = SECRET_ASSIGNMENT.exec(line);
            if (secret && !/process\.env|example|placeholder|your[_-]/i.test(secret[2])) {
                findings.push(this.finding('SEC001', 'critical', relative, lineNumber, 'Possible hardcoded credential or token.', false));
            }
            if (/axios\.(get|post|put|patch|delete|request)\s*\(/i.test(line) && !this.nearby(lines, index, /timeout\s*:/i, 8)) {
                findings.push(this.finding('NET001', 'high', relative, lineNumber, 'HTTP request has no explicit timeout and may hang indefinitely.', true));
            }
            if (/\.then\s*\(/.test(line) && !this.nearby(lines, index, /\.catch\s*\(/, 8)) {
                findings.push(this.finding('ASYNC001', 'high', relative, lineNumber, 'Promise chain has no nearby rejection handler.', true));
            }
            if (/catch\s*(?:\([^)]*\))?\s*\{\s*\}/.test(line)) {
                findings.push(this.finding('ERR001', 'medium', relative, lineNumber, 'Empty catch block silently discards an error.', true));
            }
            const promptWindow = lines.slice(Math.max(0, index - 3), Math.min(lines.length, index + 4)).join(' ');
            if (/type\s*:\s*['"]input['"]/i.test(line) && /api.?key|password|secret|token/i.test(promptWindow) && !/(file|path)/i.test(promptWindow)) {
                findings.push(this.finding('INPUT001', 'critical', relative, lineNumber, 'Sensitive input appears to use an unmasked terminal prompt.', true));
            }
            if (/await\s+axios\./i.test(line) && !this.nearby(lines, index, /\btry\s*\{|\.catch\s*\(/, 40)) {
                findings.push(this.finding('ASYNC002', 'medium', relative, lineNumber, 'Awaited provider/network operation has no nearby rejection boundary.', true));
            }
            if (/exec(?:Sync)?\s*\(\s*`[^`]*\$\{/i.test(line)) {
                findings.push(this.finding('CMD001', 'critical', relative, lineNumber, 'Interpolated shell command can permit command injection; use execFile/spawn arguments.', true));
            }
        });
        return findings;
    }

    private scanProviderCoverage(files: string[]): AuditFinding[] {
        const apiFile = files.find(file => path.basename(file).toLowerCase() === 'api.ts');
        if (!apiFile) return [this.finding('ROUTE001', 'high', 'src/core/api.ts', 1, 'Multi-provider router was not found.', false)];
        const content = fse.readFileSync(apiFile, 'utf8').toLowerCase();
        return REQUIRED_PROVIDERS
            .filter(provider => !new RegExp(`case\\s+['"]${provider}['"]`, 'i').test(content))
            .map(provider => this.finding('ROUTE002', 'high', path.relative(this.workspace, apiFile), 1, `Missing case-insensitive router configuration for ${provider}.`, true));
    }

    private nearby(lines: string[], index: number, pattern: RegExp, radius: number): boolean {
        return lines.slice(Math.max(0, index - radius), Math.min(lines.length, index + radius + 1)).some(line => pattern.test(line));
    }

    private finding(rule: string, severity: FindingSeverity, file: string, line: number, message: string, autoFixable: boolean): AuditFinding {
        return { rule, severity, file: file.replace(/\\/g, '/'), line, message, autoFixable };
    }

    private createReport(scannedFiles: number, findings: AuditFinding[]): AuditReport {
        const weights: Record<FindingSeverity, number> = { critical: 20, high: 10, medium: 4, low: 1 };
        const penalty = findings.reduce((sum, finding) => sum + weights[finding.severity], 0);
        return { scannedFiles, findings, readinessScore: Math.max(0, 100 - penalty) };
    }

    private printReport(report: AuditReport): void {
        const colors = { critical: chalk.red.bold, high: chalk.red, medium: chalk.yellow, low: chalk.gray };
        if (report.findings.length === 0) console.log(chalk.green.bold('\n✅ No deterministic security gaps detected.'));
        for (const finding of report.findings) {
            console.log(colors[finding.severity](`[${finding.severity.toUpperCase()}] ${finding.rule} ${finding.file}:${finding.line} — ${finding.message}`));
        }
        const scoreColor = report.readinessScore >= 90 ? chalk.green : report.readinessScore >= 70 ? chalk.yellow : chalk.red;
        console.log(`\nReadiness score: ${scoreColor(`${report.readinessScore}/100`)} (${report.findings.length} findings)`);
    }

    private async autoFixIssues(report: AuditReport, providerOpt: string): Promise<void> {
        const targets = [...new Set(report.findings.filter(finding => finding.autoFixable).map(finding => finding.file))]
            .filter(file => this.isSafeWorkspaceFile(file))
            .slice(0, 20);
        if (targets.length === 0) return;

        console.log(chalk.magenta.bold(`\n🩹 Preparing guarded fixes for ${targets.length} files...`));
        const optimizer = new OptimizerEngine();
        const backups = new Map<string, string>();
        const patchedFiles: string[] = [];

        try {
            for (const relative of targets) {
                const absolute = path.resolve(this.workspace, relative);
                const content = fse.readFileSync(absolute, 'utf8');
                backups.set(absolute, content);
                const fileFindings = report.findings.filter(finding => finding.file === relative);
                const prompt = this.buildFixPrompt(relative, content, fileFindings);
                const patchResponse = await executeAiRequest(buildAiPrompt('ask', prompt), providerOpt);
                if (optimizer.applyDiffPatch(relative, patchResponse)) patchedFiles.push(relative);
            }

            if (patchedFiles.length === 0) {
                console.log(chalk.yellow('No safe patches could be applied.'));
                return;
            }
            this.verifyWorkspace();
            console.log(chalk.green.bold(`✅ Applied and build-verified fixes to ${patchedFiles.length} files.`));
        } catch (error: any) {
            for (const [file, content] of backups) fse.writeFileSync(file, content, 'utf8');
            console.log(chalk.red.bold(`❌ Fix verification failed; all audit edits were rolled back: ${error.message}`));
        }
    }

    private buildFixPrompt(file: string, content: string, findings: AuditFinding[]): string {
        return [
            `Security findings for ${file}:`,
            JSON.stringify(findings, null, 2),
            '',
            'File content:',
            content.slice(0, 120_000),
            '',
            'Return only minimal exact <<SEARCH>> / <<REPLACE>> / <<END>> blocks.',
            'Preserve behavior and public APIs. Do not add dependencies, disable security checks, expose secrets, or edit other files.'
        ].join('\n');
    }

    private isSafeWorkspaceFile(relativePath: string): boolean {
        const absolute = path.resolve(this.workspace, relativePath);
        const relation = path.relative(this.workspace, absolute);
        return relation !== '' && !relation.startsWith('..') && !path.isAbsolute(relation) && fse.pathExistsSync(absolute);
    }

    private verifyWorkspace(): void {
        const packagePath = path.join(this.workspace, 'package.json');
        if (!fse.existsSync(packagePath)) return;
        const pkg = fse.readJsonSync(packagePath);
        if (!pkg.scripts?.build) return;
        const npm = process.platform === 'win32' ? 'npm.cmd' : 'npm';
        cp.execFileSync(npm, ['run', 'build'], { cwd: this.workspace, stdio: 'inherit', windowsHide: true });
    }
}

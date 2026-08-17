import fse from 'fs-extra';
import path from 'path';
export interface SupplyChainFinding { severity: 'high' | 'medium' | 'low'; message: string; file: string; }
export class SupplyChainScanner {
    public scan(workspace: string = process.cwd()): SupplyChainFinding[] {
        const findings: SupplyChainFinding[] = []; const pkgPath = path.join(workspace, 'package.json');
        if (fse.existsSync(pkgPath)) {
            const pkg = fse.readJsonSync(pkgPath); const dependencies = { ...(pkg.dependencies ?? {}), ...(pkg.devDependencies ?? {}) };
            if (!['package-lock.json', 'npm-shrinkwrap.json', 'pnpm-lock.yaml', 'yarn.lock'].some(file => fse.existsSync(path.join(workspace, file)))) findings.push({ severity: 'high', message: 'Node dependencies are not protected by a lockfile.', file: 'package.json' });
            for (const [name, version] of Object.entries(dependencies)) if (/^(git\+|https?:|github:|\*)/i.test(String(version))) findings.push({ severity: 'medium', message: `Dependency ${name} uses an unpinned or remote source: ${version}`, file: 'package.json' });
        }
        const requirements = path.join(workspace, 'requirements.txt'); if (fse.existsSync(requirements)) for (const line of fse.readFileSync(requirements, 'utf8').split(/\r?\n/)) if (line.trim() && !line.trim().startsWith('#') && !/==/.test(line)) findings.push({ severity: 'medium', message: `Python requirement is not exactly pinned: ${line.trim()}`, file: 'requirements.txt' });
        return findings;
    }
}

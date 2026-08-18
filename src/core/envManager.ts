/**
 * Project: g-coder CLI Tool
 * Author: Developer Pintu
 * License: MIT - Free to use with proper attribution.
 */
import spawn from 'cross-spawn';
import path from 'path';
import chalk from 'chalk';
import fse from 'fs-extra';
import inquirer from 'inquirer';
import ora from 'ora';

export type HostPlatform = NodeJS.Platform;

export interface CommandSpec {
    command: string;
    args: string[];
    cwd: string;
}

export interface RequiredTool {
    id: string;
    displayName: string;
    commands: string[];
    versionArgs: string[];
    reason: string;
    systemPackage: Partial<Record<HostPlatform, string>>;
    installable?: boolean;
}

export interface DependencyInstall {
    id: string;
    displayName: string;
    marker: string;
    commands: CommandSpec[];
}

export interface EnvironmentAudit {
    workspace: string;
    detectedFiles: string[];
    requiredTools: RequiredTool[];
    missingTools: RequiredTool[];
    pendingDependencies: DependencyInstall[];
}

export interface EnvironmentSetupResult extends EnvironmentAudit {
    installed: string[];
    skipped: string[];
}

export interface CommandResult {
    code: number;
    stdout: string;
    stderr: string;
}

export interface EnvironmentManagerOptions {
    platform?: HostPlatform;
    commandChecker?: (command: string, args: string[]) => boolean;
    commandRunner?: (spec: CommandSpec) => Promise<CommandResult>;
    confirmer?: (displayName: string) => Promise<boolean>;
}

const SAFE_NAME = /^[A-Za-z0-9@+._:/-]{1,160}$/;
const IGNORED_DIRECTORIES = new Set(['.git', 'node_modules', 'dist', 'build', 'coverage', '.next', 'target', 'Pods']);

const TOOL_CATALOG: Record<string, Omit<RequiredTool, 'reason'>> = {
    node: { id: 'node', displayName: 'Node.js', commands: ['node'], versionArgs: ['--version'], systemPackage: { linux: 'nodejs', darwin: 'node', win32: 'OpenJS.NodeJS.LTS' } },
    npm: { id: 'npm', displayName: 'npm', commands: ['npm', 'npm.cmd'], versionArgs: ['--version'], systemPackage: { linux: 'npm', darwin: 'node', win32: 'OpenJS.NodeJS.LTS' } },
    python: { id: 'python', displayName: 'Python 3', commands: ['python3', 'python', 'py'], versionArgs: ['--version'], systemPackage: { linux: 'python3', darwin: 'python@3.12', win32: 'Python.Python.3.12' } },
    java: { id: 'java', displayName: 'Java JDK', commands: ['java'], versionArgs: ['-version'], systemPackage: { linux: 'default-jdk', darwin: 'openjdk@21', win32: 'EclipseAdoptium.Temurin.21.JDK' } },
    gradle: { id: 'gradle', displayName: 'Gradle', commands: ['gradle', 'gradle.bat'], versionArgs: ['--version'], systemPackage: { linux: 'gradle', darwin: 'gradle', win32: 'Gradle.Gradle' } },
    cargo: { id: 'cargo', displayName: 'Rust toolchain', commands: ['cargo'], versionArgs: ['--version'], systemPackage: { linux: 'cargo', darwin: 'rustup-init', win32: 'Rustlang.Rustup' } },
    go: { id: 'go', displayName: 'Go', commands: ['go'], versionArgs: ['version'], systemPackage: { linux: 'golang-go', darwin: 'go', win32: 'GoLang.Go' } },
    ruby: { id: 'ruby', displayName: 'Ruby', commands: ['ruby'], versionArgs: ['--version'], systemPackage: { linux: 'ruby-full', darwin: 'ruby', win32: 'RubyInstallerTeam.RubyWithDevKit.3.3' } },
    bundle: { id: 'bundle', displayName: 'Bundler', commands: ['bundle', 'bundle.bat'], versionArgs: ['--version'], systemPackage: { linux: 'ruby-bundler', darwin: 'bundler', win32: 'RubyInstallerTeam.RubyWithDevKit.3.3' } },
    php: { id: 'php', displayName: 'PHP', commands: ['php'], versionArgs: ['--version'], systemPackage: { linux: 'php-cli', darwin: 'php', win32: 'PHP.PHP' } },
    composer: { id: 'composer', displayName: 'Composer', commands: ['composer', 'composer.bat'], versionArgs: ['--version'], systemPackage: { linux: 'composer', darwin: 'composer', win32: 'Composer.Composer' } },
    xcodebuild: { id: 'xcodebuild', displayName: 'Xcode Command Line Tools', commands: ['xcodebuild'], versionArgs: ['-version'], systemPackage: {}, installable: false },
    sdkmanager: { id: 'sdkmanager', displayName: 'Android SDK Command-line Tools', commands: ['sdkmanager', 'sdkmanager.bat'], versionArgs: ['--version'], systemPackage: { linux: 'android-sdk', darwin: 'android-commandlinetools', win32: 'Google.AndroidStudio' } }
};

export class EnvironmentSetupError extends Error {}

export class EnvironmentManager {
    private readonly platform: HostPlatform;
    private readonly checkCommand: (command: string, args: string[]) => boolean;
    private readonly runCommand: (spec: CommandSpec) => Promise<CommandResult>;
    private readonly confirmInstall: (displayName: string) => Promise<boolean>;

    constructor(options: EnvironmentManagerOptions = {}) {
        this.platform = options.platform ?? process.platform;
        this.checkCommand = options.commandChecker ?? this.defaultCommandChecker;
        this.runCommand = options.commandRunner ?? this.defaultCommandRunner;
        this.confirmInstall = options.confirmer ?? this.defaultConfirmer;
    }

    public audit(workspaceInput: string = process.cwd()): EnvironmentAudit {
        const workspace = path.resolve(workspaceInput);
        if (!fse.existsSync(workspace) || !fse.statSync(workspace).isDirectory()) {
            throw new EnvironmentSetupError(`Workspace directory does not exist: ${workspace}`);
        }

        const detectedFiles = this.collectConfigFiles(workspace);
        const required = new Map<string, RequiredTool>();
        const pendingDependencies: DependencyInstall[] = [];
        const addTool = (id: string, reason: string): void => {
            const catalog = TOOL_CATALOG[id];
            if (catalog && !required.has(id)) required.set(id, { ...catalog, reason });
        };

        for (const file of detectedFiles) {
            const name = path.basename(file).toLowerCase();
            const directory = path.dirname(file);
            if (name === 'package.json') {
                addTool('node', file); addTool('npm', file);
                if (this.packageHasDependencies(file) && !fse.existsSync(path.join(directory, 'node_modules'))) {
                    pendingDependencies.push(this.dependency('npm', 'Node.js project packages', path.join(directory, 'node_modules'), [{ command: this.platform === 'win32' ? 'npm.cmd' : 'npm', args: ['install', '--no-audit'], cwd: directory }]));
                }
            } else if (name === 'requirements.txt' || name === 'pyproject.toml') {
                addTool('python', file);
                const venv = path.join(directory, '.venv');
                if (!fse.existsSync(venv)) {
                    const python = this.resolveCommand(TOOL_CATALOG.python) ?? (this.platform === 'win32' ? 'py' : 'python3');
                    const venvPython = this.platform === 'win32' ? path.join(venv, 'Scripts', 'python.exe') : path.join(venv, 'bin', 'python');
                    const installArgs = name === 'requirements.txt' ? ['-m', 'pip', 'install', '-r', file] : ['-m', 'pip', 'install', '.'];
                    pendingDependencies.push(this.dependency(`python:${directory}`, 'Python virtual environment and packages', venv, [
                        { command: python, args: ['-m', 'venv', venv], cwd: directory },
                        { command: venvPython, args: installArgs, cwd: directory }
                    ]));
                }
            } else if (name === 'cargo.toml') {
                addTool('cargo', file);
                const marker = this.cacheMarker(directory, 'cargo');
                if (!fse.existsSync(marker)) pendingDependencies.push(this.dependency(`cargo:${directory}`, 'Rust crates', marker, [{ command: 'cargo', args: ['fetch'], cwd: directory }]));
            } else if (name === 'go.mod') {
                addTool('go', file);
                const marker = this.cacheMarker(directory, 'go');
                if (!fse.existsSync(marker)) pendingDependencies.push(this.dependency(`go:${directory}`, 'Go modules', marker, [{ command: 'go', args: ['mod', 'download'], cwd: directory }]));
            } else if (name === 'gemfile') {
                addTool('ruby', file); addTool('bundle', file);
                if (!fse.existsSync(path.join(directory, 'Gemfile.lock'))) pendingDependencies.push(this.dependency(`bundle:${directory}`, 'Ruby gems', path.join(directory, 'Gemfile.lock'), [{ command: this.platform === 'win32' ? 'bundle.bat' : 'bundle', args: ['install'], cwd: directory }]));
            } else if (name === 'composer.json') {
                addTool('php', file); addTool('composer', file);
                if (!fse.existsSync(path.join(directory, 'vendor'))) pendingDependencies.push(this.dependency(`composer:${directory}`, 'Composer packages', path.join(directory, 'vendor'), [{ command: this.platform === 'win32' ? 'composer.bat' : 'composer', args: ['install', '--no-interaction'], cwd: directory }]));
            } else if (name === 'build.gradle' || name === 'build.gradle.kts') {
                addTool('java', file);
                if (!this.findGradleWrapper(directory, workspace)) addTool('gradle', file);
                if (/com\.android\.|android\s*\{/i.test(fse.readFileSync(file, 'utf8'))) addTool('sdkmanager', file);
            } else if (name.endsWith('.xcodeproj')) {
                addTool('xcodebuild', file);
            }
        }

        this.addCustomRequirements(workspace, required);
        const requiredTools = [...required.values()];
        const missingTools = requiredTools.filter(tool => !this.resolveCommand(tool));
        return { workspace, detectedFiles, requiredTools, missingTools, pendingDependencies: this.uniqueDependencies(pendingDependencies) };
    }

    public async ensure(workspaceInput: string = process.cwd()): Promise<EnvironmentSetupResult> {
        console.log(chalk.cyan.bold('\n🔎 [g-coder]: Auditing project runtime environment...'));
        let audit = this.audit(workspaceInput);
        const installed: string[] = [];
        const skipped: string[] = [];

        for (const tool of audit.missingTools) {
            const accepted = await this.confirmInstall(tool.displayName);
            if (!accepted) {
                skipped.push(tool.displayName);
                throw new EnvironmentSetupError(`Required dependency was not installed: ${tool.displayName}`);
            }
            await this.installTool(tool, audit.workspace);
            if (!this.resolveCommand(tool)) throw new EnvironmentSetupError(`${tool.displayName} installation completed but the command is still unavailable. Restart the terminal and retry.`);
            installed.push(tool.displayName);
        }

        // Re-audit after runtime installation so dependency commands resolve against the refreshed PATH.
        audit = this.audit(audit.workspace);
        for (const dependency of audit.pendingDependencies) {
            const accepted = await this.confirmInstall(dependency.displayName);
            if (!accepted) {
                skipped.push(dependency.displayName);
                throw new EnvironmentSetupError(`Required project dependencies were not installed: ${dependency.displayName}`);
            }
            await this.executeInstallation(dependency.displayName, dependency.commands);
            if (dependency.marker.endsWith('.ready')) fse.outputFileSync(dependency.marker, new Date().toISOString(), { mode: 0o600 });
            installed.push(dependency.displayName);
        }

        console.log(chalk.green.bold('✅ [g-coder]: Environment is ready. Resuming the original workflow...'));
        return { ...audit, installed, skipped };
    }

    private collectConfigFiles(workspace: string): string[] {
        const markers = new Set(['package.json', 'requirements.txt', 'pyproject.toml', 'build.gradle', 'build.gradle.kts', 'Cargo.toml', 'go.mod', 'Gemfile', 'composer.json']);
        const results: string[] = [];
        let visited = 0;
        const visit = (directory: string): void => {
            if (visited++ > 10_000) throw new EnvironmentSetupError('Workspace contains too many directories to audit safely.');
            for (const entry of fse.readdirSync(directory, { withFileTypes: true })) {
                if (entry.isDirectory() && IGNORED_DIRECTORIES.has(entry.name)) continue;
                const absolute = path.join(directory, entry.name);
                if (entry.isDirectory() && entry.name.toLowerCase().endsWith('.xcodeproj')) results.push(absolute);
                else if (entry.isDirectory()) visit(absolute);
                else if (markers.has(entry.name)) results.push(absolute);
            }
        };
        visit(workspace);
        return results.sort();
    }

    private packageHasDependencies(packagePath: string): boolean {
        try {
            const pkg = fse.readJsonSync(packagePath);
            return Object.keys(pkg.dependencies ?? {}).length + Object.keys(pkg.devDependencies ?? {}).length > 0;
        } catch (error: any) {
            throw new EnvironmentSetupError(`Invalid package.json at ${packagePath}: ${error.message}`);
        }
    }

    private findGradleWrapper(startDirectory: string, workspace: string): string | null {
        let current = startDirectory;
        const wrapperName = this.platform === 'win32' ? 'gradlew.bat' : 'gradlew';
        while (true) {
            const candidate = path.join(current, wrapperName);
            if (fse.existsSync(candidate)) return candidate;
            if (current === workspace) return null;
            const parent = path.dirname(current);
            const relation = path.relative(workspace, parent);
            if (parent === current || relation.startsWith('..') || path.isAbsolute(relation)) return null;
            current = parent;
        }
    }

    private addCustomRequirements(workspace: string, requirements: Map<string, RequiredTool>): void {
        const manifestPath = path.join(workspace, '.g-coder-env.json');
        if (!fse.existsSync(manifestPath)) return;
        const manifest = fse.readJsonSync(manifestPath);
        if (!Array.isArray(manifest.tools)) throw new EnvironmentSetupError('.g-coder-env.json must contain a tools array.');
        for (const value of manifest.tools) {
            if (!value || !SAFE_NAME.test(value.name) || !SAFE_NAME.test(value.command)) throw new EnvironmentSetupError('Custom tool names and commands must contain only safe characters.');
            const id = `custom:${value.name.toLowerCase()}`;
            const packages = value.packages ?? {};
            for (const packageName of Object.values(packages)) if (typeof packageName !== 'string' || !SAFE_NAME.test(packageName)) throw new EnvironmentSetupError(`Unsafe package name for ${value.name}.`);
            requirements.set(id, {
                id,
                displayName: value.name,
                commands: [value.command],
                versionArgs: Array.isArray(value.versionArgs) ? value.versionArgs.map(String) : ['--version'],
                reason: manifestPath,
                systemPackage: packages,
                installable: Boolean(packages[this.platform])
            });
        }
    }

    private async installTool(tool: RequiredTool, workspace: string): Promise<void> {
        if (tool.installable === false || !tool.systemPackage[this.platform]) {
            throw new EnvironmentSetupError(`${tool.displayName} cannot be installed automatically on ${this.platform}. Install it from the official vendor and retry.`);
        }
        const packageName = tool.systemPackage[this.platform]!;
        if (!SAFE_NAME.test(packageName)) throw new EnvironmentSetupError(`Unsafe system package identifier: ${packageName}`);
        const command = this.systemInstallCommand(packageName, workspace);
        await this.executeInstallation(tool.displayName, [command]);
    }

    private systemInstallCommand(packageName: string, cwd: string): CommandSpec {
        if (this.platform === 'darwin') {
            if (!this.checkCommand('brew', ['--version'])) throw new EnvironmentSetupError('Homebrew is required for automatic runtime installation on macOS.');
            return { command: 'brew', args: ['install', packageName], cwd };
        }
        if (this.platform === 'win32') {
            if (this.checkCommand('winget', ['--version'])) return { command: 'winget', args: ['install', '--exact', '--id', packageName, '--accept-package-agreements', '--accept-source-agreements', '--silent'], cwd };
            if (this.checkCommand('choco', ['--version'])) return { command: 'choco', args: ['install', packageName, '-y', '--no-progress'], cwd };
            throw new EnvironmentSetupError('winget or Chocolatey is required for automatic runtime installation on Windows.');
        }

        const prefix = typeof process.getuid === 'function' && process.getuid() === 0 ? [] : ['sudo', '-n'];
        if (this.checkCommand('apt-get', ['--version'])) return this.withPrivilege(prefix, 'apt-get', ['install', '-y', '--no-install-recommends', packageName], cwd);
        if (this.checkCommand('dnf', ['--version'])) return this.withPrivilege(prefix, 'dnf', ['install', '-y', packageName], cwd);
        if (this.checkCommand('pacman', ['--version'])) return this.withPrivilege(prefix, 'pacman', ['-S', '--noconfirm', '--needed', packageName], cwd);
        throw new EnvironmentSetupError('No supported system package manager was detected (apt-get, dnf, pacman).');
    }

    private withPrivilege(prefix: string[], command: string, args: string[], cwd: string): CommandSpec {
        return prefix.length ? { command: prefix[0], args: [...prefix.slice(1), command, ...args], cwd } : { command, args, cwd };
    }

    private async executeInstallation(name: string, commands: CommandSpec[]): Promise<void> {
        const spinner = ora(`Installing ${name}...`).start();
        try {
            for (const spec of commands) {
                const result = await this.runCommand(spec);
                if (result.code !== 0) throw new Error((result.stderr || result.stdout || `exit code ${result.code}`).slice(-2000));
            }
            spinner.succeed(`${name} installed successfully.`);
        } catch (error: any) {
            spinner.fail(`Failed to install ${name}.`);
            throw new EnvironmentSetupError(`${name} installation failed: ${error.message}`);
        }
    }

    private dependency(id: string, displayName: string, marker: string, commands: CommandSpec[]): DependencyInstall {
        return { id, displayName, marker, commands };
    }

    private cacheMarker(directory: string, id: string): string {
        return path.join(directory, '.g-coder-env-cache', `${id}.ready`);
    }

    private uniqueDependencies(dependencies: DependencyInstall[]): DependencyInstall[] {
        return [...new Map(dependencies.map(dependency => [dependency.id, dependency])).values()];
    }

    private resolveCommand(tool: Pick<RequiredTool, 'id' | 'commands' | 'versionArgs'>): string | null {
        const commands = [...tool.commands];
        if (tool.id === 'sdkmanager') {
            const androidHome = process.env.ANDROID_SDK_ROOT || process.env.ANDROID_HOME;
            if (androidHome) {
                const executable = this.platform === 'win32' ? 'sdkmanager.bat' : 'sdkmanager';
                commands.unshift(
                    path.join(androidHome, 'cmdline-tools', 'latest', 'bin', executable),
                    path.join(androidHome, 'tools', 'bin', executable)
                );
            }
        }
        return commands.find(command => this.checkCommand(command, tool.versionArgs)) ?? null;
    }

    private defaultCommandChecker = (command: string, args: string[]): boolean => {
        const result = spawn.sync(command, args, { stdio: 'ignore', shell: false, windowsHide: true });
        return !result.error && result.status === 0;
    };

    private defaultCommandRunner = (spec: CommandSpec): Promise<CommandResult> => new Promise((resolve, reject) => {
        const child = spawn(spec.command, spec.args, { cwd: spec.cwd, shell: false, windowsHide: true, stdio: ['ignore', 'pipe', 'pipe'] });
        let stdout = '';
        let stderr = '';
        child.stdout!.on('data', chunk => { stdout = (stdout + chunk.toString()).slice(-100_000); });
        child.stderr!.on('data', chunk => { stderr = (stderr + chunk.toString()).slice(-100_000); });
        child.once('error', reject);
        child.once('close', code => resolve({ code: code ?? 1, stdout, stderr }));
    });

    private defaultConfirmer = async (displayName: string): Promise<boolean> => {
        const message = `⚠️ [g-coder]: Missing required dependency detected: ${displayName}. Would you like me to install it automatically? (y/N)`;
        while (true) {
            const { answer } = await inquirer.prompt<{ answer: string }>([{ type: 'input', name: 'answer', message, default: '' }]);
            const normalized = String(answer).trim().toLowerCase();
            if (normalized === 'y' || normalized === 'yes') return true;
            if (normalized === '' || normalized === 'n' || normalized === 'no') return false;
            console.log(chalk.yellow('Please enter y/yes or n/no. Press Enter to choose No.'));
        }
    };
}

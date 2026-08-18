/**
 * Project: g-coder CLI Tool
 * Author: Developer Pintu
 * License: MIT - Free to use with proper attribution.
 */
import { sync as spawnSync } from 'cross-spawn';
import inquirer from 'inquirer';
import chalk from 'chalk';
import os from 'os';

export interface AuditResult {
    passed: boolean;
    missingDependencies: string[];
}

export class EnvAuditor {
    // Defines how to check for a dependency and how to attempt to install it globally
    private static readonly DEPENDENCY_REGISTRY: Record<string, { checkCmd: string; checkArgs: string[]; installCmd: string; installArgs: string[] }> = {
        python: { checkCmd: 'python', checkArgs: ['--version'], installCmd: 'apt-get', installArgs: ['install', '-y', 'python3'] },
        pip: { checkCmd: 'pip', checkArgs: ['--version'], installCmd: 'apt-get', installArgs: ['install', '-y', 'python3-pip'] },
        node: { checkCmd: 'node', checkArgs: ['--version'], installCmd: 'apt-get', installArgs: ['install', '-y', 'nodejs'] },
        npm: { checkCmd: 'npm', checkArgs: ['--version'], installCmd: 'apt-get', installArgs: ['install', '-y', 'npm'] },
        java: { checkCmd: 'java', checkArgs: ['-version'], installCmd: 'apt-get', installArgs: ['install', '-y', 'default-jre'] },
        gcc: { checkCmd: 'gcc', checkArgs: ['--version'], installCmd: 'apt-get', installArgs: ['install', '-y', 'gcc'] },
        rustc: { checkCmd: 'rustc', checkArgs: ['--version'], installCmd: 'curl', installArgs: ['--proto', '=https', '--tlsv1.2', '-sSf', 'https://sh.rustup.rs', '|', 'sh', '-s', '--', '-y'] },
        docker: { checkCmd: 'docker', checkArgs: ['--version'], installCmd: 'apt-get', installArgs: ['install', '-y', 'docker.io'] },
    };

    /**
     * Autonomously scans project requirements (package.json, Cargo.toml, requirements.txt)
     * and probes the host OS for missing runtimes or compilers.
     */
    public static async autonomousScanAndInstall(): Promise<boolean> {
        console.log(chalk.blue(`\n🔍 [Env Auditor] Scanning project for runtime requirements...`));
        const required: string[] = [];
        
        if (require('fs').existsSync('package.json')) {
            console.log(chalk.gray(`Detected Node.js project.`));
            required.push('node', 'npm');
        }
        if (require('fs').existsSync('requirements.txt')) {
            console.log(chalk.gray(`Detected Python project.`));
            required.push('python', 'pip');
        }
        if (require('fs').existsSync('Cargo.toml')) {
            console.log(chalk.gray(`Detected Rust project.`));
            required.push('rustc');
        }
        
        if (required.length === 0) return true;
        return this.checkDependencies(required, 'Autonomous Project Stack');
    }

    public static async checkDependencies(required: string[], domain: string = 'General'): Promise<boolean> {
        console.log(chalk.blue(`\n🔍 [g-coder]: Auditing runtime environment for ${domain}...`));
        
        const missingDependencies: string[] = [];

        for (const dep of required) {
            const config = this.DEPENDENCY_REGISTRY[dep.toLowerCase()];
            if (!config) {
                console.warn(chalk.yellow(`⚠️ [g-coder]: Unknown dependency '${dep}'. Cannot verify.`));
                continue;
            }

            try {
                const result = spawnSync(config.checkCmd, config.checkArgs, { stdio: 'ignore' });
                if (result.status !== 0 && result.error) {
                    missingDependencies.push(dep);
                }
            } catch (error) {
                missingDependencies.push(dep);
            }
        }

        if (missingDependencies.length === 0) {
            console.log(chalk.green(`✅ [g-coder]: Environment audit passed. All required dependencies are present.`));
            return true;
        }

        console.log(chalk.red(`❌ [g-coder]: Missing required dependencies: ${missingDependencies.join(', ')}`));

        // Prompt for automatic installation
        const answer = await inquirer.prompt([
            {
                type: 'confirm',
                name: 'autoInstall',
                message: `⚠️ [g-coder]: Missing required dependency detected for [${domain}]. Would you like me to install it automatically? (y/N)`,
                default: false,
            }
        ]);

        if (answer.autoInstall) {
            console.log(chalk.blue(`\n🚀 [g-coder]: Initiating secure background installation...`));
            let allInstalled = true;

            for (const dep of missingDependencies) {
                const success = this.installDependency(dep);
                if (!success) {
                    allInstalled = false;
                }
            }

            if (allInstalled) {
                console.log(chalk.green(`✅ [g-coder]: Successfully installed missing dependencies.`));
                return true;
            } else {
                console.log(chalk.red(`❌ [g-coder]: Failed to install some dependencies. Please install them manually.`));
                return false;
            }
        } else {
            console.log(chalk.yellow(`⚠️ [g-coder]: Proceeding without required dependencies. Build or execution may fail.`));
            return false;
        }
    }

    private static installDependency(dep: string): boolean {
        const config = this.DEPENDENCY_REGISTRY[dep.toLowerCase()];
        if (!config) return false;

        const platform = os.platform();
        if (platform !== 'linux' && platform !== 'darwin') {
            console.warn(chalk.yellow(`⚠️ [g-coder]: Automatic installation of '${dep}' is primarily supported on Linux/macOS. Please install manually on ${platform}.`));
            return false;
        }

        // On Windows or other OS, we might need a different package manager strategy (like choco).
        // For simplicity and safety in this core, we demonstrate a robust attempt pattern.
        console.log(chalk.dim(`Installing ${dep}...`));
        try {
            // Note: In a true production environment, running apt-get without sudo might fail.
            // We assume the user runs g-coder with appropriate permissions or we'd handle privilege escalation safely.
            const result = spawnSync(config.installCmd, config.installArgs, { stdio: 'inherit' });
            if (result.status === 0) {
                return true;
            } else {
                console.error(chalk.red(`Failed to install ${dep}. Command exited with code ${result.status}.`));
                return false;
            }
        } catch (error: any) {
            console.error(chalk.red(`Error installing ${dep}: ${error.message}`));
            return false;
        }
    }
}

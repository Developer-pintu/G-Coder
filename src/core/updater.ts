import axios, { AxiosInstance } from 'axios';
import cp from 'child_process';
import chalk from 'chalk';
import ora from 'ora';

const PACKAGE_NAME = 'g-coder';
const TRUSTED_REPOSITORY = 'github.com/developer-pintu/g-coder';
const VERSION_PATTERN = /^\d+\.\d+\.\d+(?:-[0-9A-Za-z.-]+)?$/;

export interface UpdateResult {
    currentVersion: string;
    latestVersion: string;
    updated: boolean;
}

type CommandRunner = (executable: string, args: string[]) => void;

const defaultRunner: CommandRunner = (executable, args) => {
    cp.execFileSync(executable, args, { stdio: 'inherit', windowsHide: true });
};

export class Updater {
    constructor(
        private readonly currentVersion: string,
        private readonly http: AxiosInstance = axios,
        private readonly runCommand: CommandRunner = defaultRunner
    ) {
        if (!VERSION_PATTERN.test(currentVersion)) throw new Error(`Invalid local version: ${currentVersion}`);
    }

    public async check(): Promise<UpdateResult> {
        const response = await this.http.get(`https://registry.npmjs.org/${PACKAGE_NAME}/latest`, { timeout: 10000 });
        const packageName = String(response.data?.name ?? '').trim().toLowerCase();
        const repositoryValue = typeof response.data?.repository === 'string'
            ? response.data.repository
            : response.data?.repository?.url;
        const normalizedRepository = String(repositoryValue ?? '').toLowerCase().replace(/^git\+/, '').replace(/\.git$/, '');
        if (packageName !== PACKAGE_NAME || !normalizedRepository.includes(TRUSTED_REPOSITORY)) {
            throw new Error('Registry package identity did not match the trusted g-coder repository.');
        }
        const latestVersion = String(response.data?.version ?? '').trim();
        if (!VERSION_PATTERN.test(latestVersion)) throw new Error('The npm registry returned an invalid package version.');
        return {
            currentVersion: this.currentVersion,
            latestVersion,
            updated: false
        };
    }

    public async update(options: { checkOnly?: boolean; force?: boolean } = {}): Promise<UpdateResult> {
        console.log(chalk.cyan.bold('\n⬆️  G-Coder Safe Update Engine'));
        const spinner = ora('Checking the npm registry for updates...').start();
        try {
            const result = await this.check();
            const comparison = this.compareVersions(result.latestVersion, result.currentVersion);
            if (comparison <= 0 && !options.force) {
                spinner.succeed(`g-coder ${result.currentVersion} is already up to date.`);
                return result;
            }
            if (options.checkOnly) {
                spinner.succeed(`Update available: ${result.currentVersion} → ${result.latestVersion}`);
                return result;
            }

            spinner.stop();
            console.log(chalk.yellow(`Installing verified package ${PACKAGE_NAME}@${result.latestVersion} globally...`));
            const npmExecutable = process.platform === 'win32' ? 'npm.cmd' : 'npm';
            this.runCommand(npmExecutable, ['install', '--global', '--no-audit', `${PACKAGE_NAME}@${result.latestVersion}`]);
            console.log(chalk.green.bold(`✅ Updated g-coder to ${result.latestVersion}.`));
            console.log(chalk.gray('Your ~/.g-coder credentials and project session files were not modified.'));
            return { ...result, updated: true };
        } catch (error: any) {
            spinner.fail(`Update failed: ${error.message}`);
            throw new Error(`Unable to update g-coder safely: ${error.message}`);
        }
    }

    private compareVersions(left: string, right: string): number {
        const parse = (version: string) => version.split('-')[0].split('.').map(Number);
        const a = parse(left);
        const b = parse(right);
        for (let index = 0; index < 3; index++) {
            if (a[index] !== b[index]) return a[index] > b[index] ? 1 : -1;
        }
        return left.localeCompare(right);
    }
}

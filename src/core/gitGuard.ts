import cp from 'child_process';
import chalk from 'chalk';
import ora from 'ora';

export class GitGuard {
    private cwd: string;
    private backupCommitHash: string | null = null;
    private hasPendingChanges: boolean = false;

    constructor(cwd: string = process.cwd()) {
        this.cwd = cwd;
    }

    public isGitRepo(): boolean {
        try {
            cp.execSync('git rev-parse --is-inside-work-tree', { cwd: this.cwd, stdio: 'ignore' });
            return true;
        } catch {
            return false;
        }
    }

    public checkpoint(): void {
        if (!this.isGitRepo()) {
            console.log(chalk.yellow('[GitGuard] Not a git repository. Skipping safety checkpoint.'));
            return;
        }

        const spinner = ora('Creating Git safety checkpoint...').start();
        try {
            const status = cp.execSync('git status --porcelain', { cwd: this.cwd, encoding: 'utf-8' });
            if (status.trim() === '') {
                // If clean, we don't need a WIP commit, we just remember the current HEAD
                this.backupCommitHash = cp.execSync('git rev-parse HEAD', { cwd: this.cwd, encoding: 'utf-8' }).trim();
                spinner.succeed('Git safety checkpoint created (Clean Tree).');
                return;
            }

            this.hasPendingChanges = true;
            cp.execSync('git add .', { cwd: this.cwd, stdio: 'ignore' });
            cp.execSync('git commit -m "g-coder-wip-checkpoint" --no-verify', { cwd: this.cwd, stdio: 'ignore' });
            this.backupCommitHash = cp.execSync('git rev-parse HEAD', { cwd: this.cwd, encoding: 'utf-8' }).trim();
            spinner.succeed('Git safety checkpoint created (Committed pending changes).');
        } catch (error: any) {
            spinner.warn(`Failed to create git checkpoint: ${error.message}`);
            this.backupCommitHash = null;
        }
    }

    public rollback(): void {
        if (!this.isGitRepo() || !this.backupCommitHash) return;

        const spinner = ora('Rolling back to safety checkpoint...').start();
        try {
            // Hard reset to the backup commit (which contains the user's pending changes)
            cp.execSync(`git reset --hard ${this.backupCommitHash}`, { cwd: this.cwd, stdio: 'ignore' });
            cp.execSync('git clean -fd', { cwd: this.cwd, stdio: 'ignore' });
            
            // If the user had pending changes, soft reset HEAD~1 so they become uncommitted again
            if (this.hasPendingChanges) {
                cp.execSync('git reset --soft HEAD~1', { cwd: this.cwd, stdio: 'ignore' });
            }
            
            spinner.succeed('Workspace safely rolled back to previous state.');
        } catch (error: any) {
            spinner.fail(`Failed to rollback workspace: ${error.message}`);
        }
    }

    public cleanup(): void {
        if (!this.isGitRepo() || !this.backupCommitHash) return;
        
        try {
            // If the agent succeeded, we want to keep the new changes.
            // If we made a WIP commit earlier, we soft reset it so everything (user's old + agent's new) is uncommitted.
            if (this.hasPendingChanges) {
                // Wait, if the agent succeeded, the current HEAD is still our WIP commit + any new agent files.
                // Since the agent doesn't commit, the new changes are uncommitted.
                // We just do a soft reset on the WIP commit.
                cp.execSync(`git reset --soft HEAD~1`, { cwd: this.cwd, stdio: 'ignore' });
            }
            console.log(chalk.green('✔ Git checkpoint cleaned up. Changes are ready to be reviewed.'));
        } catch (error: any) {
            console.log(chalk.red(`Failed to cleanup git checkpoint: ${error.message}`));
        }
    }
}

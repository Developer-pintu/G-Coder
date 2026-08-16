import cp from 'child_process';
import chalk from 'chalk';
import { executeAiRequest, buildAiPrompt } from './api';
import { confirmAction } from './utils';

export class GitManager {
    public async cleanup() {
        console.log(chalk.magenta.bold(`\n🧹 Git Branch Cleanup Utility`));
        try {
            cp.execSync('git fetch --prune', { stdio: 'ignore' });
            const branchesRaw = cp.execSync('git branch', { encoding: 'utf-8' });
            
            const branches = branchesRaw.split('\n')
                .map(b => b.trim().replace('* ', ''))
                .filter(b => b.length > 0 && b !== 'main' && b !== 'master');

            if (branches.length === 0) {
                console.log(chalk.green('Your local repository is already clean. No stale branches found.'));
                return;
            }

            console.log(chalk.cyan(`Found the following non-main branches:`));
            branches.forEach(b => console.log(chalk.gray(`  - ${b}`)));

            const isConfirmed = await confirmAction(chalk.yellow.bold(`Are you sure you want to delete these ${branches.length} branches safely?`));
            
            if (isConfirmed) {
                let deletedCount = 0;
                for (const branch of branches) {
                    try {
                        cp.execSync(`git branch -d ${branch}`, { stdio: 'ignore' });
                        console.log(chalk.green(`✔ Deleted ${branch}`));
                        deletedCount++;
                    } catch (e) {
                        console.log(chalk.yellow(`⚠ Could not safely delete ${branch} (it might have unmerged changes). Force delete manually if needed.`));
                    }
                }
                console.log(chalk.green.bold(`\n✅ Cleanup complete! Deleted ${deletedCount} branches.`));
            } else {
                console.log(chalk.yellow('Cleanup aborted.'));
            }
        } catch (error: any) {
            console.log(chalk.red(`Git cleanup failed: ${error.message}`));
        }
    }

    public async push(messageOpt: string | undefined, providerOpt: string) {
        console.log(chalk.magenta.bold(`\n🚀 Git Push Auto-Sync`));
        try {
            // Check if there are changes to commit
            cp.execSync('git add .', { stdio: 'ignore' });
            const status = cp.execSync('git status --porcelain', { encoding: 'utf-8' });
            
            let commitMessage = messageOpt;

            if (status.trim() === '') {
                console.log(chalk.yellow('No pending changes to commit. Proceeding to push existing commits...'));
            } else {
                if (!commitMessage) {
                    console.log(chalk.cyan(`Analyzing git diff to generate an AI commit message...`));
                    const diff = cp.execSync('git diff --cached', { encoding: 'utf-8' });
                    
                    if (diff.trim().length > 0) {
                        const prompt = `Generate a single, short, professional conventional commit message (e.g., "feat: added login page") for the following git diff. Output ONLY the message, no quotes or explanation:\n\n${diff.substring(0, 3000)}`;
                        const fullPrompt = buildAiPrompt('ask', prompt);
                        let generated = await executeAiRequest(fullPrompt, providerOpt);
                        commitMessage = generated.trim().replace(/^["']|["']$/g, '');
                        console.log(chalk.green(`✔ AI Generated Message: `) + chalk.white(commitMessage));
                    } else {
                        commitMessage = "chore: auto-sync update";
                    }
                }

                cp.execSync(`git commit -m "${commitMessage}"`, { stdio: 'inherit' });
            }

            console.log(chalk.cyan(`Pushing to remote...`));
            cp.execSync('git push', { stdio: 'inherit' });
            console.log(chalk.green.bold(`\n✅ Successfully pushed to remote.`));

        } catch (error: any) {
            console.log(chalk.red(`\n❌ Git push failed: ${error.message}`));
        }
    }

    public async pull() {
        console.log(chalk.magenta.bold(`\n📥 Git Pull Auto-Sync`));
        try {
            cp.execSync('git pull', { stdio: 'inherit' });
            console.log(chalk.green.bold(`\n✅ Successfully pulled from remote.`));
        } catch (error: any) {
            console.log(chalk.red(`\n❌ Git pull failed: ${error.message}`));
        }
    }

    public async publish() {
        console.log(chalk.magenta.bold(`\n🌐 GitHub Auto-Publish Utility`));
        
        // 1. Check if GitHub CLI is installed
        try {
            cp.execSync('gh --version', { stdio: 'ignore' });
        } catch (e) {
            console.log(chalk.red.bold(`❌ GitHub CLI ('gh') is not installed.`));
            console.log(chalk.yellow(`Please install it from https://cli.github.com/ and run 'gh auth login' first.`));
            return;
        }

        // 2. Check if git is initialized
        try {
            cp.execSync('git rev-parse --is-inside-work-tree', { stdio: 'ignore' });
        } catch (e) {
            console.log(chalk.cyan(`Initializing Git repository...`));
            cp.execSync('git init', { stdio: 'ignore' });
        }

        // 3. Ask for Repository Details
        const inquirer = (await import('inquirer')).default;
        const currentFolder = process.cwd().split(/[\\/]/).pop() || 'my-project';

        const answers = await inquirer.prompt([
            {
                type: 'input',
                name: 'repoName',
                message: 'Enter Repository Name:',
                default: currentFolder
            },
            {
                type: 'input',
                name: 'description',
                message: 'Enter a short description for this repository:'
            },
            {
                type: 'list',
                name: 'visibility',
                message: 'Should the GitHub repository be Public or Private?',
                choices: ['Private', 'Public']
            }
        ]);

        const isPublic = answers.visibility === 'Public';
        const visibilityFlag = isPublic ? '--public' : '--private';
        
        // Sanitize description for CLI
        const safeDescription = answers.description.replace(/"/g, '\\"');

        console.log(chalk.cyan(`\nCreating ${answers.visibility} repository '${answers.repoName}' on GitHub and pushing code...`));
        
        try {
            // Check if there are initial commits, if not commit them
            const status = cp.execSync('git status --porcelain', { encoding: 'utf-8' });
            if (status.trim() !== '') {
                cp.execSync('git add .', { stdio: 'ignore' });
                cp.execSync('git commit -m "Initial commit from g-coder"', { stdio: 'ignore' });
            }

            cp.execSync(`gh repo create ${answers.repoName} -d "${safeDescription}" ${visibilityFlag} --source=. --remote=origin --push`, { stdio: 'inherit' });
            console.log(chalk.green.bold(`\n✅ Successfully published to GitHub!`));
        } catch (error: any) {
            console.log(chalk.red(`\n❌ Failed to publish repository: ${error.message}`));
        }
    }
}

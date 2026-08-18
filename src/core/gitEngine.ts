/**
 * Project: g-coder CLI Tool
 * Author: Developer Pintu
 * License: MIT - Free to use with proper attribution.
 */
import cp from 'child_process';
import chalk from 'chalk';
import inquirer from 'inquirer';
import { executeAiRequest, buildAiPrompt } from './api';
import { confirmAction } from './utils';

export class GitEngine {

    /**
     * Autonomous Auto-Pilot for `git push`.
     * Replaces standard push with smart diff parsing, token-optimized semantic commits, and auto-healing.
     */
    public async push(messageOpt: string | undefined, providerOpt: string) {
        console.log(chalk.magenta.bold(`\n🚀 Autonomous Git Auto-Pilot`));
        try {
            cp.execSync('git add .', { stdio: 'ignore' });
            const status = cp.execSync('git status --porcelain', { encoding: 'utf-8', maxBuffer: 1024 * 1024 * 50 });

            let commitMessage = messageOpt;

            if (status.trim() === '') {
                console.log(chalk.yellow('No pending changes to commit. Proceeding to push existing commits...'));
            } else {
                if (!commitMessage) {
                    console.log(chalk.cyan(`🧠 Analyzing workspace diff for smart semantic commit...`));
                    const diff = cp.execSync('git diff --cached', { encoding: 'utf-8', maxBuffer: 1024 * 1024 * 50 });

                    if (diff.trim().length > 0) {
                        try {
                            const truncatedDiff = diff.substring(0, 2500) + (diff.length > 2500 ? '\n...[DIFF TRUNCATED]' : '');
                            const prompt = `Generate a single, short, professional conventional commit message (e.g., "feat: implement secure input masking" or "fix: handle 429 rate limit") for the following git diff. Do not include quotes, explanations, or backticks.\n\nDiff:\n${truncatedDiff}`;
                            const fullPrompt = buildAiPrompt('ask', prompt);
                            
                            const generated = await executeAiRequest(fullPrompt, providerOpt);
                            commitMessage = generated.trim().replace(/^["']|["']$/g, '');
                            
                        } catch (aiError: any) {
                            console.log(chalk.yellow(`\n⚠ Token/API limit reached. Falling back to manual entry.`));
                            commitMessage = undefined;
                        }
                    } else {
                        commitMessage = "chore: auto-sync update";
                    }

                    const answers = await inquirer.prompt([
                        {
                            type: 'list',
                            name: 'action',
                            message: `Suggested Commit: "${chalk.white.bold(commitMessage || 'Manual Entry Required')}"`,
                            choices: [
                                { name: '🚀 Auto-Pilot (Commit & Push instantly)', value: 'auto' },
                                { name: '📝 Edit Message manually', value: 'edit' },
                                { name: '❌ Cancel', value: 'cancel' }
                            ]
                        }
                    ]);

                    if (answers.action === 'cancel') {
                        console.log(chalk.yellow('Push aborted.'));
                        return;
                    }

                    if (answers.action === 'edit' || !commitMessage) {
                        const manual = await inquirer.prompt([{
                            type: 'input',
                            name: 'msg',
                            message: 'Enter commit message:',
                            default: commitMessage || 'chore: update'
                        }]);
                        commitMessage = manual.msg;
                    }
                }

                const safeCommitMessage = (commitMessage || 'chore: auto-sync update').replace(/[\r\n\0]/g, ' ').trim().slice(0, 500);
                cp.execFileSync('git', ['commit', '-m', safeCommitMessage], { stdio: 'inherit' });
            }

            console.log(chalk.cyan(`\nPushing to remote origin...`));
            try {
                cp.execSync('git push', { stdio: 'inherit' });
                console.log(chalk.green.bold(`\n✅ Successfully pushed to remote.`));
            } catch (pushError: any) {
                await this.handleGitError(pushError, 'push', providerOpt);
            }

        } catch (error: any) {
            console.log(chalk.red(`\n❌ Git operation failed: ${error.message}`));
        }
    }

    /**
     * Elite Auto-Pilot: Autonomously adds, diffs, generates commit msg, and pushes.
     */
    public async autoPilot(provider: string) {
        console.log(chalk.magenta.bold(`\n✈️  [Git Auto-Pilot] Engaging Autonomous Version Control...`));
        try {
            cp.execSync('git add .', { stdio: 'ignore' });
            const diff = cp.execSync('git diff --cached', { encoding: 'utf8' });
            
            if (!diff.trim()) {
                console.log(chalk.yellow(`⚠ No staged changes detected by Auto-Pilot.`));
                return;
            }

            console.log(chalk.gray(`[Auto-Pilot] Analyzing diffs & generating semantic commit...`));
            const prompt = `Act as a Senior Engineer. Analyze this Git diff and write a professional, concise, semantic commit message (e.g. 'feat: added auth').
Output ONLY the raw commit message. No markdown.
Diff:
${diff.substring(0, 3000)}`;
            
            const aiMsg = await executeAiRequest(buildAiPrompt('run', prompt, 'architect'), provider);
            const cleanMsg = aiMsg.replace(/["']/g, '').trim();

            console.log(chalk.cyan(`Committing: "${cleanMsg}"`));
            cp.execSync(`git commit -m "${cleanMsg}"`, { stdio: 'ignore' });
            
            console.log(chalk.gray(`[Auto-Pilot] Pushing to remote...`));
            cp.execSync('git push', { stdio: 'ignore' });
            
            console.log(chalk.green.bold(`✅ Auto-Pilot complete! Changes are live.`));
        } catch (e: any) {
            console.error(chalk.red(`❌ Auto-Pilot encountered an error: ${e.message}`));
        }
    }

    /**
     * Smart Error Parsing and Auto-Healing Engine
     */
    private async handleGitError(error: any, operation: string, providerOpt: string) {
        console.log(chalk.yellow(`\n⚠ Git ${operation} failed. Initiating Smart Auto-Healer...`));
        const stderr = error.stderr ? error.stderr.toString() : error.message;

        console.log(chalk.gray(`Error Trace: ${stderr.substring(0, 200)}...`));

        try {
            const prompt = `Act as an elite Git Master. A 'git ${operation}' command failed with the following error:\n\n${stderr}\n\nDiagnose the issue and output ONLY the exact terminal command(s) needed to fix this (e.g., 'git pull --rebase' or 'git config --global user.name "..."'). If multiple commands are needed, separate them with &&. Do not include markdown or explanations.`;
            const fullPrompt = buildAiPrompt('ask', prompt);
            
            const fixCommand = await executeAiRequest(fullPrompt, providerOpt);
            const cleanCommand = fixCommand.replace(/```(bash|sh)?/g, '').replace(/```/g, '').trim();

            console.log(chalk.cyan(`\n🛠️  AI Suggested Recovery Fix: `) + chalk.white(cleanCommand));

            const confirm = await confirmAction(chalk.yellow.bold(`Execute this auto-fix command now?`));
            if (confirm) {
                console.log(chalk.gray(`> Executing: ${cleanCommand}`));
                cp.execSync(cleanCommand, { stdio: 'inherit' });
                console.log(chalk.green(`\n✔ Auto-fix applied! You may need to retry your original command.`));
            } else {
                console.log(chalk.yellow('Auto-fix aborted. Please resolve the git error manually.'));
            }
        } catch (aiError) {
            console.log(chalk.red(`\n❌ Auto-Healer failed to generate a fix due to API constraints. Please resolve manually.`));
        }
    }

    public async pull() {
        console.log(chalk.magenta.bold(`\n📥 Git Pull Auto-Sync`));
        try {
            cp.execSync('git pull', { stdio: 'inherit' });
            console.log(chalk.green.bold(`\n✅ Successfully pulled from remote.`));
        } catch (error: any) {
             await this.handleGitError(error, 'pull', 'gemini');
        }
    }

    public async publish(providerOpt: string = 'gemini') {
        console.log(chalk.magenta.bold(`\n🌐 GitHub Auto-Publish Utility`));
        try {
            cp.execSync('gh --version', { stdio: 'ignore' });
        } catch (e) {
            console.log(chalk.red.bold(`❌ GitHub CLI ('gh') is not installed. Please install it.`));
            return;
        }

        try {
            cp.execSync('git rev-parse --is-inside-work-tree', { stdio: 'ignore' });
        } catch (e) {
            console.log(chalk.cyan(`Initializing Git repository...`));
            cp.execSync('git init', { stdio: 'ignore' });
        }

        const inquirer = (await import('inquirer')).default;
        const currentFolder = process.cwd().split(/[\\/]/).pop() || 'my-project';

        const answers = await inquirer.prompt([
            { type: 'input', name: 'repoName', message: 'Enter Repository Name:', default: currentFolder },
            { type: 'list', name: 'visibility', message: 'Repository Visibility:', choices: ['Private', 'Public'] }
        ]);

        const visibilityFlag = answers.visibility === 'Public' ? '--public' : '--private';
        console.log(chalk.cyan(`\nCreating ${answers.visibility} repository '${answers.repoName}' on GitHub...`));

        try {
            cp.execSync('git add .', { stdio: 'ignore' });
            try { cp.execSync('git commit -m "Initial commit"', { stdio: 'ignore' }); } catch(e) {}
            cp.execFileSync('gh', ['repo', 'create', answers.repoName, visibilityFlag, '--source=.', '--remote=origin', '--push'], { stdio: 'inherit' });
            console.log(chalk.green.bold(`\n✅ Successfully published to GitHub!`));
        } catch (error: any) {
            await this.handleGitError(error, 'gh repo create', providerOpt);
        }
    }

    public async cleanup() {
        console.log(chalk.magenta.bold(`\n🧹 Git Branch Cleanup Utility`));
        try {
            cp.execSync('git fetch --prune', { stdio: 'ignore' });
            const branchesRaw = cp.execSync('git branch', { encoding: 'utf-8' });

            const branches = branchesRaw.split('\n').map(b => b.trim().replace('* ', '')).filter(b => b.length > 0 && b !== 'main' && b !== 'master');

            if (branches.length === 0) {
                console.log(chalk.green('Your local repository is already clean. No stale branches found.'));
                return;
            }

            console.log(chalk.cyan(`Found the following non-main branches:`));
            branches.forEach(b => console.log(chalk.gray(`  - ${b}`)));

            const isConfirmed = await confirmAction(chalk.yellow.bold(`Delete these ${branches.length} branches safely?`));

            if (isConfirmed) {
                let deletedCount = 0;
                for (const branch of branches) {
                    try {
                        cp.execFileSync('git', ['branch', '-d', '--', branch], { stdio: 'ignore' });
                        console.log(chalk.green(`✔ Deleted ${branch}`));
                        deletedCount++;
                    } catch (e) {
                        console.log(chalk.yellow(`⚠ Could not safely delete ${branch} (might have unmerged changes).`));
                    }
                }
                console.log(chalk.green.bold(`\n✅ Cleanup complete! Deleted ${deletedCount} branches.`));
            }
        } catch (error: any) {
            console.log(chalk.red(`Git cleanup failed: ${error.message}`));
        }
    }

    public async createPullRequest(branchName: string, providerOpt: string = 'gemini') {
        console.log(chalk.magenta.bold(`\n🔁 GitHub Auto-PR Creator`));
        try { cp.execSync('gh --version', { stdio: 'ignore' }); } catch (e) {
            console.log(chalk.red.bold(`❌ GitHub CLI ('gh') is not installed.`)); return;
        }

        try {
            console.log(chalk.cyan(`Pushing branch '${branchName}' to remote...`));
            cp.execSync(`git push -u origin ${branchName}`, { stdio: 'ignore' });
            
            console.log(chalk.cyan(`🧠 Analyzing diffs to generate PR summary...`));
            const diff = cp.execSync(`git diff main...${branchName}`, { encoding: 'utf-8', maxBuffer: 1024 * 1024 * 50 });
            let prTitle = `Auto-generated PR for ${branchName}`;
            let prBody = `This PR contains changes pushed to ${branchName}.`;

            if (diff.trim().length > 0) {
                const truncatedDiff = diff.substring(0, 3000) + (diff.length > 3000 ? '\n...[DIFF TRUNCATED]' : '');
                const prompt = `Based on the following git diff, generate a title and body for a GitHub Pull Request. Format exactly as:\nTITLE: <title>\nBODY: <body>\n\nDiff:\n${truncatedDiff}`;
                const fullPrompt = buildAiPrompt('ask', prompt);
                const res = await executeAiRequest(fullPrompt, providerOpt);
                const match = res.match(/TITLE:\s*(.*?)\nBODY:\s*([\s\S]*)/i);
                if (match) { prTitle = match[1].trim(); prBody = match[2].trim(); }
            }
            console.log(chalk.cyan(`Opening Pull Request via gh CLI...`));
            cp.execFileSync('gh', ['pr', 'create', '--title', prTitle, '--body', prBody, '--base', 'main', '--head', branchName], { stdio: 'inherit' });
            console.log(chalk.green.bold(`\n✅ Successfully created Pull Request!`));
        } catch (error: any) {
            await this.handleGitError(error, 'gh pr create', providerOpt);
        }
    }
}

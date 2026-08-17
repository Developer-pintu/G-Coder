import cp from 'child_process';
import chalk from 'chalk';
import inquirer from 'inquirer';
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
                        cp.execFileSync('git', ['branch', '-d', '--', branch], { stdio: 'ignore' });
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
            const status = cp.execSync('git status --porcelain', { encoding: 'utf-8', maxBuffer: 1024 * 1024 * 50 });

            let commitMessage = messageOpt;

            if (status.trim() === '') {
                console.log(chalk.yellow('No pending changes to commit. Proceeding to push existing commits...'));
            } else {
                if (!commitMessage) {
                    console.log(chalk.cyan(`Analyzing git diff to generate an AI commit message...`));
                    const diff = cp.execSync('git diff --cached', { encoding: 'utf-8', maxBuffer: 1024 * 1024 * 50 });

                    if (diff.trim().length > 0) {
                        try {
                            const prompt = `Generate a single, short, professional conventional commit message (e.g., "feat: added login page") for the following git diff. Output ONLY the message, no quotes or explanation:\n\n${diff.substring(0, 3000)}`;
                            const fullPrompt = buildAiPrompt('ask', prompt);
                            let generated = await executeAiRequest(fullPrompt, providerOpt);
                            commitMessage = generated.trim().replace(/^["']|["']$/g, '');
                            console.log(chalk.green(`✔ AI Generated Message: `) + chalk.white(commitMessage));
                        } catch (aiError: any) {
                            console.log(chalk.yellow(`\n⚠ AI commit generation failed: ${aiError.message}`));
                            const answer = await inquirer.prompt([{
                                type: 'input',
                                name: 'manualMessage',
                                message: 'Please enter a manual commit message:',
                                default: 'chore: manual update'
                            }]);
                            commitMessage = answer.manualMessage;
                        }
                    } else {
                        commitMessage = "chore: auto-sync update";
                    }
                }

                const safeCommitMessage = (commitMessage || 'chore: auto-sync update').replace(/[\r\n\0]/g, ' ').trim().slice(0, 500);
                cp.execFileSync('git', ['commit', '-m', safeCommitMessage], { stdio: 'inherit' });
            }

            console.log(chalk.cyan(`Pushing to remote...`));
            try {
                cp.execSync('git push', { stdio: 'inherit' });
                console.log(chalk.green.bold(`\n✅ Successfully pushed to remote.`));
            } catch (pushError: any) {
                console.log(chalk.yellow(`\n⚠ Git push failed (likely out of sync with remote). Attempting professional auto-fix (pull --rebase)...`));
                try {
                    cp.execSync('git pull --rebase', { stdio: 'inherit' });
                    console.log(chalk.cyan(`Auto-merge successful. Pushing again...`));
                    cp.execSync('git push', { stdio: 'inherit' });
                    console.log(chalk.green.bold(`\n✅ Successfully pushed to remote after auto-fix!`));
                } catch (rebaseError: any) {
                    console.log(chalk.red.bold(`\n❌ Auto-fix failed. There might be merge conflicts you need to resolve manually.`));
                    throw rebaseError;
                }
            }

        } catch (error: any) {
            console.log(chalk.red(`\n❌ Git operation failed: ${error.message}`));
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

    public async publish(providerOpt: string = 'gemini') {
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

        // 3. AI Description Generation
        console.log(chalk.cyan(`\n🧠 Analyzing project to generate the best repository description...`));
        let aiSuggestedDesc = "An awesome project built with g-coder";
        try {
            // Read basic project info
            let context = "No specific project details found. It's a standard code repository.";
            const fs = await import('fs');
            const path = await import('path');
            const pkgPath = path.join(process.cwd(), 'package.json');
            if (fs.existsSync(pkgPath)) {
                const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf-8'));
                context = `Project Name: ${pkg.name || 'unknown'}\nDescription: ${pkg.description || 'N/A'}\nDependencies: ${Object.keys(pkg.dependencies || {}).join(', ')}`;
            } else {
                const readmePath = path.join(process.cwd(), 'README.md');
                if (fs.existsSync(readmePath)) {
                    context = fs.readFileSync(readmePath, 'utf-8').substring(0, 500);
                }
            }

            const prompt = `Based on this context, write a single, short, highly attractive 1-sentence GitHub repository description (max 120 chars). Output ONLY the description, no quotes.\n\nContext:\n${context}`;
            const fullPrompt = buildAiPrompt('ask', prompt);
            const res = await executeAiRequest(fullPrompt, providerOpt);

            if (res && res.trim().length > 5) {
                aiSuggestedDesc = res.trim().replace(/^["']|["']$/g, '');
                console.log(chalk.green(`✔ AI Suggestion: `) + chalk.white(aiSuggestedDesc));
            }
        } catch (e) {
            console.log(chalk.yellow(`⚠ Could not generate AI description. Using fallback.`));
        }

        // 4. Ask for Repository Details
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
                message: 'Enter a short description for this repository:',
                default: aiSuggestedDesc
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

        const safeDescription = String(answers.description).replace(/[\r\n\0]/g, ' ').trim().slice(0, 350);
        const safeRepoName = String(answers.repoName).trim();
        if (!/^[A-Za-z0-9._-]{1,100}$/.test(safeRepoName)) {
            console.log(chalk.red('❌ Repository name may only contain letters, numbers, dots, underscores, and hyphens.'));
            return;
        }

        console.log(chalk.cyan(`\nCreating ${answers.visibility} repository '${answers.repoName}' on GitHub and pushing code...`));

        try {
            // Check if there are initial commits, if not commit them
            const status = cp.execSync('git status --porcelain', { encoding: 'utf-8', maxBuffer: 1024 * 1024 * 50 });
            if (status.trim() !== '') {
                cp.execSync('git add .', { stdio: 'ignore' });
                cp.execSync('git commit -m "Initial commit from g-coder"', { stdio: 'ignore' });
            }

            cp.execFileSync('gh', ['repo', 'create', safeRepoName, '-d', safeDescription, visibilityFlag, '--source=.', '--remote=origin', '--push'], { stdio: 'inherit' });
            console.log(chalk.green.bold(`\n✅ Successfully published to GitHub!`));
        } catch (error: any) {
            console.log(chalk.red(`\n❌ Failed to publish repository: ${error.message}`));
        }
    }

    public async createPullRequest(branchName: string, providerOpt: string = 'gemini') {
        console.log(chalk.magenta.bold(`\n🔁 GitHub Auto-PR Creator`));

        // 1. Check if GitHub CLI is installed
        try {
            cp.execSync('gh --version', { stdio: 'ignore' });
        } catch (e) {
            console.log(chalk.red.bold(`❌ GitHub CLI ('gh') is not installed.`));
            console.log(chalk.yellow(`Please install it from https://cli.github.com/ and run 'gh auth login' first.`));
            return;
        }

        try {
            // Push the branch first
            console.log(chalk.cyan(`Pushing branch '${branchName}' to remote...`));
            cp.execSync(`git push -u origin ${branchName}`, { stdio: 'ignore' });

            // Generate PR summary using AI
            console.log(chalk.cyan(`🧠 Analyzing diffs to generate PR summary...`));
            const diff = cp.execSync(`git diff main...${branchName}`, { encoding: 'utf-8', maxBuffer: 1024 * 1024 * 50 });
            
            let prTitle = `Auto-generated PR for ${branchName}`;
            let prBody = `This PR contains changes pushed to ${branchName}.`;

            if (diff.trim().length > 0) {
                const prompt = `Based on the following git diff, generate a title and body for a GitHub Pull Request. Format your output exactly as:\nTITLE: <title>\nBODY: <body>\n\nDiff:\n${diff.substring(0, 4000)}`;
                const fullPrompt = buildAiPrompt('ask', prompt);
                const res = await executeAiRequest(fullPrompt, providerOpt);
                
                const match = res.match(/TITLE:\s*(.*?)\nBODY:\s*([\s\S]*)/i);
                if (match) {
                    prTitle = match[1].trim();
                    prBody = match[2].trim();
                    console.log(chalk.green(`✔ AI generated PR details successfully.`));
                }
            }

            // Create PR using gh CLI
            console.log(chalk.cyan(`Opening Pull Request via gh CLI...`));
            cp.execFileSync('gh', ['pr', 'create', '--title', prTitle, '--body', prBody, '--base', 'main', '--head', branchName], { stdio: 'inherit' });
            
            console.log(chalk.green.bold(`\n✅ Successfully created Pull Request!`));

        } catch (error: any) {
            console.log(chalk.red(`\n❌ Failed to create PR: ${error.message}`));
        }
    }
}

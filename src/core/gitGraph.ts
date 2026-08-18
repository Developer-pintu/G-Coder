/**
 * Project: g-coder CLI Tool
 * Author: Developer Pintu
 * License: MIT - Free to use with proper attribution.
 */
import cp from 'child_process';
import chalk from 'chalk';

export class GitChronicles {
    /**
     * Extracts recent commit history to provide context for new commits.
     */
    public static getContext(limit: number = 5): string {
        try {
            const log = cp.execSync(`git log -n ${limit} --oneline`, { encoding: 'utf-8' });
            return `\nRecent History:\n${log}`;
        } catch {
            return '';
        }
    }

    /**
     * Enhances a commit generation prompt with historical context (Neural Graph).
     */
    public static enhancePrompt(diff: string): string {
        const history = this.getContext();
        return `Generate a single, short, professional conventional commit message (e.g., "feat: added login page") for the following git diff. Output ONLY the message.
        
Context from the Git Neural Graph:
${history}

Diff:
${diff.substring(0, 3000)}`;
    }
}

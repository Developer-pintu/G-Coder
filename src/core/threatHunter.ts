/**
 * Project: g-coder CLI Tool
 * Author: Developer Pintu
 * License: MIT - Free to use with proper attribution.
 */
import chalk from 'chalk';

export class ThreatHunter {
    private static readonly SECRET_PATTERNS = [
        /(A3T[A-Z0-9]|AKIA|AGPA|AIDA|AROA|AIPA|ANPA|ANVA|ASIA)[A-Z0-9]{16}/, // AWS
        /sk-[a-zA-Z0-9]{48}/, // OpenAI/Anthropic
        /github_pat_[a-zA-Z0-9]{22}_[a-zA-Z0-9]{59}/, // GitHub Fine-Grained
        /ghp_[a-zA-Z0-9]{36}/, // GitHub PAT
        /-----BEGIN RSA PRIVATE KEY-----/,
        /password\s*=\s*['"][^'"]+['"]/i, // Hardcoded password
        /eyJ[a-zA-Z0-9]{10,}\.eyJ[a-zA-Z0-9]{10,}\.[a-zA-Z0-9_-]{10,}/ // Generic JWT
    ];

    /**
     * Scans a git diff for hardcoded secrets and credentials.
     * Returns true if the diff is clean, false if threats are found.
     */
    public static scanDiff(diff: string): boolean {
        let isClean = true;
        
        for (const pattern of this.SECRET_PATTERNS) {
            const match = diff.match(pattern);
            if (match) {
                console.log(chalk.bgRed.white.bold(`\n 🚨 SECURITY THREAT DETECTED `));
                console.log(chalk.red(`Detected leaked credential matching pattern: ${pattern}`));
                console.log(chalk.yellow(`The push has been blocked to protect your infrastructure.`));
                isClean = false;
                break;
            }
        }
        
        return isClean;
    }
}

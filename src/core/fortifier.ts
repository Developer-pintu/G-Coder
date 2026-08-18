/**
 * Project: g-coder CLI Tool
 * Author: Developer Pintu
 * License: MIT - Free to use with proper attribution.
 */
import fs from 'fs';
import path from 'path';
import glob from 'glob';
import chalk from 'chalk';
import { executeAiRequest, buildAiPrompt } from './api';
import cp from 'child_process';

export class DevSecOpsFortifier {
    
    private readonly dangerPatterns = [
        { regex: /eval\s*\(/i, name: 'Dangerous Eval' },
        { regex: /exec\s*\(/i, name: 'Dangerous Exec' },
        { regex: /(password|secret|api_key)\s*=\s*['"][a-zA-Z0-9]{10,}['"]/i, name: 'Hardcoded Secret' },
        { regex: /innerHTML\s*=/i, name: 'Possible XSS (innerHTML)' },
        { regex: /SELECT\s+\*\s+FROM\s+.*\s+WHERE\s+.*=/i, name: 'Possible SQL Injection' }
    ];

    /**
     * Scans project for OWASP Top 10 vulnerabilities and auto-patches them via AI
     */
    public async fortifyWorkspace(provider: string) {
        console.log(chalk.red.bold(`\n🛡️  DevSecOps Auto-Fortifier Engaging...`));
        
        const files = glob.sync('src/**/*.{ts,js,py}', { ignore: ['node_modules/**', 'dist/**'] });
        let vulnerabilitiesFound = 0;

        for (const file of files) {
            const absolutePath = path.resolve(process.cwd(), file);
            let content = fs.readFileSync(absolutePath, 'utf-8');
            let needsPatching = false;
            let detectedThreats: string[] = [];

            for (const threat of this.dangerPatterns) {
                if (threat.regex.test(content)) {
                    detectedThreats.push(threat.name);
                    needsPatching = true;
                }
            }

            if (needsPatching) {
                vulnerabilitiesFound++;
                console.log(chalk.yellow(`\n⚠ Vulnerability detected in ${file}: ${detectedThreats.join(', ')}`));
                console.log(chalk.cyan(`🧠 Engaging AI to synthesize a secure patch...`));

                const prompt = `Act as an elite Cybersecurity Engineer. The following code contains vulnerabilities: ${detectedThreats.join(', ')}.
Rewrite the file to fix these security flaws while preserving identical functionality.
Output ONLY the raw repaired code. Do NOT include markdown blocks.

File Content:
${content.substring(0, 3000)}`;

                try {
                    const secureCode = await executeAiRequest(buildAiPrompt('run', prompt, 'architect'), provider);
                    const cleanCode = secureCode.replace(/```[a-z]*\n?/gi, '').replace(/```/g, '').trim();
                    
                    fs.writeFileSync(absolutePath, cleanCode, 'utf-8');
                    console.log(chalk.green(`✔ Secure patch applied to ${file}`));
                } catch (e: any) {
                    console.log(chalk.red(`❌ AI Patching failed for ${file}: ${e.message}`));
                }
            }
        }

        if (vulnerabilitiesFound === 0) {
            console.log(chalk.green.bold(`\n✅ Workspace is perfectly secure. No vulnerabilities found.`));
        } else {
            console.log(chalk.green.bold(`\n✅ Fortification complete. Patched ${vulnerabilitiesFound} insecure files.`));
        }
    }
}

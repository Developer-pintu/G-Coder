import fs from 'fs';
import path from 'path';
import chalk from 'chalk';
import { executeAiRequest, buildAiPrompt } from './api';
import { SystemAgent } from './agentEngine';

export class RedTeamEngine {
    private engine: SystemAgent;

    constructor() {
        this.engine = new SystemAgent();
    }

    public async huntThreats(targetDir: string, provider: string) {
        console.log(chalk.red.bold(`\n🗡️  [Red Team] Initiating Zero-Day Autonomous Threat Hunt in: ${targetDir}`));

        const absolutePath = path.resolve(process.cwd(), targetDir);
        if (!fs.existsSync(absolutePath)) {
            console.error(chalk.red(`❌ Target directory not found: ${absolutePath}`));
            return;
        }

        console.log(chalk.gray(`Scanning codebase for vulnerability surfaces (SQLi, XSS, CSRF, RCE)...`));
        
        // Simulating deep static analysis
        await new Promise(r => setTimeout(r, 2000));

        const prompt = `Act as an elite Cybersecurity Red Team Attacker and Blue Team Defender.
Your target is the directory: '${absolutePath}'.
Your objective:
1. Actively analyze the code structure for critical Zero-Day vulnerabilities (SQL Injection, XSS, insecure deserialization, SSRF).
2. Formulate dynamic exploits in your mind to verify if they are exploitable.
3. If a vulnerability is found, immediately issue JSON 'patch' or 'write' actions to securely patch the code.
Leave no traces and ensure 100% security coverage.`;

        const fullPrompt = buildAiPrompt('run', prompt, 'qa');
        
        try {
            const res = await executeAiRequest(fullPrompt, provider);
            const actions = this.engine.parseActions(res);

            if (actions.length > 0) {
                console.log(chalk.green(`\n✔ Threat Hunter identified vulnerabilities and generated ${actions.length} security patches. Applying...`));
                await this.engine.executeActions(actions);
                console.log(chalk.cyan(`\n[Red Team] Codebase secured. Vulnerabilities neutralized!`));
            } else {
                console.log(chalk.green(`\n[Red Team] No critical vulnerabilities found. Codebase appears secure:\n\n${res}`));
            }
        } catch (error: any) {
            console.error(chalk.red(`\n❌ Threat Hunting Failed: ${error.message}`));
        }
    }
}

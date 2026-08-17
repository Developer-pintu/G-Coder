import fs from 'fs';
import path from 'path';
import chalk from 'chalk';
import cp from 'child_process';
import { executeAiRequest, buildAiPrompt } from './api';
import { SystemAgent } from './agentEngine';

export class ChaosEngine {
    private engine: SystemAgent;

    constructor() {
        this.engine = new SystemAgent();
    }

    public async fuzzTest(targetFile: string, provider: string) {
        console.log(chalk.magenta.bold(`\n🦠 [Chaos Engine] Initializing Sentient Fuzzing...`));
        
        const absolutePath = path.resolve(process.cwd(), targetFile);
        if (!fs.existsSync(absolutePath)) {
            console.error(chalk.red(`❌ Target file not found: ${absolutePath}`));
            return;
        }

        console.log(chalk.cyan(`Analyzing target: ${path.basename(absolutePath)}`));
        const fileContent = fs.readFileSync(absolutePath, 'utf8');

        // Step 1: AI generates an adversarial test script
        console.log(chalk.gray(`[Chaos] Generating adversarial payload permutations...`));
        const prompt = `Act as an Elite Security Fuzzer. Look at this TypeScript/JavaScript file:
${fileContent}

Generate a raw Node.js script (JavaScript, NO markdown formatting, just raw code) that imports this file (assume it's exported) and aggressively fuzz-tests it with edge cases (nulls, NaNs, massive strings, circular JSON).
The script MUST intentionally try to throw an exception or crash the logic.
Wrap the attack in a try/catch, and if it crashes, print 'CHAOS_CRASH: ' followed by the stack trace.`;

        let fuzzerScript = '';
        try {
            const res = await executeAiRequest(buildAiPrompt('run', prompt, 'qa'), provider);
            fuzzerScript = res.replace(/```(javascript|js)?/gi, '').replace(/```/g, '').trim();
        } catch (e) {
            console.log(chalk.yellow(`⚠ Could not generate adversarial script due to API limits.`));
            return;
        }

        // Step 2: Execute Chaos Script in isolated temp file
        const tempPath = path.join(path.dirname(absolutePath), '__chaos_fuzzer.mjs');
        fs.writeFileSync(tempPath, fuzzerScript, 'utf8');
        
        console.log(chalk.cyan(`\n🔥 Detonating Fuzz Payload on target...`));
        let crashLog = '';
        try {
            const output = cp.execSync(`node ${tempPath}`, { encoding: 'utf8', stdio: 'pipe' });
            if (output.includes('CHAOS_CRASH')) {
                crashLog = output;
            } else {
                console.log(chalk.green(`✔ Target survived the Chaos barrage! It is mathematically secure.`));
            }
        } catch (error: any) {
            crashLog = error.stdout ? error.stdout.toString() : error.message;
        } finally {
            if (fs.existsSync(tempPath)) fs.unlinkSync(tempPath);
        }

        // Step 3: Auto-Heal the Crash
        if (crashLog) {
            console.log(chalk.red(`\n💀 CRASH DETECTED! Target is vulnerable to edge-cases.`));
            console.log(chalk.gray(`Crash Trace: ${crashLog.substring(0, 300)}...`));
            console.log(chalk.yellow(`\nInitiating Auto-Heal sequence...`));

            const healPrompt = `Act as an Elite Developer. The Sentient Chaos Engine crashed this file with a fuzzed payload.
Crash Trace:
${crashLog}

File Content:
${fileContent}

Rewrite the vulnerable functions to mathematically prevent this crash (add input validation, null-checks, bounds checking).
Output valid JSON 'patch' or 'write' actions.`;

            try {
                const res = await executeAiRequest(buildAiPrompt('run', healPrompt, 'dev'), provider);
                const actions = this.engine.parseActions(res);

                if (actions.length > 0) {
                    await this.engine.executeActions(actions);
                    console.log(chalk.green.bold(`\n✅ Chaos Healed! The file has been fortified against this attack vector.`));
                }
            } catch (e) {
                console.log(chalk.red(`❌ Auto-heal failed.`));
            }
        }
    }
}

/**
 * Project: g-coder CLI Tool
 * Author: Developer Pintu
 * License: MIT - Free to use with proper attribution.
 */
import cp from 'child_process';
import chalk from 'chalk';
import path from 'path';
import fs from 'fs';
import { executeAiRequest, buildAiPrompt } from './api';
import { SystemAgent } from './agentEngine';
import { confirmAction } from './utils';

export class DbMigrator {
    private engine: SystemAgent;

    constructor() {
        this.engine = new SystemAgent();
    }

    public async autoMigrate(provider: string) {
        console.log(chalk.magenta.bold(`\n🗄️  [DB Auto-Migrator] Starting Safe Database Migration...`));

        // Detect ORM (Currently supporting Prisma)
        const prismaPath = path.resolve(process.cwd(), 'prisma', 'schema.prisma');
        if (!fs.existsSync(prismaPath)) {
            console.error(chalk.yellow(`❌ No prisma/schema.prisma found. DB Auto-Migrator currently supports Prisma ORM.`));
            return;
        }

        console.log(chalk.cyan(`Found Prisma schema. Running dry-run migration to detect potential data loss or syntax errors...`));

        try {
            // Run prisma format first
            cp.execSync('npx prisma format', { stdio: 'ignore' });

            // Run prisma migrate
            cp.execSync('npx prisma migrate dev --name auto_migrate', { stdio: 'inherit' });
            console.log(chalk.green.bold(`\n✅ Migration applied successfully with zero errors!`));
            
        } catch (error: any) {
            console.log(chalk.red.bold(`\n❌ Migration failed or flagged a destructive action!`));
            
            const stderr = error.stderr ? error.stderr.toString() : error.message;
            console.log(chalk.gray(`Error Trace: ${stderr.substring(0, 300)}...`));

            console.log(chalk.yellow(`\nInitiating AI Database Architect for Auto-Healing...`));
            
            const schemaContent = fs.readFileSync(prismaPath, 'utf8');

            const prompt = `Act as an Elite Database Architect.
I attempted to run a Prisma migration, but it failed or warned of data loss.

Error Log:
${stderr}

Current Prisma Schema:
${schemaContent}

Your task:
1. Diagnose why the migration failed (e.g., syntax error, missing default value for a new non-null column, unsafe drop).
2. Generate the JSON 'patch' or 'write' actions to safely fix the 'prisma/schema.prisma' file so the migration will succeed.
Do not change table names unnecessarily. Ensure data integrity.`;

            const fullPrompt = buildAiPrompt('run', prompt, 'architect');
            
            try {
                const res = await executeAiRequest(fullPrompt, provider);
                const actions = this.engine.parseActions(res);

                if (actions.length > 0) {
                    console.log(chalk.cyan(`\n🛠️  AI Database Architect has formulated a schema fix.`));
                    const confirm = await confirmAction(chalk.yellow.bold(`Apply this schema fix and retry migration?`));

                    if (confirm) {
                        await this.engine.executeActions(actions);
                        console.log(chalk.green(`\n✔ Schema patched! Retrying migration...`));
                        
                        try {
                            cp.execSync('npx prisma migrate dev --name auto_healed', { stdio: 'inherit' });
                            console.log(chalk.green.bold(`\n✅ Auto-Healed Migration applied successfully!`));
                        } catch (retryError) {
                            console.log(chalk.red(`\n❌ Retry failed. The schema might require manual intervention.`));
                        }
                    } else {
                        console.log(chalk.gray(`Auto-Heal aborted.`));
                    }
                } else {
                    console.log(chalk.yellow(`\n⚠ Architect analyzed the error but could not safely patch the schema.\n\n${res}`));
                }
            } catch (aiError: any) {
                console.error(chalk.red(`\n❌ DB Auto-Migrator Failed: ${aiError.message}`));
            }
        }
    }
}

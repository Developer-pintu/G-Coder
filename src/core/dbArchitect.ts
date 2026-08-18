/**
 * Project: g-coder CLI Tool
 * Author: Developer Pintu
 * License: MIT - Free to use with proper attribution.
 */
import chalk from 'chalk';
import { executeAiRequest, buildAiPrompt } from './api';
import { SystemAgent } from './agentEngine';
import fs from 'fs';
import path from 'path';

export class DbArchitect {
    private engine: SystemAgent;

    constructor() {
        this.engine = new SystemAgent();
    }

    public async generateSchema(description: string, provider: string) {
        console.log(chalk.magenta.bold(`\n🗄️  [DB Architect] Generating Database Schema for: ${description}`));
        
        const prompt = `Act as an expert Database Architect. Generate a complete Prisma schema (schema.prisma) for the following requirements: ${description}. Additionally, generate a seed script (seed.ts) to populate the database with at least 10 realistic fake records.`;
        
        const fullPrompt = buildAiPrompt('run', prompt, 'architect');
        
        try {
            const res = await executeAiRequest(fullPrompt, provider);
            const actions = this.engine.parseActions(res);
            
            if (actions.length > 0) {
                console.log(chalk.green(`\n✔ DB Architect proposed ${actions.length} file actions. Executing...`));
                await this.engine.executeActions(actions);
                
                // Inform user about next manual steps
                console.log(chalk.cyan(`\n[DB Architect] Next Steps:`));
                console.log(chalk.gray(`1. Run 'npm install prisma --save-dev'`));
                console.log(chalk.gray(`2. Run 'npx prisma db push' to sync your database.`));
                console.log(chalk.gray(`3. Run 'npx ts-node prisma/seed.ts' to populate fake data.`));
            } else {
                console.log(chalk.yellow(`\nDB Architect provided advice but no file actions:\n\n${res}`));
            }
        } catch (error: any) {
            console.error(chalk.red(`\n❌ DB Architecture Failed: ${error.message}`));
        }
    }
}

import fs from 'fs';
import path from 'path';
import chalk from 'chalk';
import { executeAiRequest, buildAiPrompt } from './api';
import { SystemAgent } from './agentEngine';

export class InfraMorph {
    private engine: SystemAgent;

    constructor() {
        this.engine = new SystemAgent();
    }

    public async morphInfrastructure(provider: string) {
        console.log(chalk.magenta.bold(`\n☁️  [Infra Morph] Initializing Self-Replicating Infrastructure...`));
        
        const pkgPath = path.resolve(process.cwd(), 'package.json');
        if (!fs.existsSync(pkgPath)) {
            console.error(chalk.red(`❌ Cannot find package.json in the current directory.`));
            return;
        }

        console.log(chalk.cyan(`Analyzing system dependencies from package.json...`));
        const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf8'));
        
        const deps = { ...pkg.dependencies, ...pkg.devDependencies };
        const depsString = Object.keys(deps).join(', ');

        const prompt = `Act as an Elite DevOps and Cloud Architect.
I have a Node.js project with the following dependencies:
${depsString}

Your task is to autonomously generate production-grade Infrastructure-as-Code (IaC) files to deploy this project flawlessly.
Analyze the dependencies to detect if the project needs Postgres (e.g., pg, prisma), Redis (e.g., redis, ioredis), or MongoDB, and include them in the Docker/Terraform configs if detected.

Generate the following files:
1. Dockerfile (Optimized, Multi-stage)
2. docker-compose.yml (Including detected database/cache services)
3. terraform/main.tf (Basic AWS/GCP architecture template for this stack)

Output valid JSON 'write' actions for these 3 files. Do not output anything else.`;

        try {
            console.log(chalk.gray(`[Morph] Designing cloud architecture via AI...`));
            const res = await executeAiRequest(buildAiPrompt('run', prompt, 'architect'), provider);
            const actions = this.engine.parseActions(res);

            if (actions.length > 0) {
                console.log(chalk.green(`\n✔ Cloud Architecture synthesized! Materializing IaC files...`));
                const terraformDir = path.resolve(process.cwd(), 'terraform');
                if (!fs.existsSync(terraformDir)) {
                    fs.mkdirSync(terraformDir, { recursive: true });
                }

                await this.engine.executeActions(actions);
                console.log(chalk.green.bold(`✅ Infrastructure Morphed Successfully! You are ready to deploy.`));
            } else {
                console.log(chalk.yellow(`⚠ AI could not formulate the infrastructure configurations.`));
            }
        } catch (e: any) {
            console.log(chalk.red(`\n❌ Infra Morph Failed: ${e.message}`));
        }
    }
}

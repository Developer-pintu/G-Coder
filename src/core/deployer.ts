import chalk from 'chalk';
import { executeAiRequest, buildAiPrompt } from './api';
import { SystemAgent } from './agentEngine';

export class DeployerEngine {
    private engine: SystemAgent;

    constructor() {
        this.engine = new SystemAgent();
    }

    public async deploy(target: string, provider: string) {
        console.log(chalk.blue.bold(`\n☁️  [1-Click Deployer] Preparing deployment to: ${target.toUpperCase()}`));
        
        const prompt = `Act as an expert DevOps Engineer. Generate the necessary deployment files (like Dockerfile, docker-compose.yml, vercel.json, or netlify.toml) to deploy the current workspace to ${target}. Look at the standard files you expect in a modern web app to make your decisions. Provide exactly what is needed to make the app live.`;
        
        const fullPrompt = buildAiPrompt('run', prompt, 'architect');
        
        try {
            const res = await executeAiRequest(fullPrompt, provider);
            const actions = this.engine.parseActions(res);
            
            if (actions.length > 0) {
                console.log(chalk.green(`\n✔ Cloud Deployer generated ${actions.length} configuration files. Executing...`));
                await this.engine.executeActions(actions);
                
                console.log(chalk.cyan(`\n[Cloud Deployer] Configuration complete.`));
                if (target.toLowerCase() === 'vercel') {
                    console.log(chalk.gray(`Run 'npx vercel' to push live!`));
                } else if (target.toLowerCase() === 'docker') {
                    console.log(chalk.gray(`Run 'docker-compose up -d --build' to start your containers!`));
                }
            } else {
                console.log(chalk.yellow(`\nDeployer provided advice but no file actions:\n\n${res}`));
            }
        } catch (error: any) {
            console.error(chalk.red(`\n❌ Deployment Configuration Failed: ${error.message}`));
        }
    }
}

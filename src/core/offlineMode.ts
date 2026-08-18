/**
 * Project: g-coder CLI Tool
 * Author: Developer Pintu
 * License: MIT - Free to use with proper attribution.
 */
import fs from 'fs';
import path from 'path';
import chalk from 'chalk';
import axios from 'axios';
import os from 'os';

const OFFLINE_FLAG_FILE = path.join(os.homedir(), '.g-coder', '.offline_mode');

export class OfflineModeEngine {
    
    public async toggleOffline(model: string) {
        if (fs.existsSync(OFFLINE_FLAG_FILE)) {
            // Turn it off
            fs.rmSync(OFFLINE_FLAG_FILE);
            console.log(chalk.green(`\n🌍 Air-Gapped Offline Mode DISABLED. G-Coder is now using Cloud AI.`));
            return;
        }

        console.log(chalk.cyan(`\n🔒 Enabling Air-Gapped Offline Mode...`));
        console.log(chalk.gray(`Verifying local Ollama instance on http://localhost:11434...`));

        try {
            // Check if Ollama is running
            await axios.get('http://localhost:11434/', { timeout: 3000 });
            
            // Save state
            const dir = path.dirname(OFFLINE_FLAG_FILE);
            if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
            
            fs.writeFileSync(OFFLINE_FLAG_FILE, JSON.stringify({ active: true, model }), 'utf8');
            
            console.log(chalk.green.bold(`\n✅ Air-Gapped Offline Mode ENABLED!`));
            console.log(chalk.gray(`All G-Coder requests will now be routed to your local GPU via Ollama (Model: ${model}).`));
            console.log(chalk.yellow(`Run 'g-coder offline' again to disable.`));

        } catch (error) {
            console.error(chalk.red(`\n❌ Failed to connect to local Ollama instance.`));
            console.error(chalk.gray(`Ensure Ollama is installed and running locally before activating Offline Mode.`));
        }
    }

    public static isOfflineActive(): { active: boolean, model: string } {
        if (fs.existsSync(OFFLINE_FLAG_FILE)) {
            try {
                const data = JSON.parse(fs.readFileSync(OFFLINE_FLAG_FILE, 'utf8'));
                return { active: true, model: data.model || 'llama3' };
            } catch (e) {
                return { active: false, model: '' };
            }
        }
        return { active: false, model: '' };
    }
}

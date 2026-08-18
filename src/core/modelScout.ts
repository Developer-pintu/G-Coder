/**
 * Project: g-coder CLI Tool
 * Author: Developer Pintu
 * License: MIT - Free to use with proper attribution.
 */
import axios from 'axios';
import fse from 'fs-extra';
import path from 'path';
import os from 'os';
import chalk from 'chalk';

export class ModelScout {
    private static cacheFile = path.join(os.homedir(), '.g-coder', '.scout-cache.json');
    private static exampleEnvPath = path.join(process.cwd(), '.env.example');

    public static async runScoutInBackground() {
        // Run completely asynchronously without awaiting, so it doesn't block the CLI boot
        this.scout().catch(() => { /* silent fail for background task */ });
    }

    private static async scout() {
        try {
            // Fetch public models from OpenRouter
            const response = await axios.get('https://openrouter.ai/api/v1/models', { timeout: 5000 });
            const currentModels: any[] = response.data?.data || [];
            
            if (currentModels.length === 0) return;

            let cachedCount = 0;
            if (fse.existsSync(this.cacheFile)) {
                try {
                    const cache = fse.readJsonSync(this.cacheFile);
                    cachedCount = cache.count || 0;
                } catch {
                    cachedCount = 0;
                }
            }

            // If we have more models than before, we found new ones!
            if (currentModels.length > cachedCount && cachedCount !== 0) {
                const diff = currentModels.length - cachedCount;
                console.log(chalk.green.bold(`\n\n🚀 [ModelScout] ${diff} new AI model(s) detected globally!`));
                console.log(chalk.cyan(`Run \`g-coder config\` to update your keys and try them out.\n`));
                
                // Optionally update .env.example with new generic keys if we wanted to
                // For safety and simplicity, we just notify the user.
            }

            // Update cache
            fse.ensureFileSync(this.cacheFile);
            fse.writeJsonSync(this.cacheFile, { count: currentModels.length, lastCheck: Date.now() });

        } catch (error) {
            // Background task, fail silently if offline
        }
    }
}

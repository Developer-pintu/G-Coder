/**
 * Project: g-coder CLI Tool
 * Author: Developer Pintu
 * License: MIT - Free to use with proper attribution.
 */
import { Command } from 'commander';
import chalk from 'chalk';
import { DocScout } from '../core/docScout';
import { executeAiRequest, buildAiPrompt } from '../core/api';
import { StateManager } from '../core/stateManager';

export const registerScoutCommand = (program: Command) => {
    program
        .command('scout <url> [query]')
        .description('Autonomously scrape a URL and optionally ask a query about it')
        .option('-p, --provider <provider>', 'Specify AI Provider', 'gemini')
        .action(async (url: string, query: string | undefined, options) => {
            const scout = new DocScout();
            const textContent = await scout.scrapeDocs(url);

            if (textContent.startsWith('[Failed')) {
                return;
            }

            if (!query) {
                console.log(chalk.yellow(`\n[DocScout] No query provided. Outputting raw scraped context snippet...`));
                console.log(chalk.gray(`${textContent.substring(0, 1000)}...\n`));
                
                // Optionally save to context
                new StateManager().recordHandoff('scout', `Documentation from ${url}:\n${textContent.substring(0, 5000)}`);
                console.log(chalk.green(`✅ Context saved to agent state for the next run.`));
                return;
            }

            console.log(chalk.cyan(`\n🧠 Analyzing documentation to answer your query...`));
            
            const prompt = `Based on the following scraped documentation from ${url}, answer this query: "${query}"\n\nDocumentation:\n${textContent}`;
            const fullPrompt = buildAiPrompt('ask', prompt);

            try {
                const res = await executeAiRequest(fullPrompt, options.provider);
                console.log(chalk.green(`\n✅ [DocScout AI Response]:\n`) + chalk.white(res));
            } catch (error: any) {
                console.error(chalk.red(`\n❌ DocScout AI Analysis Failed: ${error.message}`));
            }
        });
};

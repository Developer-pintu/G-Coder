/**
 * Project: g-coder CLI Tool
 * Author: Developer Pintu
 * License: MIT - Free to use with proper attribution.
 */
import { Command } from 'commander';
import chalk from 'chalk';
import { RagEngine } from '../core/ragEngine';

export const registerSearchCommand = (program: Command) => {
    program
        .command('search <query>')
        .description('Local RAG: Semantic search through your entire codebase')
        .action(async (query: string) => {
            const rag = new RagEngine();
            const matches = await rag.search(query);
            
            if (matches.length > 0) {
                console.log(chalk.cyan(`\nTop Semantic Matches:`));
                matches.forEach(m => console.log(chalk.gray(`- ${m}`)));
            }
        });
};

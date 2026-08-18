/**
 * Project: g-coder CLI Tool
 * Author: Developer Pintu
 * License: MIT - Free to use with proper attribution.
 */
import { Command } from 'commander';
import { MetadataEngine } from '../core/metadataEngine';
import chalk from 'chalk';

export const registerInspectCommand = (program: Command) => {
    program
        .command('inspect <file>')
        .description('High-Speed Deep Data Parser: Extract secure metadata and internal structure from any file.')
        .option('--json', 'Output the raw data as JSON instead of ANSI table')
        .action(async (file, options) => {
            try {
                const metadata = await MetadataEngine.extractMetadata(file);
                if (options.json) {
                    console.log(MetadataEngine.formatJson(metadata));
                } else {
                    console.log(MetadataEngine.formatAnsi(metadata));
                }
            } catch (error: any) {
                console.error(chalk.red(`\n❌ [MetadataEngine] Error: ${error.message}`));
            }
        });
};

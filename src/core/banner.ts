/**
 * Project: g-coder CLI Tool
 * Author: Developer Pintu
 * License: MIT - Free to use with proper attribution.
 */
import chalk from 'chalk';
import * as fs from 'fs';
import * as path from 'path';

/**
 * Retrieves the CLI version dynamically from package.json
 */
export const getCliVersion = (): string => {
    try {
        const metadata = JSON.parse(fs.readFileSync(path.resolve(__dirname, '..', '..', 'package.json'), 'utf8'));
        if (typeof metadata.version === 'string' && /^\d+\.\d+\.\d+(?:-[0-9A-Za-z.-]+)?$/.test(metadata.version)) {
            return metadata.version;
        }
    } catch {
        // Fallback version if not found
    }
    return '3.0.0';
};

/**
 * Displays the G-CODER ASCII Art Branding Banner with Copyright Attribution.
 */
export const displayDynamicBanner = (version?: string) => {
    const displayVersion = version || getCliVersion();
    const banner = `
  ____        ____ ___  ____  _____ ____  
 / ___|      / ___/ _ \\|  _ \\| ____|  _ \\ 
| |  _ _____| |  | | | | | | |  _| | |_) |
| |_| |_____| |__| |_| | |_| | |___|  _ < 
 \\____|      \\____\\___/|____/|_____|_| \\_\\
    `;
    console.log(chalk.cyan.bold(banner));
    
    // Official Project Name & Version
    console.log(chalk.white.bold(`  g-coder CLI Tool (v${displayVersion})`));
    console.log(chalk.gray('  Enterprise-Grade Autonomous AI Coding Agent'));
    console.log(chalk.gray('  Powered by Multi-Provider AI Architecture\n'));
    
    // Original Creator / Maintainer Credit
    console.log(chalk.bgBlue.white.bold(' © Original Creator & Maintainer: Developer Pintu '));
    console.log(chalk.blue(' MIT License - Free to use with proper attribution.\n'));
};

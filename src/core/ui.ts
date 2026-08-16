import chalk from 'chalk';

/**
 * Displays the G-CODER ASCII Art Branding Banner.
 * This function should be called on startup or in the help menu.
 */
export const displayBanner = () => {
    const banner = `
  ____        ____ ___  ____  _____ ____  
 / ___|      / ___/ _ \\|  _ \\| ____|  _ \\ 
| |  _ _____| |  | | | | | | |  _| | |_) |
| |_| |_____| |__| |_| | |_| | |___|  _ < 
 \\____|      \\____\\___/|____/|_____|_| \\_\\
    `;
    console.log(chalk.cyan.bold(banner));
    console.log(chalk.gray('  Enterprise-Grade Autonomous AI Coding Agent (v3.0.0)'));
    console.log(chalk.gray('  Powered by Multi-Provider AI Architecture\n'));
};

/**
 * Displays a customized, color-coded help screen.
 */
export const displayHelp = () => {
    displayBanner();
    console.log(chalk.yellow.bold(' COMMANDS:'));

    console.log(chalk.green('  g-coder chat') + chalk.white('       Start an interactive, continuous chat session with conversational memory (Recommended).'));
    console.log(chalk.green('  g-coder config') + chalk.white('     Masked wizard to securely configure API keys globally.'));
    console.log(chalk.green('  g-coder config --set <provider>') + chalk.white(' Securely replace keys for one provider.'));
    console.log(chalk.green('  g-coder update') + chalk.white('     Check for and install the latest verified global release.'));
    console.log(chalk.green('  g-coder env --setup') + chalk.white(' Audit and install required runtimes and project dependencies.'));
    console.log(chalk.green('  g-coder run [p]') + chalk.white('    Run a single autonomous instruction (e.g., "Create a new file called math.ts").'));
    console.log(chalk.green('  g-coder ask [q]') + chalk.white('    Ask a question to the AI without giving it file-editing powers.'));
    console.log(chalk.green('  g-coder audit') + chalk.white('      Run deterministic whole-workspace security diagnostics and readiness scoring.'));
    console.log(chalk.green('  g-coder files') + chalk.white('      Recursively list all files in the workspace (respects .gitignore).'));
    console.log(chalk.green('  g-coder update-docs') + chalk.white(' Autonomously analyze the project and update the README.md with capabilities.'));
    console.log(chalk.green('  g-coder help') + chalk.white('       Display this beautiful help screen.'));

    console.log(chalk.yellow.bold('\n OPTIONS:'));
    console.log(chalk.cyan('  -p, --provider') + chalk.white('    Specify the AI provider (gemini, groq, openrouter, etc.). Default is gemini.'));
    console.log(chalk.cyan('  -f, --file') + chalk.white('        Use with "run" to pass instructions from a file.'));

    console.log(chalk.magenta.bold('\n EXAMPLES:'));
    console.log(chalk.gray('  $ g-coder chat'));
    console.log(chalk.gray('  $ g-coder run "Refactor the rotator.ts file to use a class" -p groq'));
    console.log(chalk.gray('  $ g-coder audit\n'));
};

/**
 * Safely and robustly clears the terminal screen across all platforms.
 * It clears the screen, the scrollback buffer, and resets the cursor.
 */
export const clearTerminal = () => {
    // console.clear() is highly optimized for platform-specific (Windows/Mac) scrollback clearing
    console.clear();
    process.stdout.write('\x1B[3J'); // Backup escape for older terminals

    // Print a clean, professional header
    console.log(chalk.cyan.bold('\n=== G-CODER ==='));
    console.log(chalk.green('Ready for command...\n'));
};

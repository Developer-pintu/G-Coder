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
    console.log(chalk.green('  g-coder doctor') + chalk.white('     Diagnose CLI health, credentials, Git, Docker, and state.'));
    console.log(chalk.green('  g-coder verify') + chalk.white('     Run detected lint, test, type-check, and build pipelines.'));
    console.log(chalk.green('  g-coder run [p]') + chalk.white('    Run a single autonomous instruction (e.g., "Create a new file called math.ts").'));
    console.log(chalk.green('  g-coder ask [q]') + chalk.white('    Ask a question to the AI without giving it file-editing powers.'));
    console.log(chalk.green('  g-coder swarm <goal>') + chalk.white(' Trigger multi-agent swarm (Architect -> Dev -> QA -> Security).'));
    console.log(chalk.green('  g-coder vision <img_path> <prompt>') + chalk.white(' Image-to-Code generator (React/Tailwind from mockup).'));
    console.log(chalk.green('  g-coder scout <url>') + chalk.white(' Autonomously browse docs to extract up-to-date context.'));
    console.log(chalk.green('  g-coder pr <branch>') + chalk.white(' Push branch, auto-generate AI PR summary, and create PR via gh CLI.'));
    console.log(chalk.green('  g-coder listen <audio_path>') + chalk.white(' Voice-to-Code: Generate code by feeding an audio prompt.'));
    console.log(chalk.green('  g-coder search <query>') + chalk.white(' Local RAG: Fast semantic search across your entire project.'));
    console.log(chalk.green('  g-coder db <schema>') + chalk.white(' Auto-DB Architect: Generate Prisma schema and data seeders.'));
    console.log(chalk.green('  gcode deploy <target>') + chalk.white(' 1-Click Deployer: Generate Docker or Vercel configurations.'));
    console.log(chalk.green('  gcode morph') + chalk.white('             Infra Morph: Autonomously scans dependencies and generates IaC (Docker/Terraform).'));
    console.log(chalk.green('  gcode memory <act>') + chalk.white('      Local RAG Memory: Persist contextual decisions (e.g. gcode memory add "use Redis").'));
    console.log(chalk.green('  gcode predict') + chalk.white('           Neural Pre-Fetch: Watches git branch and pre-generates files in shadow folder.'));
    console.log(chalk.green('  gcode watch') + chalk.white('             Ghost Coder v2: Background auto-implement // TODO, // FIX, // REFACTOR tags.'));
    console.log(chalk.green('  gcode swarm-debug <f>') + chalk.white('   Multi-Agent Swarm: Spawns Architect, QA, and Dev agents to debate and fix a bug.'));
    console.log(chalk.green('  gcode train <src>') + chalk.white('       Sentient AI Academy: Autonomously reads a topic, generates a synthetic dataset, and deploys local AI.'));
    console.log(chalk.green('  gcode hologram <term>') + chalk.white('   Holographic Refactor: Safely run atomic, cross-file architectural rewrite in memory.'));
    console.log(chalk.green('  gcode chaos <file>') + chalk.white('      Chaos Engine: Fuzz-tests a file to crash it, then mathematically fortifies it.'));
    console.log(chalk.green('  gcode tests') + chalk.white('             Test Enforcer: Scans workspace and autonomously generates missing Jest/Vitest suites.'));
    console.log(chalk.green('  gcode migrate') + chalk.white('         DB Auto-Migrator: Safely migrates schema, detects data-loss, and auto-heals DB errors.'));
    console.log(chalk.green('  gcode sync') + chalk.white('            IDE Live Sync: Broadcast G-Coder AI edits directly to your VS Code.'));
    console.log(chalk.green('  gcode login') + chalk.white('           Securely login to capture fallback browser sessions (ChatGPT/Claude).'));
    console.log(chalk.green('  gcode logout') + chalk.white('          Wipe all local browser session cookies and fallbacks securely.'));
    console.log(chalk.green('  gcode heal <log>') + chalk.white('      CI/CD Healer: Analyze a failed pipeline log and auto-fix the code.'));
    console.log(chalk.green('  gcode debug <file>') + chalk.white('    "Time-Travel" Debugger: Execute script, catch crashes, and auto-fix.'));
    console.log(chalk.green('  gcode offline') + chalk.white('         Air-Gapped Privacy Mode: Toggle local AI execution via Ollama.'));
    console.log(chalk.green('  gcode matrix <name>') + chalk.white('   Monorepo Maestro: Mass-refactor all files dependent on a component.'));
    console.log(chalk.green('  gcode redteam <dir>') + chalk.white('   Zero-Day Threat Hunter: Autonomous vulnerability scanning & patching.'));
    console.log(chalk.green('  gcode audit') + chalk.white('           Run deterministic whole-workspace security diagnostics and readiness scoring.'));
    console.log(chalk.green('  gcode files') + chalk.white('           Recursively list all files in the workspace (respects .gitignore).'));
    console.log(chalk.green('  gcode update-docs') + chalk.white('     Autonomously analyze the project and update the README.md with capabilities.'));
    console.log(chalk.green('  gcode help') + chalk.white('            Display this beautiful help screen.'));

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

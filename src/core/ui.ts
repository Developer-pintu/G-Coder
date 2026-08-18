/**
 * Project: g-coder CLI Tool
 * Author: Developer Pintu
 * License: MIT - Free to use with proper attribution.
 */
import chalk from 'chalk';
import { displayDynamicBanner } from './banner';

/**
 * Displays the G-CODER ASCII Art Branding Banner.
 * This function should be called on startup or in the help menu.
 */
export const displayBanner = () => {
    displayDynamicBanner();
};

export const clearTerminal = () => {
    // console.clear() is highly optimized for platform-specific (Windows/Mac) scrollback clearing
    console.clear();
    process.stdout.write('\x1B[3J'); // Backup escape for older terminals

    // Print a clean, professional header
    console.log(chalk.cyan.bold('\n=== G-CODER ==='));
    console.log(chalk.green('Ready for command...\n'));
};

export const displayHelp = () => {
    displayBanner();
    const printCmd = (cmd: string, desc: string) => {
        console.log(`  ${chalk.yellow(cmd.padEnd(30))} ${desc}`);
    };

    console.log(chalk.bgCyan.black.bold(' 🧠 CORE AI & AUTONOMY '));
    printCmd('g-coder chat', 'Start an interactive, continuous chat session with conversational memory.');
    printCmd('g-coder hybrid [prompt]', 'The Omni-Router: Intelligently routes tasks to local high-speed engines or cloud AI.');
    printCmd('g-coder run [p]', 'Run a single autonomous instruction (e.g., "Create a new file called math.ts").');
    printCmd('g-coder evolve <cap>', 'Self-Evolving Engine: Dynamically synthesize and execute a missing capability.');
    printCmd('g-coder ask [q]', 'Ask a question to the AI without giving it file-editing powers.');
    printCmd('g-coder vision <img_path> <p>', 'Image-to-Code generator (React/Tailwind from mockup).');
    printCmd('g-coder listen <audio_path>', 'Voice-to-Code: Generate code by feeding an audio prompt.');
    printCmd('g-coder scout <url>', 'Autonomously browse docs to extract up-to-date context.');

    console.log(chalk.bgMagenta.black.bold('\n 🔥 ELITE OPERATIONS '));
    printCmd('g-coder ghost-server', 'Live Ghost Coder: Starts the WebSocket IPC bridge for live IDE code streaming.');
    printCmd('g-coder quantum <cmd> <commit>', 'Quantum Debugger: Autonomous Time-Travel Git Bisect regression hunter.');
    printCmd('g-coder swarm <goal>', 'Trigger multi-agent swarm (Architect -> Dev -> QA -> Security).');
    printCmd('g-coder swarm-debug <f>', 'Multi-Agent Swarm: Spawns agents to debate and mathematically fix a bug.');
    printCmd('g-coder redteam <dir>', 'Zero-Day Threat Hunter: Autonomous vulnerability scanning & patching.');
    printCmd('g-coder hologram <term>', 'Holographic Refactor: Safely run atomic, cross-file architectural rewrites.');
    printCmd('g-coder chaos <file>', 'Chaos Engine: Fuzz-tests a file to crash it, then mathematically fortifies it.');
    printCmd('g-coder fortify', 'Automatically fortify the project against known vulnerabilities.');
    printCmd('g-coder predict', 'Neural Pre-Fetch: Watches git branch and pre-generates files in shadow folder.');
    printCmd('g-coder train <src>', 'Sentient AI Academy: Autonomously reads a topic and generates synthetic datasets.');
    printCmd('g-coder matrix <name>', 'Monorepo Maestro: Mass-refactor all files dependent on a component.');

    console.log(chalk.bgBlue.black.bold('\n 🔍 ANALYSIS & SECURITY '));
    printCmd('g-coder inspect <file>', 'High-Speed Deep Data Parser: Extract secure metadata and internal structure.');
    printCmd('g-coder audit', 'Run deterministic whole-workspace security diagnostics and readiness scoring.');
    printCmd('g-coder search <query>', 'Local RAG: Fast semantic search across your entire project.');
    printCmd('g-coder doctor', 'Diagnose CLI health, credentials, Git, Docker, and state.');
    printCmd('g-coder files', 'Recursively list all files in the workspace (respects .gitignore).');
    printCmd('g-coder heal <log>', 'CI/CD Healer: Analyze a failed pipeline log and auto-fix the code.');
    printCmd('g-coder debug <file>', 'Execution Debugger: Execute script, catch crashes, and auto-fix.');
    printCmd('g-coder tests', 'Test Enforcer: Scans workspace and autonomously generates missing test suites.');

    console.log(chalk.bgGreen.black.bold('\n ⚙️ PROJECT & INFRASTRUCTURE '));
    printCmd('g-coder env --setup', 'Audit and install required runtimes and project dependencies.');
    printCmd('g-coder verify', 'Run detected lint, test, type-check, and build pipelines.');
    printCmd('g-coder deploy <target>', '1-Click Deployer: Generate Docker or Vercel configurations.');
    printCmd('g-coder morph', 'Infra Morph: Autonomously scans dependencies and generates IaC.');
    printCmd('g-coder update-docs', 'Autonomously analyze the project and update the README.md.');
    printCmd('g-coder pr <branch>', 'Push branch, auto-generate AI PR summary, and create PR via gh CLI.');
    printCmd('g-coder sync', 'IDE Live Sync: Broadcast G-Coder AI edits directly to your VS Code.');

    console.log(chalk.bgYellow.black.bold('\n 💾 DATABASE & STATE '));
    printCmd('g-coder db <schema>', 'Auto-DB Architect: Generate Prisma schema and data seeders.');
    printCmd('g-coder migrate', 'DB Auto-Migrator: Safely migrates schema and auto-heals DB errors.');
    printCmd('g-coder memory <act>', 'Local RAG Memory: Persist contextual decisions (e.g. gcode memory add "use Redis").');

    console.log(chalk.bgGray.white.bold('\n 🔧 UTILITY & CONFIG '));
    printCmd('g-coder config', 'Masked wizard to securely configure API keys globally.');
    printCmd('g-coder login', 'Securely login to capture fallback browser sessions (ChatGPT/Claude).');
    printCmd('g-coder logout', 'Wipe all local browser session cookies and fallbacks securely.');
    printCmd('g-coder offline', 'Air-Gapped Privacy Mode: Toggle local AI execution via Ollama.');
    printCmd('g-coder update', 'Check for and install the latest verified global release.');
    printCmd('g-coder help', 'Display this highly professional help menu.');
};

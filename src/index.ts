#!/usr/bin/env node

import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import { Command } from 'commander';
import dotenv from 'dotenv';
import chalk from 'chalk';
import inquirer from 'inquirer';
import ignore from 'ignore';
import { displayBanner, displayHelp, clearTerminal } from './core/ui';
import { runConfigWizard } from './core/configManager';
import { executeAiRequest, buildAiPrompt } from './core/api';
import { Planner } from './core/planner';
import { GitGuard } from './core/gitGuard';
import { ProjectCreator } from './core/creator';
import { BatchEditor } from './core/batchEditor';
import { GitManager } from './core/gitManager';
import { ModelScout } from './core/modelScout';
import { PreviewEngine } from './core/previewEngine';
import { SystemAgent } from './core/agentEngine';
import { SelfHealer } from './core/selfHealer';
import { ProjectAuditor } from './core/auditor';
import { PromptEnhancer } from './core/promptEnhancer';
import { StateManager } from './core/stateManager';
import { Updater } from './core/updater';
import { EnvironmentManager } from './core/envManager';
import { BudgetManager } from './core/budgetManager';
import { ContextCompactor, ChatMessage } from './core/contextCompactor';
import { Doctor } from './core/doctor';
import { SupplyChainScanner } from './core/supplyChainScanner';
import { VerificationPipeline } from './core/verificationPipeline';
import { PermissionProfile } from './core/policyEngine';

// 1. Load local .env (takes precedence)
dotenv.config();
// 2. Load global ~/.g-coder/.env (fallback)
dotenv.config({ path: path.join(os.homedir(), '.g-coder', '.env') });

// 3. Autonomous Model Scout (Runs async in background)
ModelScout.runScoutInBackground();

const program = new Command();
const engine = new SystemAgent();
const CLI_VERSION = (() => {
    try {
        const metadata = JSON.parse(fs.readFileSync(path.resolve(__dirname, '..', 'package.json'), 'utf8'));
        if (typeof metadata.version === 'string' && /^\d+\.\d+\.\d+(?:-[0-9A-Za-z.-]+)?$/.test(metadata.version)) return metadata.version;
    } catch {
        // The packaged CLI always includes package.json; this fallback keeps damaged installs diagnosable.
    }
    return '0.0.0';
})();

program
  .name('g-coder')
  .description('Universal Multi-Provider Autonomous AI Coding Agent CLI')
  .version(CLI_VERSION)
  .option('--update', 'Safely update the global g-coder installation');

// Override default help
program.helpInformation = () => '';
program.on('--help', () => {
    displayHelp();
});

// ==========================================
// ==========================================
// ==========================================
// CLI COMMANDS
// ==========================================

import { registerAllCommands } from './commands';

registerAllCommands(program, engine, CLI_VERSION);

const main = async (): Promise<void> => {
    if (process.argv.slice(2).some(argument => argument.toLowerCase() === '--update')) {
        await new Updater(CLI_VERSION).update();
        return;
    }
    await program.parseAsync(process.argv);
};

main().catch((error: any) => {
    console.error(chalk.red.bold(`\n❌ ${error.message}`));
    process.exitCode = 1;
});

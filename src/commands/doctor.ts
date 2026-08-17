import * as fs from 'fs';
import * as path from 'path';
import chalk from 'chalk';
import inquirer from 'inquirer';
import ignore from 'ignore';
import { Command } from 'commander';
import { displayBanner, clearTerminal } from '../core/ui';
import { runConfigWizard } from '../core/configManager';
import { executeAiRequest, buildAiPrompt } from '../core/api';
import { Planner } from '../core/planner';
import { GitGuard } from '../core/gitGuard';
import { ProjectCreator } from '../core/creator';
import { BatchEditor } from '../core/batchEditor';
import { GitManager } from '../core/gitManager';
import { PreviewEngine } from '../core/previewEngine';
import { SystemAgent } from '../core/agentEngine';
import { SelfHealer } from '../core/selfHealer';
import { ProjectAuditor } from '../core/auditor';
import { PromptEnhancer } from '../core/promptEnhancer';
import { StateManager } from '../core/stateManager';
import { Updater } from '../core/updater';
import { EnvironmentManager } from '../core/envManager';
import { BudgetManager } from '../core/budgetManager';
import { ContextCompactor, ChatMessage } from '../core/contextCompactor';
import { Doctor } from '../core/doctor';
import { SupplyChainScanner } from '../core/supplyChainScanner';
import { VerificationPipeline } from '../core/verificationPipeline';
import { PermissionProfile } from '../core/policyEngine';

export const registerdoctorCommand = (program: Command, engine: SystemAgent, CLI_VERSION: string) => {
    program.command('doctor').description('Diagnose the CLI, credentials, runtime, Git, sandbox, and session state').option('--json', 'Emit machine-readable JSON').action((options) => {
        const checks = new Doctor().run(process.cwd());
        if (options.json) { console.log(JSON.stringify({ checks }, null, 2)); return; }
        console.log(chalk.cyan.bold('\n🩺 G-Coder Doctor'));
        checks.forEach(check => console.log(`${check.status === 'pass' ? '✅' : check.status === 'warn' ? '⚠️' : '❌'} ${check.name}: ${check.detail}`));
        if (checks.some(check => check.status === 'fail')) process.exitCode = 1;
    });
};

/**
 * Project: g-coder CLI Tool
 * Author: Developer Pintu
 * License: MIT - Free to use with proper attribution.
 */
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

export const registerenvCommand = (program: Command, engine: SystemAgent, CLI_VERSION: string) => {
    // Command: Environment Audit/Setup
    program
      .command('env')
      .description('Audit runtimes and project dependencies for the current workspace')
      .option('--setup', 'Prompt to install missing runtimes and project packages')
      .action(async (options) => {
          const manager = new EnvironmentManager();
          if (options.setup) {
              await manager.ensure(process.cwd());
              return;
          }
          const report = manager.audit(process.cwd());
          console.log(chalk.cyan.bold(`\n🔎 Environment audit: ${report.detectedFiles.length} project manifests detected`));
          if (report.missingTools.length === 0 && report.pendingDependencies.length === 0) {
              console.log(chalk.green('✅ All detected prerequisites are ready.'));
              return;
          }
          report.missingTools.forEach(tool => console.log(chalk.yellow(`  Missing runtime: ${tool.displayName} (${tool.reason})`)));
          report.pendingDependencies.forEach(dependency => console.log(chalk.yellow(`  Pending packages: ${dependency.displayName}`)));
          console.log(chalk.gray('Run `g-coder env --setup` to install interactively.'));
      });
};

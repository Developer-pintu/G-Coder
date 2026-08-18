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
import { loadProjectConfig } from '../core/projectConfigManager';

export const registerbatchCommand = (program: Command, engine: SystemAgent, CLI_VERSION: string) => {
    const config = loadProjectConfig();

    // Command: Batch Edit
    program
      .command('batch')
      .description('Atomic multi-file batch editor with safe rollback')
      .argument('<prompt>', 'The editing instructions')
      .requiredOption('--files <paths...>', 'List of files to read and edit simultaneously')
      .option('-p, --provider <type>', 'Preferred provider', config.provider ?? 'gemini')
      .option('--no-heal', 'Disable the self-healing build loop', config.noHeal ?? false)
      .option('--dry-run', 'Validate the plan and actions without side effects', config.dryRun ?? false)
      .option('--non-interactive', 'Disable prompts and reject high-risk actions', config.nonInteractive ?? false)
      .option('--sandbox', 'Execute structured commands in a locked-down Docker sandbox', config.sandbox ?? false)
      .option('--permission <profile>', 'Permission profile: read-only, workspace-write, or full', config.permission ?? 'workspace-write')
      .option('--max-requests <count>', 'Maximum execution-loop AI requests', value => Number.parseInt(value, 10), config.maxRequests ?? 10)
      .option('--max-cost <usd>', 'Maximum estimated task cost in USD', value => Number.parseFloat(value), config.maxCost)
      .action(async (prompt, options) => {
          const editor = new BatchEditor();
          await editor.editBatch(prompt, options.files, options.provider, options.noHeal);
      });
};

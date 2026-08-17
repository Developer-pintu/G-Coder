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

export const registeraskCommand = (program: Command, engine: SystemAgent, CLI_VERSION: string) => {
    const config = loadProjectConfig();

    // Command: Ask
    program
      .command('ask')
      .description('Ask a question to AI without editing files')
      .argument('<prompt>', 'The prompt')
      .option('-p, --provider <type>', 'Preferred provider', config.provider ?? 'gemini')
      .action(async (prompt, options) => {
          const fullPrompt = buildAiPrompt('ask', prompt);
          const res = await executeAiRequest(fullPrompt, options.provider);
          
          console.log(chalk.cyan(`\n--- Output ---\n`));
          console.log(res || "No response.");
          console.log(chalk.cyan(`\n--------------\n`));
      });
};

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

export const registerupdate_docsCommand = (program: Command, engine: SystemAgent, CLI_VERSION: string) => {
    const config = loadProjectConfig();

    // Command: Update Docs
    program
      .command('update-docs')
      .description('Autonomously analyze the project and update the README.md with capabilities')
      .option('-p, --provider <type>', 'Preferred provider', config.provider ?? 'gemini')
      .action(async (options) => {
          console.log(chalk.cyan(`\nAnalyzing project to update README.md...\n`));
          const instruction = "Analyze this workspace and completely rewrite the README.md to document the project's purpose, structure, and capabilities as an enterprise-grade agent. Output the write file JSON action.";
          const fullPrompt = buildAiPrompt('run', instruction);
          
          const res = await executeAiRequest(fullPrompt, options.provider);
          console.log(chalk.gray(`\n${res}\n`));
          
          const actions = engine.parseActions(res);
          if (actions.length > 0) {
              await engine.executeActions(actions);
          } else {
              console.log(chalk.yellow('[Agent] No specific README.md edits were proposed.'));
          }
      });
};

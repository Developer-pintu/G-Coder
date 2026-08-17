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

export const registergitCommand = (program: Command, engine: SystemAgent, CLI_VERSION: string) => {
    // Git Command Group
    const gitCmd = program
      .command('git')
      .description('Advanced Git & Remote Branch Manager');
    
    gitCmd
      .command('cleanup')
      .description('Safely deletes all local and remote branches except main/master')
      .action(async () => {
          const manager = new GitManager();
          await manager.cleanup();
      });
    
    gitCmd
      .command('push')
      .description('Automatically generates AI commit message (if empty) and pushes to remote')
      .option('-m, --message <text>', 'Optional manual commit message')
      .option('-p, --provider <type>', 'Preferred provider for AI message generation', 'gemini')
      .action(async (options) => {
          const manager = new GitManager();
          await manager.push(options.message, options.provider);
      });
    
    gitCmd
      .command('pull')
      .description('Pulls latest changes from remote')
      .action(async () => {
          const manager = new GitManager();
          await manager.pull();
      });
    
    gitCmd
      .command('publish')
      .description('Initializes a GitHub repository using gh CLI and pushes code')
      .option('-p, --provider <type>', 'Preferred provider for AI generation', 'gemini')
      .action(async (options) => {
          const manager = new GitManager();
          await manager.publish(options.provider);
      });
};

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

export const registereditCommand = (program: Command, engine: SystemAgent, CLI_VERSION: string) => {
    // Command: Edit
    program
      .command('edit')
      .description('Autonomously read, edit, and update files in the workspace')
      .argument('<instruction>', 'Instruction on what to build or change')
      .option('-p, --provider <type>', 'Preferred provider', 'gemini')
      .action(async (instruction, options) => {
          instruction = new PromptEnhancer().enhance(instruction).enhanced;
          const fullPrompt = buildAiPrompt('edit', instruction);
          const res = await executeAiRequest(fullPrompt, options.provider);
          
          console.log(chalk.gray(`\n${res}\n`));
          
          const actions = engine.parseActions(res);
          if (actions.length > 0) {
              await engine.executeActions(actions);
          } else {
              console.log(chalk.yellow('[Agent] No specific file writes or commands were proposed by the AI.'));
          }
      });
};

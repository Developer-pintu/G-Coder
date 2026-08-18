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

export const registerfilesCommand = (program: Command, engine: SystemAgent, CLI_VERSION: string) => {
    // Command: Files
    program
      .command('files')
      .description('Recursively scan and list all files in the workspace')
      .action(() => {
          console.log(chalk.cyan(`\n--- Workspace File Scanner ---\n`));
          const cwd = process.cwd();
          const ig = ignore();
          const gitignorePath = path.join(cwd, '.gitignore');
          if (fs.existsSync(gitignorePath)) ig.add(fs.readFileSync(gitignorePath, 'utf8'));
          ig.add(['node_modules', '.git', 'dist']);
    
          const allFiles: string[] = [];
    
          const scanDir = (currentPath: string) => {
              try {
                  const entries = fs.readdirSync(currentPath, { withFileTypes: true });
                  for (const entry of entries) {
                      const relPath = path.relative(cwd, path.join(currentPath, entry.name));
                      if (!ig.ignores(relPath)) {
                          if (entry.isDirectory()) {
                              scanDir(path.join(currentPath, entry.name));
                          } else {
                              allFiles.push(relPath);
                          }
                      }
                  }
              } catch (error: any) {
                  console.error(chalk.red(`Failed to read directory ${currentPath}: ${error.message}`));
              }
          };
    
          scanDir(cwd);
    
          if (allFiles.length > 0) {
              allFiles.forEach((file, index) => {
                  console.log(chalk.gray(`${index + 1}. `) + file);
              });
              console.log(chalk.green(`\nTotal Files Found: ${allFiles.length}\n`));
          } else {
              console.log(chalk.yellow(`No files found in the workspace.\n`));
          }
      });
};

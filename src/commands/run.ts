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

export const registerrunCommand = (program: Command, engine: SystemAgent, CLI_VERSION: string) => {
    // Command: Run (Cognitive Agent)
    program
      .command('run')
      .description('Cognitive Autonomous Agent: reads context, plans, and edits code')
      .argument('[prompt]', 'The instruction prompt')
      .option('-f, --file <path>', 'File to read instructions from')
      .option('-p, --provider <type>', 'Preferred provider', 'gemini')
      .option('--no-heal', 'Disable the self-healing build loop')
      .action(async (prompt, options) => {
          let instruction = prompt || '';
          
          if (options.file) {
              const filePath = path.resolve(process.cwd(), options.file);
              if (fs.existsSync(filePath)) {
                  instruction += '\n' + fs.readFileSync(filePath, 'utf-8');
              } else {
                  console.error(chalk.red(`Instruction file not found: ${options.file}`));
                  process.exit(1);
              }
          }
    
          if (!instruction.trim()) {
              console.error(chalk.red(`You must provide a prompt or a --file containing instructions.`));
              process.exit(1);
          }
    
          const originalInstruction = instruction;
          instruction = new PromptEnhancer().enhance(instruction).enhanced;
          const stateManager = new StateManager();
          stateManager.start(originalInstruction, instruction);
    
          const planner = new Planner();
          const gitGuard = new GitGuard();
          const healer = new SelfHealer(engine);
          const permission = String(options.permission).toLowerCase() as PermissionProfile;
          if (!['read-only', 'workspace-write', 'full'].includes(permission)) throw new Error(`Invalid permission profile: ${options.permission}`);
          const budget = new BudgetManager({ maxRequests: options.maxRequests, maxCostUsd: options.maxCost });
          let executionSuccess = true;
    
          try {
              // 1. Planner Phase
              const isPlanApproved = await planner.createAndConfirmPlan(instruction, options.provider);
              if (!isPlanApproved) {
                  stateManager.fail('Execution plan was rejected by the user.');
                  process.exit(0);
              }
    
              const environment = new EnvironmentManager();
              await environment.ensure(process.cwd());
    
              // 2. Git Checkpoint Phase
              gitGuard.checkpoint();
    
              // 3. Execution Phase
              console.log(chalk.magenta.bold(`\n⚙️ Executing Approved Plan...`));
              const mentionedFilesContext = engine.readMentionedFiles(instruction);
              let executionHistory = '';
              let loopCount = 0;
              const MAX_LOOPS = 10;
    
              while (loopCount < MAX_LOOPS) {
                  loopCount++;
                  console.log(chalk.gray(`\n[Agent Loop ${loopCount}/${MAX_LOOPS}] Thinking...`));
                  
                  const historyContext = executionHistory 
                      ? `\n\n--- PREVIOUS EXECUTION OUTPUTS ---\n${executionHistory}\n--- END PREVIOUS OUTPUTS ---\n\n` 
                      : '';
                  const fullPrompt = buildAiPrompt('run', instruction + '\n\n' + mentionedFilesContext + historyContext);
                  budget.consume();
                  const res = await executeAiRequest(fullPrompt, options.provider);
                  console.log(chalk.gray(`\n${res}\n`));
                  
                  const actions = engine.parseActions(res);
                  
                  if (actions.length > 0) {
                      const hasDone = actions.some(a => a.type === 'done');
                      
                      try {
                          const result = await engine.executeActions(actions, (action, index) => {
                              const generatedFile = action.type === 'write' || action.type === 'patch' ? action.path : undefined;
                              const target = action.path || action.command || '';
                              stateManager.recordStep(`${loopCount}.${index + 1}`, `${action.type}${target ? ` ${target}` : ''}`, generatedFile);
                          }, { dryRun: options.dryRun, nonInteractive: options.nonInteractive, permission, sandbox: options.sandbox });
                          if (result.success && result.output) {
                              executionHistory += result.output;
                          }
                          if (!result.success) {
                              executionSuccess = false;
                              break;
                          }
                      } catch (e: any) {
                          console.log(chalk.red(`Execution Error: ${e.message}`));
                          executionSuccess = false;
                          break;
                      }
    
                      if (hasDone) {
                          console.log(chalk.green(`\n✔ Task explicitly marked as DONE by Agent.`));
                          break;
                      }
                  } else {
                      console.log(chalk.yellow('[Agent] No specific file writes or commands were proposed by the AI. Ending loop.'));
                      break;
                  }
              }
    
              if (loopCount >= MAX_LOOPS) {
                  console.log(chalk.yellow(`\n⚠️ Maximum Agent iterations (${MAX_LOOPS}) reached.`));
              }
    
              // 4. Self-Healing Verification Phase
              if (executionSuccess && !options.noHeal) {
                  // If the project has a package.json, we run build
                  const hasPackageJson = fs.existsSync(path.join(process.cwd(), 'package.json'));
                  if (hasPackageJson) {
                     const buildPassed = await healer.verifyAndHeal(options.provider);
                     if (!buildPassed) {
                         executionSuccess = false;
                     }
                  }
              }
          } catch (err: any) {
              console.log(chalk.red(`\n❌ Task failed: ${err.message}`));
              executionSuccess = false;
          }
    
    
          // 5. Cleanup or Rollback
          if (executionSuccess) {
              stateManager.complete();
              gitGuard.cleanup();
              console.log(chalk.green.bold(`\n✅ Autonomous task completed successfully!`));
          } else {
              stateManager.fail('Autonomous execution failed or was rejected.');
              console.log(chalk.red.bold(`\n❌ Task failed.`));
              gitGuard.rollback();
          }
      });
};

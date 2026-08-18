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

export const registerchatCommand = (program: Command, engine: SystemAgent, CLI_VERSION: string) => {
    const config = loadProjectConfig();

    // Command: Chat (Interactive Repl)
    program
      .command('chat')
      .description('Start an interactive, continuous chat session with conversational memory')
      .option('-p, --provider <type>', 'Preferred provider', config.provider ?? 'gemini')
      .action(async (options) => {
          displayBanner();
          console.log(chalk.magenta.bold(`=== G-CODER INTERACTIVE CHAT ===`));
          console.log(chalk.gray(`Type 'exit' or 'quit' to end the session.\n`));
          
          let chatHistory: ChatMessage[] = [];
          const contextCompactor = new ContextCompactor();
          
          // Inject system context into the first message
          let systemContext = engine.scanWorkspace();
          const baseInstruction = `You are an elite Autonomous AI Coding Agent with SYSTEM-LEVEL access.\nYou can read, write, move, and delete files on any drive. Output a JSON block wrapped in \`\`\`json ... \`\`\` for actions.\nSystem Context:\n${systemContext}`;
          chatHistory.push({ role: 'user', content: baseInstruction });
          chatHistory.push({ role: 'assistant', content: 'Understood. I am ready.' });
    
          const askQuestion = async () => {
              const { prompt } = await inquirer.prompt([{
                  type: 'input',
                  name: 'prompt',
                  message: chalk.cyan('You:')
              }]);
    
              if (prompt.toLowerCase() === 'exit' || prompt.toLowerCase() === 'quit') {
                  console.log(chalk.green('Goodbye!'));
                  return;
              }
    
              if (!prompt.trim()) {
                  await askQuestion();
                  return;
              }
    
              // Provide mentioned files context for just this turn if applicable
              const mentionedFilesContext = engine.readMentionedFiles(prompt);
              const fullPrompt = mentionedFilesContext ? `${mentionedFilesContext}\n${prompt}` : prompt;
    
              chatHistory.push({ role: 'user', content: fullPrompt });
              
              chatHistory = contextCompactor.compact(chatHistory);
              const res = await executeAiRequest(chatHistory, options.provider);
              
              console.log(chalk.green(`\nAgent:\n`) + chalk.white(res) + `\n`);
              
              chatHistory.push({ role: 'assistant', content: res });
              
              const actions = engine.parseActions(res);
              if (actions.length > 0) {
                  await engine.executeActions(actions);
              }
    
              await askQuestion();
          };
    
          await askQuestion();
      });
};

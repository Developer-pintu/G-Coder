#!/usr/bin/env node

import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import { Command } from 'commander';
import dotenv from 'dotenv';
import axios from 'axios';
import ora from 'ora';
import chalk from 'chalk';
import inquirer from 'inquirer';
import ignore from 'ignore';
import { displayBanner, displayHelp } from './core/ui';
import { runConfigWizard } from './core/configManager';
import { executeAiRequest, buildAiPrompt } from './core/api';
import { Planner } from './core/planner';
import { GitGuard } from './core/gitGuard';
import { ProjectCreator } from './core/creator';
import { BatchEditor } from './core/batchEditor';
import { GitManager } from './core/gitManager';
import { ModelScout } from './core/modelScout';
import { PreviewEngine } from './core/previewEngine';
import { SystemAgent } from './core/agentEngine';
import { SelfHealer } from './core/selfHealer';

// 1. Load local .env (takes precedence)
dotenv.config();
// 2. Load global ~/.g-coder/.env (fallback)
dotenv.config({ path: path.join(os.homedir(), '.g-coder', '.env') });

// 3. Autonomous Model Scout (Runs async in background)
ModelScout.runScoutInBackground();

const program = new Command();
const engine = new SystemAgent();

program
  .name('g-coder')
  .description('Universal Multi-Provider Autonomous AI Coding Agent CLI')
  .version('3.0.0');

// Override default help
program.helpInformation = () => '';
program.on('--help', () => {
    displayHelp();
});

// ==========================================
// ==========================================
// CLI COMMANDS
// ==========================================
// Command: Create (Zero-Knowledge Project Generator)
program
  .command('create')
  .description('Zero-knowledge project generator. Build an entire app from a prompt.')
  .argument('<prompt>', 'Natural language prompt describing the app')
  .option('-p, --provider <type>', 'Preferred provider', 'gemini')
  .action(async (prompt, options) => {
      const creator = new ProjectCreator();
      await creator.createProject(prompt, options.provider);
  });

// Command: Batch Edit
program
  .command('batch')
  .description('Atomic multi-file batch editor with safe rollback')
  .argument('<prompt>', 'The editing instructions')
  .requiredOption('--files <paths...>', 'List of files to read and edit simultaneously')
  .option('-p, --provider <type>', 'Preferred provider', 'gemini')
  .option('--no-heal', 'Disable the self-healing build loop')
  .action(async (prompt, options) => {
      const editor = new BatchEditor();
      await editor.editBatch(prompt, options.files, options.provider, options.noHeal);
  });

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
  .action(async () => {
      const manager = new GitManager();
      await manager.publish();
  });

// Command: Preview
program
  .command('preview')
  .description('Launch headless browser and capture screenshot of a URL or local directory')
  .argument('<target>', 'URL or path to local directory')
  .action(async (target) => {
      const preview = new PreviewEngine();
      await preview.capturePreview(target);
  });

// Command: Ask
program
  .command('ask')
  .description('Ask a question to AI without editing files')
  .argument('<prompt>', 'The prompt')
  .option('-p, --provider <type>', 'Preferred provider', 'gemini')
  .action(async (prompt, options) => {
      const fullPrompt = buildAiPrompt('ask', prompt);
      const res = await executeAiRequest(fullPrompt, options.provider);
      
      console.log(chalk.cyan(`\n--- Output ---\n`));
      console.log(res || "No response.");
      console.log(chalk.cyan(`\n--------------\n`));
  });

// Command: Edit
program
  .command('edit')
  .description('Autonomously read, edit, and update files in the workspace')
  .argument('<instruction>', 'Instruction on what to build or change')
  .option('-p, --provider <type>', 'Preferred provider', 'gemini')
  .action(async (instruction, options) => {
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

// Command: Audit
program
  .command('audit')
  .description('Advanced code auditing: analyzes the workspace for issues, leaks, and readiness')
  .action(() => {
      console.log(chalk.magenta.bold(`\n=== G-CODER ADVANCED AUDIT ===\n`));
      const cwd = process.cwd();
      const ig = ignore();
      const gitignorePath = path.join(cwd, '.gitignore');
      if (fs.existsSync(gitignorePath)) ig.add(fs.readFileSync(gitignorePath, 'utf8'));
      ig.add(['node_modules', '.git', 'dist', 'build', '.next', 'coverage']);

      let totalFiles = 0;
      let consoleLogs = 0;
      let missingTryCatch = 0;
      let hardcodedSecrets = 0;
      let todos = 0;
      let hasPackageJson = false;
      let hasTsConfig = false;
      let hasReadme = false;
      let hasEnv = false;

      const warnings: string[] = [];
      const vulnerabilities: string[] = [];

      const scanFile = (filePath: string, relativePath: string) => {
          try {
              const content = fs.readFileSync(filePath, 'utf-8');
              
              // Basic heuristic analysis
              if (content.includes('console.log(')) consoleLogs++;
              if (content.includes('TODO:') || content.includes('FIXME:')) todos++;
              
              const secretRegex = /(password|api_key|secret|token)\s*[:=]\s*['"][^'"]+['"]/i;
              if (secretRegex.test(content) && !relativePath.includes('.env')) {
                  hardcodedSecrets++;
                  vulnerabilities.push(`Hardcoded secret/token pattern detected in ${relativePath}`);
              }
              
              if ((filePath.endsWith('.ts') || filePath.endsWith('.js')) && content.includes('await ') && !content.includes('try {') && !content.includes('.catch(')) {
                  missingTryCatch++;
                  warnings.push(`Missing error handling (try/catch or .catch) for async operations in ${relativePath}`);
              }

              // Check core files
              if (relativePath === 'package.json') hasPackageJson = true;
              if (relativePath === 'tsconfig.json') hasTsConfig = true;
              if (relativePath.toLowerCase() === 'readme.md') hasReadme = true;
              if (relativePath === '.env' || relativePath === '.env.example') hasEnv = true;

          } catch (e: any) {
             // skip binary or unreadable files
          }
      };

      const scanDir = (currentPath: string) => {
          try {
              const entries = fs.readdirSync(currentPath, { withFileTypes: true });
              for (const entry of entries) {
                  const relPath = path.relative(cwd, path.join(currentPath, entry.name));
                  if (!ig.ignores(relPath)) {
                      if (entry.isDirectory()) {
                          scanDir(path.join(currentPath, entry.name));
                      } else {
                          totalFiles++;
                          scanFile(path.join(currentPath, entry.name), relPath);
                      }
                  }
              }
          } catch (error: any) {
              console.error(chalk.red(`Failed to read directory ${currentPath}: ${error.message}`));
          }
      };

      const spinner = ora('Scanning workspace for vulnerabilities and issues...').start();
      scanDir(cwd);
      spinner.stop();

      // Calculate Readiness Score
      let score = 100;
      if (!hasPackageJson) score -= 20;
      if (!hasTsConfig) score -= 5;
      if (!hasReadme) score -= 5;
      if (!hasEnv) score -= 5;
      
      score -= (consoleLogs * 1);
      score -= (missingTryCatch * 2);
      score -= (hardcodedSecrets * 20);
      score -= (todos * 1);

      if (score < 0) score = 0;
      if (score > 100) score = 100;

      // Output Results
      console.log(chalk.cyan.bold(`📁 Total Files Scanned: `) + chalk.white(`${totalFiles}`));
      
      console.log(chalk.yellow.bold(`\n⚠️  Potential Gaps & Warnings:`));
      if (warnings.length > 0) {
          warnings.slice(0, 5).forEach(w => console.log(chalk.yellow(`  - ${w}`)));
          if (warnings.length > 5) console.log(chalk.yellow(`  - ...and ${warnings.length - 5} more warnings.`));
      } else {
          console.log(chalk.gray(`  - None detected.`));
      }
      
      if (consoleLogs > 0) console.log(chalk.yellow(`  - Found ${consoleLogs} console.log() statements.`));
      if (todos > 0) console.log(chalk.yellow(`  - Found ${todos} TODOs/FIXMEs.`));

      console.log(chalk.red.bold(`\n🔴 Errors / Vulnerabilities / Leaks Found:`));
      if (vulnerabilities.length > 0) {
          vulnerabilities.forEach(v => console.log(chalk.red(`  - ${v}`)));
      } else {
          console.log(chalk.green(`  - Clean! No obvious leaks found.`));
      }

      console.log(chalk.magenta.bold(`\n📊 Estimated Application Readiness: `) + (score >= 80 ? chalk.green(`${score}% Ready`) : chalk.red(`${score}% Ready`)));

      console.log(chalk.cyan.bold(`\n💡 Recommendations:`));
      if (!hasReadme) console.log(chalk.white(`  - Add a README.md file to document the project.`));
      if (!hasEnv) console.log(chalk.white(`  - Ensure you have a .env.example file for environment variables.`));
      if (consoleLogs > 0) console.log(chalk.white(`  - Consider replacing console.log() with a proper logging library (e.g., Winston/Pino).`));
      if (missingTryCatch > 0) console.log(chalk.white(`  - Add proper try/catch blocks around asynchronous calls.`));
      if (hardcodedSecrets > 0) console.log(chalk.white(`  - URGENT: Remove hardcoded secrets and use environment variables instead.`));
      if (score === 100) console.log(chalk.white(`  - Great job! The project looks very clean.`));

      console.log('\n');
  });

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

      const planner = new Planner();
      const gitGuard = new GitGuard();
      const healer = new SelfHealer(engine);

      // 1. Planner Phase
      const isPlanApproved = await planner.createAndConfirmPlan(instruction, options.provider);
      if (!isPlanApproved) {
          process.exit(0);
      }

      // 2. Git Checkpoint Phase
      gitGuard.checkpoint();

      // 3. Execution Phase
      console.log(chalk.magenta.bold(`\n⚙️ Executing Approved Plan...`));
      const mentionedFilesContext = engine.readMentionedFiles(instruction);
      const fullPrompt = buildAiPrompt('run', instruction + '\n\n' + mentionedFilesContext);
      
      const res = await executeAiRequest(fullPrompt, options.provider);
      console.log(chalk.gray(`\n${res}\n`));
      
      const actions = engine.parseActions(res);
      let executionSuccess = true;
      
      if (actions.length > 0) {
          try {
              await engine.executeActions(actions);
          } catch (e: any) {
              console.log(chalk.red(`Execution Error: ${e.message}`));
              executionSuccess = false;
          }
      } else {
          console.log(chalk.yellow('[Agent] No specific file writes or commands were proposed by the AI.'));
      }

      // 4. Self-Healing Verification Phase
      if (executionSuccess && !options.noHeal) {
          // If the project has a package.json, we run build
          const hasPackageJson = fs.existsSync(path.join(process.cwd(), 'package.json'));
          if (hasPackageJson) {
             const buildPassed = await healer.verifyAndHeal(options.provider, 'npm run build');
             if (!buildPassed) {
                 executionSuccess = false;
             }
          }
      }

      // 5. Cleanup or Rollback
      if (executionSuccess) {
          gitGuard.cleanup();
          console.log(chalk.green.bold(`\n✅ Autonomous task completed successfully!`));
      } else {
          console.log(chalk.red.bold(`\n❌ Task failed.`));
          gitGuard.rollback();
      }
  });

// Command: Update Docs
program
  .command('update-docs')
  .description('Autonomously analyze the project and update the README.md with capabilities')
  .option('-p, --provider <type>', 'Preferred provider', 'gemini')
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

// Command: Config Wizard
program
  .command('config')
  .description('Interactive wizard to securely configure API keys globally')
  .action(async () => {
      await runConfigWizard();
  });

// Command: Chat (Interactive Repl)
program
  .command('chat')
  .description('Start an interactive, continuous chat session with conversational memory')
  .option('-p, --provider <type>', 'Preferred provider', 'gemini')
  .action(async (options) => {
      displayBanner();
      console.log(chalk.magenta.bold(`=== G-CODER INTERACTIVE CHAT ===`));
      console.log(chalk.gray(`Type 'exit' or 'quit' to end the session.\n`));
      
      let chatHistory: any[] = [];
      
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

program.parse(process.argv);
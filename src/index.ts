#!/usr/bin/env node

import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import { Command } from 'commander';
import dotenv from 'dotenv';
import chalk from 'chalk';
import inquirer from 'inquirer';
import ignore from 'ignore';
import { displayBanner, displayHelp, clearTerminal } from './core/ui';
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
import { ProjectAuditor } from './core/auditor';
import { PromptEnhancer } from './core/promptEnhancer';
import { StateManager } from './core/stateManager';
import { Updater } from './core/updater';
import { EnvironmentManager } from './core/envManager';

// 1. Load local .env (takes precedence)
dotenv.config();
// 2. Load global ~/.g-coder/.env (fallback)
dotenv.config({ path: path.join(os.homedir(), '.g-coder', '.env') });

// 3. Autonomous Model Scout (Runs async in background)
ModelScout.runScoutInBackground();

const program = new Command();
const engine = new SystemAgent();
const CLI_VERSION = (() => {
    try {
        const metadata = JSON.parse(fs.readFileSync(path.resolve(__dirname, '..', 'package.json'), 'utf8'));
        if (typeof metadata.version === 'string' && /^\d+\.\d+\.\d+(?:-[0-9A-Za-z.-]+)?$/.test(metadata.version)) return metadata.version;
    } catch {
        // The packaged CLI always includes package.json; this fallback keeps damaged installs diagnosable.
    }
    return '0.0.0';
})();

program
  .name('g-coder')
  .description('Universal Multi-Provider Autonomous AI Coding Agent CLI')
  .version(CLI_VERSION)
  .option('--update', 'Safely update the global g-coder installation');

// Override default help
program.helpInformation = () => '';
program.on('--help', () => {
    displayHelp();
});

// ==========================================
// ==========================================
// ==========================================
// CLI COMMANDS
// ==========================================

// Command: Clear Terminal
program
  .command('clear')
  .alias('cls')
  .description('Clears the terminal screen and scrollback buffer for a clean workspace')
  .action(() => {
      clearTerminal();
  });

// Command: Update CLI
program
  .command('update')
  .description('Check for and safely install the latest global g-coder release')
  .option('--check', 'Only check whether an update is available')
  .option('--force', 'Reinstall the latest verified release')
  .action(async (options) => {
      await new Updater(CLI_VERSION).update({ checkOnly: options.check, force: options.force });
  });

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
  .option('-p, --provider <type>', 'Preferred provider for AI generation', 'gemini')
  .action(async (options) => {
      const manager = new GitManager();
      await manager.publish(options.provider);
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
  .description('Run deterministic workspace diagnostics and guarded, build-verified fixes')
  .option('-p, --provider <type>', 'Provider used only when generating fixes', 'gemini')
  .option('-f, --fix', 'Generate minimal patches and roll them back if the build fails')
  .action(async (options) => {
      const auditor = new ProjectAuditor();
      await auditor.runAudit(options.provider, { fix: options.fix });
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

      const originalInstruction = instruction;
      instruction = new PromptEnhancer().enhance(instruction).enhanced;
      const stateManager = new StateManager();
      stateManager.start(originalInstruction, instruction);

      const planner = new Planner();
      const gitGuard = new GitGuard();
      const healer = new SelfHealer(engine);
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
                      });
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
                 const buildPassed = await healer.verifyAndHeal(options.provider, 'npm run build');
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
  .option('--set <provider>', 'Securely set or replace API keys for one provider')
  .action(async (options) => {
      await runConfigWizard(options.set);
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

const main = async (): Promise<void> => {
    if (process.argv.slice(2).some(argument => argument.toLowerCase() === '--update')) {
        await new Updater(CLI_VERSION).update();
        return;
    }
    await program.parseAsync(process.argv);
};

main().catch((error: any) => {
    console.error(chalk.red.bold(`\n❌ ${error.message}`));
    process.exitCode = 1;
});

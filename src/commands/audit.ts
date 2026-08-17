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

export const registerauditCommand = (program: Command, engine: SystemAgent, CLI_VERSION: string) => {
    const config = loadProjectConfig();

    // Command: Audit
    program
      .command('audit')
      .description('Run deterministic workspace diagnostics and guarded, build-verified fixes')
      .option('-p, --provider <type>', 'Provider used only when generating fixes', config.provider ?? 'gemini')
      .option('-f, --fix', 'Generate minimal patches and roll them back if the build fails')
      .action(async (options) => {
          const auditor = new ProjectAuditor();
          await auditor.runAudit(options.provider, { fix: options.fix });
      });
};

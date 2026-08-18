/**
 * Project: g-coder CLI Tool
 * Author: Developer Pintu
 * License: MIT - Free to use with proper attribution.
 */
import * as fse from 'fs-extra';
import * as path from 'path';
import * as os from 'os';
import inquirer from 'inquirer';
import chalk from 'chalk';
import ora from 'ora';
import { confirmAction } from './utils';
import { readSecureInput } from './secureInput';

const CONFIG_DIR = path.join(os.homedir(), '.g-coder');
const CONFIG_FILE = path.join(CONFIG_DIR, '.env');

const PROVIDERS = [
    { name: 'Google Gemini', key: 'GEMINI_API_KEYS' },
    { name: 'Anthropic (Claude)', key: 'ANTHROPIC_API_KEYS' },
    { name: 'OpenAI', key: 'OPENAI_API_KEYS' },
    { name: 'Groq', key: 'GROQ_API_KEYS' },
    { name: 'OpenRouter', key: 'OPENROUTER_API_KEYS' },
    { name: 'DeepSeek', key: 'DEEPSEEK_API_KEYS' }
];

const writeConfiguration = (envContent: string): void => {
    fse.ensureDirSync(CONFIG_DIR, 0o700);
    fse.outputFileSync(CONFIG_FILE, envContent.trim() + '\n', { mode: 0o600 });
    try { fse.chmodSync(CONFIG_FILE, 0o600); } catch { /* best effort on Windows */ }
};

const setProviderKeys = async (providerQuery: string): Promise<void> => {
    const normalized = providerQuery.toLowerCase().replace(/[^a-z]/g, '');
    const provider = PROVIDERS.find(item =>
        item.name.toLowerCase().replace(/[^a-z]/g, '').includes(normalized) ||
        item.key.toLowerCase().startsWith(normalized)
    );
    if (!provider) {
        throw new Error(`Unknown provider "${providerQuery}". Supported providers: ${PROVIDERS.map(item => item.name).join(', ')}`);
    }
    const keys = await readSecureInput(`Enter ${provider.name} API Keys (comma-separated for failover):`);
    const values = keys.split(',').map(value => value.trim()).filter(Boolean);
    if (values.length === 0) throw new Error('At least one API key is required.');

    const existing = fse.existsSync(CONFIG_FILE) ? fse.readFileSync(CONFIG_FILE, 'utf8') : '';
    const line = `${provider.key}=${values.join(',')}`;
    const matcher = new RegExp(`^${provider.key}=.*$`, 'm');
    const updated = matcher.test(existing) ? existing.replace(matcher, line) : `${existing.trim()}${existing.trim() ? '\n' : ''}${line}`;
    writeConfiguration(updated);
    console.log(chalk.green(`✔ ${provider.name} credentials saved securely to ${CONFIG_FILE}`));
};

export const runConfigWizard = async (setProvider?: string) => {
    console.log(chalk.cyan.bold('\n=== G-CODER SECURE CONFIGURATION WIZARD ==='));
    console.log(chalk.gray(`Your API keys will be securely saved globally at: ${CONFIG_FILE}`));
    console.log(chalk.gray(`This prevents accidental Git leaks from local project folders.\n`));

    if (setProvider) {
        await setProviderKeys(setProvider);
        return;
    }

    const { configMode } = await inquirer.prompt([{
        type: 'list',
        name: 'configMode',
        message: 'How would you like to configure your API keys?',
        choices: [
            { name: 'Interactive Setup (Enter keys manually)', value: 'interactive' },
            { name: 'Import from a File', value: 'import' },
            { name: 'Cancel', value: 'cancel' }
        ]
    }]);

    if (configMode === 'cancel') {
        console.log(chalk.yellow('Configuration cancelled.'));
        return;
    }

    let envContent = '';

    if (configMode === 'interactive') {
        console.log(chalk.yellow('\n(Press Enter to skip a provider if you do not have its key)'));
        for (const provider of PROVIDERS) {
            const keys = await readSecureInput(`Enter ${provider.name} API Keys (comma-separated for failover):`, { allowEmpty: true });

            if (keys.trim().length > 0) {
                envContent += `${provider.key}=${keys.trim()}\n`;
            }
        }
    } else if (configMode === 'import') {
        const { filePath } = await inquirer.prompt([{
            type: 'input',
            name: 'filePath',
            message: 'Enter the absolute path to your keys file (e.g., C:/keys.txt):'
        }]);

        try {
            const resolvedPath = path.resolve(process.cwd(), filePath.trim());
            if (fse.existsSync(resolvedPath)) {
                envContent = fse.readFileSync(resolvedPath, 'utf8');
                console.log(chalk.green(`✔ Read ${envContent.length} bytes from file.`));
            } else {
                console.log(chalk.red(`✖ File not found: ${resolvedPath}`));
                return;
            }
        } catch (e: any) {
            console.log(chalk.red(`✖ Failed to read file: ${e.message}`));
            return;
        }
    }

    if (envContent.trim().length === 0) {
        console.log(chalk.yellow('\nNo API keys provided. Configuration aborted.'));
        return;
    }

    const isConfirmed = await confirmAction(chalk.cyan('Do you want to save this configuration?'));
    if (!isConfirmed) {
        console.log(chalk.yellow('Configuration cancelled.'));
        return;
    }

    const spinner = ora('Saving configuration securely...').start();
    try {
        writeConfiguration(envContent);
        spinner.succeed(`Configuration saved securely to ${CONFIG_FILE}`);
        console.log(chalk.green.bold('\n✔ G-Coder is ready to use!'));
        console.log(chalk.gray(`If you previously created a local .env file in your projects, it is highly recommended to add '.env' to your .gitignore to prevent leaks.`));
    } catch (e: any) {
        spinner.fail(`Failed to save configuration: ${e.message}`);
    }
    console.log('\n');
};

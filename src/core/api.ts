import axios from 'axios';
import ora from 'ora';
import chalk from 'chalk';
import { UniversalKeyRotator } from './rotator';
import { SystemAgent } from './agentEngine';

const engine = new SystemAgent();

export interface ProviderConfig {
    url: (key: string) => string;
    headers: (key: string) => any;
    payload: (messages: any[], key?: string) => any;
    parse: (data: any) => string;
}

const MAX_KEYS = 3;
let lastApiCallTime = 0;
const GLOBAL_THROTTLE_MS = 2500; // 2.5 seconds minimum between API calls

const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

export const getProviderConfig = (provider: string): ProviderConfig => {
    switch (provider) {
        case 'gemini':
            const geminiModel = process.env.GEMINI_MODEL || 'gemini-flash-latest';
            return {
                url: (key) => `https://generativelanguage.googleapis.com/v1beta/models/${geminiModel}:generateContent?key=${key}`,
                headers: () => ({ 'Content-Type': 'application/json' }),
                payload: (messages) => ({
                    contents: messages.map(m => ({
                        role: m.role === 'assistant' ? 'model' : 'user',
                        parts: [{ text: m.content }]
                    }))
                }),
                parse: (data) => data?.candidates?.[0]?.content?.parts?.[0]?.text
            };
        case 'anthropic':
            const anthropicModel = process.env.ANTHROPIC_MODEL || 'claude-3-5-sonnet-20240620';
            return {
                url: () => `https://api.anthropic.com/v1/messages`,
                headers: (key) => ({ 'Content-Type': 'application/json', 'x-api-key': key, 'anthropic-version': '2023-06-01' }),
                payload: (messages) => ({ model: anthropicModel, max_tokens: 4096, messages }),
                parse: (data) => data?.content?.[0]?.text
            };
        case 'deepseek':
            const deepseekModel = process.env.DEEPSEEK_MODEL || 'deepseek-coder';
            return {
                url: () => `https://api.deepseek.com/chat/completions`,
                headers: (key) => ({ 'Content-Type': 'application/json', 'Authorization': `Bearer ${key}` }),
                payload: (messages) => ({ model: deepseekModel, messages }),
                parse: (data) => data?.choices?.[0]?.message?.content
            };
        case 'openai':
            const openaiModel = process.env.OPENAI_MODEL || 'gpt-4o';
            return {
                url: () => `https://api.openai.com/v1/chat/completions`,
                headers: (key) => ({ 'Content-Type': 'application/json', 'Authorization': `Bearer ${key}` }),
                payload: (messages) => ({ model: openaiModel, messages }),
                parse: (data) => data?.choices?.[0]?.message?.content
            };
        case 'groq':
            const groqModel = process.env.GROQ_MODEL || 'llama3-8b-8192';
            return {
                url: () => `https://api.groq.com/openai/v1/chat/completions`,
                headers: (key) => ({ 'Content-Type': 'application/json', 'Authorization': `Bearer ${key}` }),
                payload: (messages) => ({ model: groqModel, messages }),
                parse: (data) => data?.choices?.[0]?.message?.content
            };
        case 'openrouter':
            return {
                url: () => `https://openrouter.ai/api/v1/chat/completions`,
                headers: (key) => ({ 'Content-Type': 'application/json', 'Authorization': `Bearer ${key}`, 'HTTP-Referer': 'https://g-coder.local', 'X-Title': 'g-coder' }),
                payload: (messages) => ({ model: "mistralai/mistral-7b-instruct:free", messages }),
                parse: (data) => data?.choices?.[0]?.message?.content
            };
        default:
            return {
                url: () => `https://api.${provider}.com/v1/chat/completions`,
                headers: (key) => ({ 'Content-Type': 'application/json', 'Authorization': `Bearer ${key}` }),
                payload: (messages) => ({ model: "default", messages }),
                parse: (data) => data?.choices?.[0]?.message?.content
            };
    }
};

export const buildAiPrompt = (mode: string, input: string): string => {
    let systemContext = engine.scanWorkspace();
    let instruction = '';

    if (mode === 'edit' || mode === 'config' || mode === 'run' || mode === 'plan') {
        instruction = `You are an elite Autonomous AI Coding Agent (Principal Software Engineer & System Architect) with SYSTEM-LEVEL ACCESS.\n` +
                      `Your mission is to execute complex, multi-file development and bug-fixing tasks with ABSOLUTE PERFECTION, ZERO ERRORS, and PERSISTENT MEMORY.\n\n` +
                      `OPERATIONAL RULES:\n` +
                      `1. Persistent Task & Bug Memory: Track and fix all requested bugs/features without dropping any context.\n` +
                      `2. Multi-File Concurrent Operations: Read, modify, write multiple files atomically. No partial updates.\n` +
                      `3. Strict Self-Healing & Zero-Error Policy: Detect errors, fix your own code, and output 100% executable files.\n` +
                      `4. Complete & Production-Ready Output: NEVER use placeholders like '// TODO' or '// rest of code here'. Provide the full, complete code.\n` +
                      `5. Final Verification Report: Provide a summary at the end of your response including: Files Modified, Bugs Fixed, Build Status.\n\n` +
                      `Your task is: ${input}\n\n` +
                      `You can read, write, move, delete files anywhere on the system (C:/, D:/, etc) and run safe shell commands.\n` +
                      `To perform actions, you MUST output a JSON block wrapped exactly in \`\`\`json ... \`\`\`.\n` +
                      `JSON Format Schema Example:\n` +
                      `\`\`\`json\n` +
                      `{\n` +
                      `  "actions": [\n` +
                      `    { "type": "read", "path": "C:/config.json" },\n` +
                      `    { "type": "write", "path": "D:/projects/app/src/index.ts", "content": "console.log('Hello');" },\n` +
                      `    { "type": "patch", "path": "src/utils.ts", "patchBlock": "<<SEARCH>>\\nold code\\n<<REPLACE>>\\nnew code\\n<<END>>" },\n` +
                      `    { "type": "run", "command": "npm run build" }\n` +
                      `  ]\n` +
                      `}\n` +
                      `\`\`\`\n` +
                      `Provide absolute or relative paths. Use precise 'patch' actions instead of full 'write' overwrites whenever possible to save tokens.`;
    } else {
        instruction = `You are an elite AI coding assistant. Answer the user's prompt: ${input}`;
    }

    return `System Context:\n${systemContext}\n\n${instruction}`;
};

export const executeAiRequest = async (promptOrMessages: string | any[], providerOpt: string): Promise<string> => {
    const rotator = new UniversalKeyRotator(providerOpt);
    
    let success = false;
    let responseText = "";
    const spinner = ora('Agent is thinking...').start();

    const messages = typeof promptOrMessages === 'string' ? [{ role: 'user', content: promptOrMessages }] : promptOrMessages;

    let keyRetryCount = 0;
    const MAX_KEY_RETRIES = 3;

    while (!success) {
        const activeProvider = rotator.getActiveProvider();
        const activeKey = rotator.getActiveKey();
        const config = getProviderConfig(activeProvider);
        
        spinner.text = `Contacting ${activeProvider.toUpperCase()} API...`;

        try {
            // Strict Request Throttling
            const now = Date.now();
            const timeSinceLastCall = now - lastApiCallTime;
            if (timeSinceLastCall < GLOBAL_THROTTLE_MS) {
                const waitTime = GLOBAL_THROTTLE_MS - timeSinceLastCall;
                await sleep(waitTime);
            }

            const url = config.url(activeKey);
            const headers = config.headers(activeKey);
            const payload = config.payload(messages, activeKey);

            const response = await axios.post(url, payload, { headers });
            lastApiCallTime = Date.now();
            
            responseText = config.parse(response.data);

            if (!responseText) {
                throw new Error("Parsed response was empty or malformed.");
            }

            spinner.succeed(`Agent formulated a response via ${activeProvider.toUpperCase()}`);
            success = true;

        } catch (error: any) {
            const status = error.response?.status;
            
            if (status === 429 || status === 404 || status === 403 || status === 401 || status === 503 || !status) {
                spinner.fail(`Failed with ${activeProvider.toUpperCase()} (Status: ${status || 'Network Error'}).`);
                let reason = "API Key Error";
                if (status === 429) reason = "Rate Limit Exceeded";
                else if (status === 503) reason = "Server Outage / Overloaded";
                else if (status === 404) reason = "Model Not Found";

                if (status === 429 || status === 503) {
                    keyRetryCount++;
                    if (keyRetryCount <= MAX_KEY_RETRIES) {
                        // Exponential backoff: 5s, then 10s, then 15s...
                        const delayMs = keyRetryCount * 5000;
                        console.log(chalk.yellow(`\n[API Limits] ${reason}. Waiting ${delayMs/1000}s before retrying...`));
                        await sleep(delayMs);
                        spinner.start(`Retrying (Attempt ${keyRetryCount}/${MAX_KEY_RETRIES})...`);
                        continue;
                    }
                }

                console.log(chalk.yellow(`\n[Failover] ${reason}. Switched to Next Key (Index: ${(rotator as any).currentKeyIndex + 1}) for Provider: ${activeProvider.toUpperCase()}  `));
                const rotated = rotator.rotate();
                if (!rotated) {
                    throw new Error('\n[Fatal Error] Queue exhausted. All configured providers and API keys have failed.');
                } else {
                    keyRetryCount = 0; // Reset for the next key
                    spinner.start('Retrying with fallback...');
                }
            } else {
                spinner.fail(`Unrecoverable error from ${activeProvider.toUpperCase()} API.`);
                throw new Error(`Status: ${status || 'Unknown'}\nMessage: ${error.message}\nData: ${JSON.stringify(error.response?.data || '')}`);
            }
        }
    }
    
    return responseText;
};

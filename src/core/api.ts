import axios from 'axios';
import ora from 'ora';
import chalk from 'chalk';
import { UniversalKeyRotator } from './rotator';
import { SystemAgent } from './agentEngine';
import { StateManager } from './stateManager';
import { ModelRegistry } from './modelRegistry';

const engine = new SystemAgent();

export interface ProviderConfig {
    url: (key: string) => string;
    headers: (key: string) => any;
    payload: (messages: any[], key?: string) => any;
    parse: (data: any) => string;
}

const modelRegistry = new ModelRegistry();
let lastApiCallTime = 0;
const GLOBAL_THROTTLE_MS = 2500; // 2.5 seconds minimum between API calls

const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

export const getProviderConfig = (providerInput: string, selectedModel?: string): ProviderConfig => {
    const provider = providerInput.trim().toLowerCase();
    const model = selectedModel ?? modelRegistry.getFallback(provider);
    switch (provider) {
        case 'gemini':
            return {
                url: (key) => `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${key}`,
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
            return {
                url: () => `https://api.anthropic.com/v1/messages`,
                headers: (key) => ({ 
                    'Content-Type': 'application/json', 
                    'x-api-key': key, 
                    'anthropic-version': '2023-06-01',
                    'anthropic-beta': 'prompt-caching-2024-07-31'
                }),
                payload: (messages) => ({ 
                    model, 
                    max_tokens: 8192, 
                    messages: messages.map((m: any, idx: number) => {
                        // Apply ephemeral caching to the most recent message (often containing the massive context)
                        if (idx === messages.length - 1) {
                            return {
                                role: m.role,
                                content: [
                                    {
                                        type: 'text',
                                        text: m.content,
                                        cache_control: { type: 'ephemeral' }
                                    }
                                ]
                            };
                        }
                        return m;
                    })
                }),
                parse: (data) => data?.content?.[0]?.text
            };
        case 'deepseek':
            return {
                url: () => `https://api.deepseek.com/chat/completions`,
                headers: (key) => ({ 'Content-Type': 'application/json', 'Authorization': `Bearer ${key}` }),
                payload: (messages) => ({ model, messages }),
                parse: (data) => data?.choices?.[0]?.message?.content
            };
        case 'openai':
            return {
                url: () => `https://api.openai.com/v1/chat/completions`,
                headers: (key) => ({ 'Content-Type': 'application/json', 'Authorization': `Bearer ${key}` }),
                payload: (messages) => ({ model, max_tokens: 2048, messages }),
                parse: (data) => data?.choices?.[0]?.message?.content
            };
        case 'groq':
            return {
                url: () => `https://api.groq.com/openai/v1/chat/completions`,
                headers: (key) => ({ 'Content-Type': 'application/json', 'Authorization': `Bearer ${key}` }),
                payload: (messages) => ({ model, max_tokens: 2048, messages }),
                parse: (data) => data?.choices?.[0]?.message?.content
            };
        case 'openrouter':
            return {
                url: () => `https://openrouter.ai/api/v1/chat/completions`,
                headers: (key) => ({ 'Content-Type': 'application/json', 'Authorization': `Bearer ${key}`, 'HTTP-Referer': 'https://g-coder.local', 'X-Title': 'g-coder' }),
                payload: (messages) => ({ model, max_tokens: 2048, messages }),
                parse: (data) => data?.choices?.[0]?.message?.content
            };
        default:
            const envPrefix = provider.toUpperCase().replace(/-/g, '_');
            const baseUrl = process.env[`${envPrefix}_BASE_URL`] ?? `https://api.${provider}.com/v1`;
            let parsedBaseUrl: URL;
            try {
                parsedBaseUrl = new URL(baseUrl);
                if (parsedBaseUrl.protocol !== 'https:' && process.env.G_CODER_ALLOW_INSECURE_HTTP !== 'true') {
                    throw new Error('Only HTTPS endpoints are allowed.');
                }
            } catch (error: any) {
                throw new Error(`Invalid ${provider} base URL: ${error.message}`);
            }
            return {
                url: () => `${parsedBaseUrl.toString().replace(/\/$/, '')}/chat/completions`,
                headers: (key) => ({ 'Content-Type': 'application/json', 'Authorization': `Bearer ${key}` }),
                payload: (messages) => ({ model, messages }),
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
            `    { "type": "write", "path": "D:/projects/app/src/new_file.ts", "content": "console.log('Hello');" },\n` +
            `    { "type": "patch", "path": "src/utils.ts", "patchBlock": "<<SEARCH>>\\nold code\\n<<REPLACE>>\\nnew code\\n<<END>>" },\n` +
            `    { "type": "run", "executable": "npm", "args": ["run", "build"], "cwd": ".", "timeoutMs": 120000 },\n` +
            `    { "type": "done" }\n` +
            `  ]\n` +
            `}\n` +
            `\`\`\`\n` +
            `CRITICAL RULE: NEVER use the 'write' action on an EXISTING file, as it will overwrite the entire file and destroy the code! You MUST use 'patch' to modify existing files. Only use 'write' for creating completely NEW files.\n` +
            `CRITICAL JSON RULE: NEVER use literal unescaped newlines inside JSON string values! You MUST escape all newlines as \\n. NEVER invent action types like 'mkdir'. Use 'run' for system commands, or 'write' (which auto-creates directories).\n` +
            `CRITICAL COMMAND RULE: Shell command strings are forbidden. Every run action MUST use a plain executable plus an array of individual args. Never use sh, bash, cmd, powershell, command chaining, pipes, redirection, or interpolation.\n` +
            `CRITICAL RULE: You MUST output exactly ONE JSON block per response at the very end of your thought process. Do NOT output hypothetical JSON blocks while thinking, as the system will parse all of them and may execute unintended actions or exit early.\n` +
            `CRITICAL MULTI-TURN LOOP RULE: The system will execute your 'read' and 'run' actions and feed the exact outputs back to you in the next iteration. You can loop as many times as needed to read, think, and test. ONCE the requested task is 100% complete, you MUST output a 'done' action to exit the loop.\n` +
            `Provide absolute or relative paths.`;
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

    let messages = typeof promptOrMessages === 'string' ? [{ role: 'user', content: promptOrMessages }] : [...promptOrMessages];

    let keyRetryCount = 0;
    const MAX_KEY_RETRIES = 3;

    while (!success) {
        const activeProvider = rotator.getActiveProvider();
        const activeKey = rotator.getActiveKey();
        const selectedModel = await modelRegistry.resolveModel(activeProvider, activeKey);
        const config = getProviderConfig(activeProvider, selectedModel);

        spinner.text = `Contacting ${activeProvider.toUpperCase()} (${selectedModel})...`;

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

            const response = await axios.post(url, payload, { headers, timeout: 120000 });
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
                        console.log(chalk.yellow(`\n[API Limits] ${reason}. Waiting ${delayMs / 1000}s before retrying...`));
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
                    try {
                        const resumePrompt = new StateManager().recordHandoff(activeProvider, reason);
                        messages = [...messages, { role: 'user', content: resumePrompt }];
                        console.log(chalk.cyan('[State] Resume context loaded; completed work will not be repeated.'));
                    } catch {
                        // Calls outside a stateful task continue without resume context.
                    }
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

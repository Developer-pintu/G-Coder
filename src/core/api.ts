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

export const getProviderConfig = (provider: string): ProviderConfig => {
    switch (provider) {
        case 'gemini':
            return {
                url: (key) => `https://generativelanguage.googleapis.com/v1beta/models/gemini-3.5-flash:generateContent?key=${key}`,
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
                headers: (key) => ({ 'Content-Type': 'application/json', 'x-api-key': key, 'anthropic-version': '2023-06-01' }),
                payload: (messages) => ({ model: "claude-3-5-sonnet-20240620", max_tokens: 4096, messages }),
                parse: (data) => data?.content?.[0]?.text
            };
        case 'deepseek':
            return {
                url: () => `https://api.deepseek.com/chat/completions`,
                headers: (key) => ({ 'Content-Type': 'application/json', 'Authorization': `Bearer ${key}` }),
                payload: (messages) => ({ model: "deepseek-coder", messages }),
                parse: (data) => data?.choices?.[0]?.message?.content
            };
        case 'openai':
            return {
                url: () => `https://api.openai.com/v1/chat/completions`,
                headers: (key) => ({ 'Content-Type': 'application/json', 'Authorization': `Bearer ${key}` }),
                payload: (messages) => ({ model: "gpt-4o-mini", messages }),
                parse: (data) => data?.choices?.[0]?.message?.content
            };
        case 'groq':
            return {
                url: () => `https://api.groq.com/openai/v1/chat/completions`,
                headers: (key) => ({ 'Content-Type': 'application/json', 'Authorization': `Bearer ${key}` }),
                payload: (messages) => ({ model: "llama3-8b-8192", messages }),
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
        instruction = `You are an elite Autonomous AI Coding Agent with SYSTEM-LEVEL ACCESS.\n` +
                      `Your task is: ${input}\n` +
                      `You can read, write, move, delete files anywhere on the system (C:/, D:/, etc) and run safe shell commands.\n` +
                      `To perform actions, you MUST output a JSON block wrapped exactly in \`\`\`json ... \`\`\`.\n` +
                      `JSON Format Schema Example:\n` +
                      `\`\`\`json\n` +
                      `{\n` +
                      `  "actions": [\n` +
                      `    { "type": "read", "path": "C:/config.json" },\n` +
                      `    { "type": "write", "path": "D:/projects/app/src/index.ts", "content": "console.log('Hello');" },\n` +
                      `    { "type": "move", "path": "C:/old.txt", "destination": "C:/new.txt" },\n` +
                      `    { "type": "delete", "path": "D:/temp" },\n` +
                      `    { "type": "run", "command": "npm install lodash" }\n` +
                      `  ]\n` +
                      `}\n` +
                      `\`\`\`\n` +
                      `Provide absolute or relative paths. Always provide full file contents when writing.`;
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

    while (!success) {
        const activeProvider = rotator.getActiveProvider();
        const activeKey = rotator.getActiveKey();
        const config = getProviderConfig(activeProvider);
        
        spinner.text = `Contacting ${activeProvider.toUpperCase()} API...`;

        try {
            const url = config.url(activeKey);
            const headers = config.headers(activeKey);
            const payload = config.payload(messages, activeKey);

            const response = await axios.post(url, payload, { headers });
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
                
                const rotated = rotator.rotate();
                if (!rotated) {
                    console.error(chalk.red('\n[Fatal Error] Queue exhausted. All configured providers and API keys have failed.'));
                    process.exit(1);
                } else {
                    spinner.start('Retrying with fallback...');
                }
            } else {
                spinner.fail(`Unrecoverable error from ${activeProvider.toUpperCase()} API.`);
                console.error(`Status: ${status || 'Unknown'}`);
                console.error(`Message: ${error.message}`);
                console.error(error.response?.data || '');
                process.exit(1);
            }
        }
    }
    
    return responseText;
};

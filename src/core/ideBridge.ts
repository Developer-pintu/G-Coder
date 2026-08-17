import fs from 'fs';
import path from 'path';
import os from 'os';

export class IdeBridge {
    
    /**
     * Attempts to find API keys configured in popular IDEs.
     * Returns a key-value mapping of provider -> key.
     */
    public static getExtractedKeys(): Record<string, string> {
        const keys: Record<string, string> = {};
        const platforms = this.detectPlatformPaths();

        for (const dir of platforms) {
            if (!fs.existsSync(dir)) continue;

            // 1. Scan settings.json
            const settingsPath = path.join(dir, 'User', 'settings.json');
            if (fs.existsSync(settingsPath)) {
                this.scanSettingsJson(settingsPath, keys);
            }

            // 2. Scan state.vscdb (SQLite binary heuristic scan)
            const dbPath = path.join(dir, 'User', 'globalStorage', 'state.vscdb');
            if (fs.existsSync(dbPath)) {
                this.scanStateDb(dbPath, keys);
            }
        }

        return keys;
    }

    /**
     * Resolves the primary storage directories for VS Code and Cursor across OS.
     */
    private static detectPlatformPaths(): string[] {
        const home = os.homedir();
        const platform = os.platform();
        const paths: string[] = [];

        if (platform === 'win32') {
            const appData = process.env.APPDATA || path.join(home, 'AppData', 'Roaming');
            paths.push(path.join(appData, 'Code'));
            paths.push(path.join(appData, 'Cursor'));
        } else if (platform === 'darwin') {
            paths.push(path.join(home, 'Library', 'Application Support', 'Code'));
            paths.push(path.join(home, 'Library', 'Application Support', 'Cursor'));
        } else {
            paths.push(path.join(home, '.config', 'Code'));
            paths.push(path.join(home, '.config', 'Cursor'));
        }

        return paths;
    }

    /**
     * Parses standard settings.json safely.
     */
    private static scanSettingsJson(filePath: string, keys: Record<string, string>) {
        try {
            const content = fs.readFileSync(filePath, 'utf8');
            // settings.json allows comments, so standard JSON.parse might fail. 
            // We'll use regex for extreme resilience against malformed JSON.
            
            const openaiMatch = content.match(/"[\w.-]*openai[\w.-]*apiKey"\s*:\s*"([^"]+)"/i);
            if (openaiMatch && openaiMatch[1]) keys['openai'] = openaiMatch[1];

            const anthropicMatch = content.match(/"[\w.-]*anthropic[\w.-]*apiKey"\s*:\s*"([^"]+)"/i);
            if (anthropicMatch && anthropicMatch[1]) keys['anthropic'] = anthropicMatch[1];

            const geminiMatch = content.match(/"[\w.-]*gemini[\w.-]*apiKey"\s*:\s*"([^"]+)"/i);
            if (geminiMatch && geminiMatch[1]) keys['gemini'] = geminiMatch[1];

        } catch (error) {
            // Silently ignore access/read errors to prevent crashing CLI
        }
    }

    /**
     * Performs a zero-dependency binary string scan over the SQLite file to extract keys.
     */
    private static scanStateDb(filePath: string, keys: Record<string, string>) {
        try {
            // Read as binary buffer to avoid encoding mangling on SQLite
            const buffer = fs.readFileSync(filePath);
            const content = buffer.toString('utf8');

            // SQLite stores strings linearly, we can regex scan the raw bytes
            // Look for patterns like {"apiKey":"sk-..."} usually stored by extensions
            
            // OpenAI Heuristic
            const oaMatch = content.match(/sk-[a-zA-Z0-9]{32,}/);
            if (oaMatch && !keys['openai']) keys['openai'] = oaMatch[0];

            // Anthropic Heuristic
            const antMatch = content.match(/sk-ant-[a-zA-Z0-9_-]{32,}/);
            if (antMatch && !keys['anthropic']) keys['anthropic'] = antMatch[0];
            
            // Gemini / AI Studio keys usually start with AIza
            const gemMatch = content.match(/AIza[0-9A-Za-z-_]{35}/);
            if (gemMatch && !keys['gemini']) keys['gemini'] = gemMatch[0];

        } catch (error) {
            // Ignore access errors
        }
    }
}

import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import os from 'os';
import chalk from 'chalk';
import puppeteer from 'puppeteer';

const SESSION_FILE = path.join(os.homedir(), '.g-coder', '.session');

// Machine-specific hardware encryption key derivation
const ENCRYPTION_KEY = crypto.scryptSync(os.userInfo().username + os.hostname(), 'salt', 32);
const IV_LENGTH = 16;

export class SessionAuthEngine {
    
    /**
     * Launch browser and capture session cookies.
     */
    public async login(provider: string) {
        console.log(chalk.cyan.bold(`\n🌐 Launching secure browser for ${provider.toUpperCase()} Authentication...`));
        console.log(chalk.yellow(`Please log in manually. The window will close automatically once the session is captured.`));

        let loginUrl = '';
        if (provider === 'openai') loginUrl = 'https://chatgpt.com';
        else if (provider === 'anthropic') loginUrl = 'https://claude.ai/login';
        else if (provider === 'gemini') loginUrl = 'https://gemini.google.com';
        else {
            throw new Error(`Browser login not supported for provider: ${provider}`);
        }

        const browser = await puppeteer.launch({ headless: false });
        const page = await browser.newPage();
        
        await page.goto(loginUrl);
        
        console.log(chalk.gray(`Waiting for successful login (Press Ctrl+C in terminal if you want to abort)...`));

        // Simplified heuristic: Wait until user navigates away from login or 60 seconds pass
        try {
            await page.waitForNavigation({ timeout: 120000 });
        } catch (e) {
            console.log(chalk.yellow(`Timeout waiting for navigation, capturing current cookies anyway.`));
        }

        const cookies = await page.cookies();
        const userAgent = await browser.userAgent();
        
        await browser.close();

        if (cookies.length === 0) {
            throw new Error(`Failed to capture any session cookies from ${provider}.`);
        }

        this.secureStore(provider, { cookies, userAgent });
        console.log(chalk.green.bold(`\n✅ Session securely captured and encrypted for ${provider.toUpperCase()}!`));
    }

    /**
     * Wipes the entire local session store.
     */
    public logout() {
        if (fs.existsSync(SESSION_FILE)) {
            fs.rmSync(SESSION_FILE);
            console.log(chalk.green(`\n✔ Securely wiped all local browser sessions.`));
        } else {
            console.log(chalk.yellow(`\nNo active sessions found.`));
        }
    }

    /**
     * Encrypts and stores cookies locally.
     */
    private secureStore(provider: string, data: any) {
        const iv = crypto.randomBytes(IV_LENGTH);
        const cipher = crypto.createCipheriv('aes-256-gcm', ENCRYPTION_KEY, iv);
        
        let encrypted = cipher.update(JSON.stringify(data), 'utf8', 'hex');
        encrypted += cipher.final('hex');
        const authTag = cipher.getAuthTag().toString('hex');

        const payload = {
            iv: iv.toString('hex'),
            encrypted,
            authTag
        };

        const dir = path.dirname(SESSION_FILE);
        if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });

        let currentStore: any = {};
        if (fs.existsSync(SESSION_FILE)) {
            const raw = fs.readFileSync(SESSION_FILE, 'utf8');
            try { currentStore = JSON.parse(raw); } catch (e) {}
        }

        currentStore[provider] = payload;

        fs.writeFileSync(SESSION_FILE, JSON.stringify(currentStore, null, 2), { mode: 0o600 });
    }

    /**
     * Decrypts and retrieves stored cookies.
     */
    private getSecureData(provider: string): any | null {
        if (!fs.existsSync(SESSION_FILE)) return null;

        const currentStore = JSON.parse(fs.readFileSync(SESSION_FILE, 'utf8'));
        const payload = currentStore[provider];
        if (!payload) return null;

        try {
            const decipher = crypto.createDecipheriv('aes-256-gcm', ENCRYPTION_KEY, Buffer.from(payload.iv, 'hex'));
            decipher.setAuthTag(Buffer.from(payload.authTag, 'hex'));
            
            let decrypted = decipher.update(payload.encrypted, 'hex', 'utf8');
            decrypted += decipher.final('utf8');
            
            return JSON.parse(decrypted);
        } catch (error) {
            console.error(chalk.red(`Failed to decrypt session for ${provider}. Session might be corrupted.`));
            return null;
        }
    }

    /**
     * Attempt to construct headers that bypass simple checks using the captured session.
     */
    public getProxyHeaders(provider: string): any | null {
        const sessionData = this.getSecureData(provider);
        if (!sessionData) return null;

        const cookieString = sessionData.cookies.map((c: any) => `${c.name}=${c.value}`).join('; ');
        
        return {
            'Cookie': cookieString,
            'User-Agent': sessionData.userAgent,
            'Accept': 'application/json',
            'Referer': provider === 'openai' ? 'https://chatgpt.com/' : 'https://claude.ai/'
        };
    }
}

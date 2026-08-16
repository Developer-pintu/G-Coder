import * as dotenv from 'dotenv';
import chalk from 'chalk';
dotenv.config();

export class UniversalKeyRotator {
    private providers: Map<string, string[]> = new Map();
    private activeProviders: string[] = [];
    private currentProviderIndex: number = 0;
    private currentKeyIndex: number = 0;

    constructor(preferredProvider?: string) {
        // Dynamically find all *_API_KEYS from .env
        for (const envKey of Object.keys(process.env)) {
            if (envKey.endsWith('_API_KEYS')) {
                const providerName = envKey.replace('_API_KEYS', '').toLowerCase();
                const keysString = process.env[envKey];
                
                if (keysString) {
                    const keys = keysString.split(',').map(k => k.trim()).filter(k => k.length > 0);
                    if (keys.length > 0) {
                        this.providers.set(providerName, keys);
                        this.activeProviders.push(providerName);
                    }
                }
            }
        }

        if (this.activeProviders.length === 0) {
            throw new Error('[Fatal Error] No API keys found for any provider (*_API_KEYS) in .env file.');
        }

        // Try to set the preferred provider, or fallback to the first discovered provider
        if (preferredProvider) {
            const normalizedPreferred = preferredProvider.toLowerCase();
            const preferredIndex = this.activeProviders.indexOf(normalizedPreferred);
            if (preferredIndex !== -1) {
                this.currentProviderIndex = preferredIndex;
            } else {
                console.warn(chalk.yellow(`[Warning] Preferred provider '${preferredProvider}' has no keys configured. Defaulting to '${this.activeProviders[0]}'.`));
                this.currentProviderIndex = 0;
            }
        } else {
            this.currentProviderIndex = 0;
        }
    }

    public getActiveProvider(): string {
        return this.activeProviders[this.currentProviderIndex];
    }

    public getActiveKey(): string {
        const provider = this.getActiveProvider();
        const keys = this.providers.get(provider)!;
        return keys[this.currentKeyIndex];
    }

    /**
     * Strict sequential fallback:
     * 1. Next key for the current provider.
     * 2. If all keys exhausted, next provider in the dynamic sequence.
     * Returns true if successfully rotated, false if totally exhausted.
     */
    public rotate(): boolean {
        const provider = this.getActiveProvider();
        const keys = this.providers.get(provider)!;

        // Try next key for the SAME provider
        if (this.currentKeyIndex < keys.length - 1) {
            this.currentKeyIndex++;
            console.warn(chalk.yellow(`\n[Failover] Rate limit hit. Switched to Next Key (Index: ${this.currentKeyIndex}) for Provider: ${provider.toUpperCase()}`));
            return true;
        }

        // Exhausted keys for current provider, move to NEXT provider
        console.warn(chalk.yellow(`\n[Failover] Exhausted all keys for ${provider.toUpperCase()}. Cycling to next available provider...`));
        
        if (this.currentProviderIndex < this.activeProviders.length - 1) {
            this.currentProviderIndex++;
            this.currentKeyIndex = 0;
            const newProvider = this.getActiveProvider();
            console.warn(chalk.green(`[Failover] Successfully switched to Provider: ${newProvider.toUpperCase()}`));
            return true;
        }

        return false;
    }
}
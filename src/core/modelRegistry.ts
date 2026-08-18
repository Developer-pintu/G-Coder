/**
 * Project: g-coder CLI Tool
 * Author: Developer Pintu
 * License: MIT - Free to use with proper attribution.
 */
import axios, { AxiosInstance } from 'axios';
import fse from 'fs-extra';
import os from 'os';
import path from 'path';

export type SupportedProvider = 'gemini' | 'anthropic' | 'deepseek' | 'openai' | 'groq' | 'openrouter' | string;

interface RemoteModel {
    id?: string;
    created?: number;
    context_length?: number;
    architecture?: { modality?: string };
}

interface RegistryCache {
    version: 1;
    models: Record<string, { id: string; updatedAt: number }>;
}

const PROVIDER_PATTERN = /^[a-z][a-z0-9_-]{0,63}$/;
const MODEL_PATTERN = /^[A-Za-z0-9][A-Za-z0-9._:/-]{0,199}$/;
const CACHE_TTL_MS = 6 * 60 * 60 * 1000;

const FALLBACK_MODELS: Record<string, string> = {
    gemini: 'gemini-2.5-pro',
    anthropic: 'claude-sonnet-4-20250514',
    deepseek: 'deepseek-reasoner',
    openai: 'gpt-4.1',
    groq: 'llama-3.3-70b-versatile',
    openrouter: 'openai/gpt-4.1'
};

const CODING_SIGNALS = [
    /\bcode\b/i, /coder/i, /devstral/i, /deepseek/i, /claude.*sonnet/i,
    /gpt-(?:4(?:\.1|o)|5)/i, /gemini.*pro/i, /llama-3\.3-70b/i, /qwen.*coder/i,
    /claude.*(?:opus|sonnet)/i
];
const EXCLUDED_SIGNALS = [/embedding/i, /moderation/i, /audio/i, /image/i, /vision-only/i, /realtime/i];

export class ModelRegistry {
    private readonly cachePath: string;

    constructor(
        private readonly http: AxiosInstance = axios,
        cacheDirectory: string = path.join(os.homedir(), '.g-coder')
    ) {
        this.cachePath = path.join(cacheDirectory, 'model-registry.json');
    }

    public async resolveModel(providerInput: string, apiKey: string): Promise<string> {
        const provider = this.normalizeProvider(providerInput);
        const override = process.env[`${provider.toUpperCase()}_MODEL`];
        if (override) return this.validateModel(override);

        const cached = this.readCache();
        const cachedModel = cached?.models[provider];
        if (cachedModel && Date.now() - cachedModel.updatedAt < CACHE_TTL_MS) {
            return cachedModel.id;
        }

        try {
            const models = await this.fetchModels(provider, apiKey);
            const selected = this.selectBestModel(provider, models);
            if (selected) {
                this.writeCache({
                    version: 1,
                    models: { ...(cached?.models ?? {}), [provider]: { id: selected, updatedAt: Date.now() } }
                });
                return selected;
            }
        } catch {
            // Network discovery is an optimization. Cached and bundled fallbacks keep the CLI usable offline.
        }

        return cachedModel?.id ?? FALLBACK_MODELS[provider] ?? 'default';
    }

    public getFallback(providerInput: string): string {
        const provider = this.normalizeProvider(providerInput);
        return FALLBACK_MODELS[provider] ?? 'default';
    }

    private async fetchModels(provider: string, apiKey: string): Promise<RemoteModel[]> {
        const headers = apiKey ? { Authorization: `Bearer ${apiKey}` } : undefined;
        let url: string;
        switch (provider) {
            case 'openrouter': url = 'https://openrouter.ai/api/v1/models'; break;
            case 'openai': url = 'https://api.openai.com/v1/models'; break;
            case 'groq': url = 'https://api.groq.com/openai/v1/models'; break;
            default:
                // Providers without a model-list endpoint use a curated, updatable fallback or env override.
                return [];
        }
        const response = await this.http.get(url, { headers, timeout: 8000 });
        return Array.isArray(response.data?.data) ? response.data.data : [];
    }

    private selectBestModel(provider: string, models: RemoteModel[]): string | null {
        const candidates = models
            .filter(model => typeof model.id === 'string' && MODEL_PATTERN.test(model.id))
            .filter(model => !EXCLUDED_SIGNALS.some(pattern => pattern.test(model.id!)))
            .map(model => ({
                ...model,
                score: CODING_SIGNALS.reduce((score, pattern) => score + (pattern.test(model.id!) ? 100 : 0), 0)
                    + Math.min(model.context_length ?? 0, 1_000_000) / 10_000
                    + (model.created ?? 0) / 1_000_000_000
            }))
            .filter(model => model.score >= 100)
            .sort((a, b) => b.score - a.score || (b.created ?? 0) - (a.created ?? 0));

        // OpenRouter IDs include the upstream namespace; direct provider IDs do not.
        const selected = candidates.find(model => provider === 'openrouter' || !model.id!.includes('/'));
        return selected?.id ?? null;
    }

    private normalizeProvider(provider: string): string {
        const normalized = provider.trim().toLowerCase();
        if (!PROVIDER_PATTERN.test(normalized)) throw new Error(`Invalid provider name: ${provider}`);
        return normalized;
    }

    private validateModel(model: string): string {
        const normalized = model.trim();
        if (!MODEL_PATTERN.test(normalized)) throw new Error(`Invalid model identifier: ${model}`);
        return normalized;
    }

    private readCache(): RegistryCache | null {
        try {
            if (!fse.existsSync(this.cachePath)) return null;
            const cache = fse.readJsonSync(this.cachePath) as RegistryCache;
            if (cache.version !== 1 || !cache.models || typeof cache.models !== 'object') return null;
            return cache;
        } catch { return null; }
    }

    private writeCache(cache: RegistryCache): void {
        try {
            fse.ensureDirSync(path.dirname(this.cachePath), 0o700);
            fse.writeJsonSync(this.cachePath, cache, { spaces: 2, mode: 0o600 });
            try { fse.chmodSync(this.cachePath, 0o600); } catch { /* Windows best effort */ }
        } catch { /* Cache failures must never block an AI request. */ }
    }
}

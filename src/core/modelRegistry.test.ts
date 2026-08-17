import assert from 'node:assert/strict';
import test from 'node:test';
import fse from 'fs-extra';
import os from 'node:os';
import path from 'node:path';
import { AxiosInstance } from 'axios';
import { ModelRegistry } from './modelRegistry';

test('selects a current coding model from the live provider catalog shape and caches it', async () => {
    const directory = fse.mkdtempSync(path.join(os.tmpdir(), 'g-coder-models-'));
    let requests = 0;
    const http = {
        get: async () => {
            requests++;
            return { data: { data: [
                { id: 'text-embedding-3-large', created: 9999999999 },
                { id: 'gpt-4.1', created: 100, context_length: 128000 },
                { id: 'gpt-5-codex', created: 200, context_length: 256000 }
            ] } };
        }
    } as unknown as AxiosInstance;

    try {
        const registry = new ModelRegistry(http, directory);
        assert.equal(await registry.resolveModel('OPENAI', 'secret'), 'gpt-5-codex');
        assert.equal(await registry.resolveModel('openai', 'secret'), 'gpt-5-codex');
        assert.equal(requests, 1);
    } finally {
        fse.removeSync(directory);
    }
});

test('falls back safely when discovery is unavailable and rejects unsafe provider names', async () => {
    const directory = fse.mkdtempSync(path.join(os.tmpdir(), 'g-coder-models-'));
    const http = { get: async () => { throw new Error('offline'); } } as unknown as AxiosInstance;
    try {
        const registry = new ModelRegistry(http, directory);
        assert.equal(await registry.resolveModel('groq', 'secret'), 'llama-3.3-70b-versatile');
        await assert.rejects(() => registry.resolveModel('../invalid', 'secret'), /Invalid provider/);
    } finally {
        fse.removeSync(directory);
    }
});

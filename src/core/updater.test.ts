/**
 * Project: g-coder CLI Tool
 * Author: Developer Pintu
 * License: MIT - Free to use with proper attribution.
 */
import assert from 'node:assert/strict';
import test from 'node:test';
import { AxiosInstance } from 'axios';
import { Updater } from './updater';

test('checks and installs an exact registry version without invoking a shell', async () => {
    const calls: Array<{ executable: string; args: string[] }> = [];
    const http = { get: async () => ({ data: { name: 'G-CODER', version: '3.2.1', repository: { url: 'git+https://github.com/Developer-pintu/G-Coder.git' } } }) } as unknown as AxiosInstance;
    const updater = new Updater('3.0.0', http, (executable, args) => calls.push({ executable, args }));
    const result = await updater.update();

    assert.equal(result.updated, true);
    assert.deepEqual(calls[0].args, ['install', '--global', '--no-audit', 'g-coder@3.2.1']);
});

test('rejects malformed registry versions before command execution', async () => {
    let executed = false;
    const http = { get: async () => ({ data: { name: 'g-coder', version: 'latest; rm -rf /', repository: 'https://github.com/developer-pintu/g-coder' } }) } as unknown as AxiosInstance;
    const updater = new Updater('3.0.0', http, () => { executed = true; });
    await assert.rejects(() => updater.update(), /invalid package version/);
    assert.equal(executed, false);
});

test('rejects a case-insensitive package identity mismatch', async () => {
    const http = { get: async () => ({ data: { name: 'g-coder', version: '9.0.0', repository: 'https://github.com/attacker/g-coder' } }) } as unknown as AxiosInstance;
    const updater = new Updater('3.0.0', http, () => assert.fail('untrusted package must not execute npm'));
    await assert.rejects(() => updater.update(), /trusted g-coder repository/);
});

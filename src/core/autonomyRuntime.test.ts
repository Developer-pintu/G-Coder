/**
 * Project: g-coder CLI Tool
 * Author: Developer Pintu
 * License: MIT - Free to use with proper attribution.
 */
import assert from 'node:assert/strict';
import test from 'node:test';
import fse from 'fs-extra';
import os from 'node:os';
import path from 'node:path';
import { PolicyEngine } from './policyEngine';
import { CommandRunner } from './commandRunner';
import { BudgetManager } from './budgetManager';
import { TaskGraph } from './taskGraph';
import { ContextCompactor } from './contextCompactor';
import { ToolRegistry } from './toolRegistry';
import { PluginManager } from './pluginManager';
import { SupplyChainScanner } from './supplyChainScanner';
import { PatchValidator } from './patchValidator';

test('policy confines paths, blocks destructive executables, and honors read-only mode', () => {
    const root = fse.mkdtempSync(path.join(os.tmpdir(), 'g-coder-policy-'));
    try {
        assert.equal(new PolicyEngine(root).evaluate({ action: 'write', target: 'src/a.ts' }).allowed, true);
        assert.equal(new PolicyEngine(root).evaluate({ action: 'read', target: '../secret' }).allowed, false);
        assert.equal(new PolicyEngine(root).evaluate({ action: 'run', executable: 'shutdown', args: [] }).allowed, false);
        assert.equal(new PolicyEngine(root, 'read-only').evaluate({ action: 'patch', target: 'a.ts' }).allowed, false);
    } finally { fse.removeSync(root); }
});

test('structured runner preserves literal arguments and rejects external working directories', async () => {
    const root = fse.mkdtempSync(path.join(os.tmpdir(), 'g-coder-command-'));
    try {
        const result = await new CommandRunner(root).run({ executable: process.execPath, args: ['-e', 'process.stdout.write(process.argv[1])', 'hello;not-a-shell'] });
        assert.equal(result.stdout, 'hello;not-a-shell');
        await assert.rejects(() => new CommandRunner(root).run({ executable: process.execPath, cwd: '..' }), /outside/);
    } finally { fse.removeSync(root); }
});

test('budget and task graph enforce limits, dependencies, and failure blocking', () => {
    const budget = new BudgetManager({ maxRequests: 1 }); budget.consume(); assert.throws(() => budget.consume(), /budget/);
    const graph = new TaskGraph(); graph.add({ id: 'inspect', title: 'Inspect', dependencies: [] }); graph.add({ id: 'build', title: 'Build', dependencies: ['inspect'] });
    assert.deepEqual(graph.ready().map(node => node.id), ['inspect']); graph.update('inspect', 'completed'); assert.deepEqual(graph.ready().map(node => node.id), ['build']);
});

test('context compaction redacts secrets and tool registry validates typed tools', async () => {
    const compacted = new ContextCompactor(200).compact([{ role: 'user', content: 'api_key=super-secret-token-value' }]);
    assert.doesNotMatch(compacted[0].content, /super-secret/);
    const tools = new ToolRegistry(); tools.register({ name: 'repo.read', description: 'read', risk: 'read', execute: async input => input });
    assert.deepEqual(await tools.execute('REPO.READ', { ok: true }), { ok: true });
});

test('plugin and supply-chain validation reject escapes and unpinned dependencies', () => {
    const root = fse.mkdtempSync(path.join(os.tmpdir(), 'g-coder-plugin-'));
    try {
        fse.writeJsonSync(path.join(root, 'g-coder-plugin.json'), { name: 'safe-plugin', version: '1.0.0', main: '../escape.js', permissions: [] });
        assert.throws(() => new PluginManager().inspect(root), /escapes/);
        fse.writeJsonSync(path.join(root, 'package.json'), { dependencies: { demo: '*' } });
        assert.equal(new SupplyChainScanner().scan(root).length, 2);
    } finally { fse.removeSync(root); }
});

test('patch validator requires a unique exact match and rejects embedded credentials', () => {
    const root = fse.mkdtempSync(path.join(os.tmpdir(), 'g-coder-patch-'));
    try {
        fse.outputFileSync(path.join(root, 'app.ts'), 'const value = 1;\n');
        const validator = new PatchValidator(root);
        assert.equal(validator.validate('app.ts', '<<SEARCH>>\nconst value = 1;\n<<REPLACE>>\nconst value = 2;\n<<END>>').valid, true);
        assert.equal(validator.validate('app.ts', '<<SEARCH>>\nmissing\n<<REPLACE>>\napi_key="dangerous-secret"\n<<END>>').valid, false);
    } finally { fse.removeSync(root); }
});

import assert from 'node:assert/strict';
import test from 'node:test';
import fse from 'fs-extra';
import os from 'node:os';
import path from 'node:path';
import { CommandSpec, EnvironmentManager, EnvironmentSetupError } from './envManager';

const workspace = (): string => fse.mkdtempSync(path.join(os.tmpdir(), 'g-coder-env-'));

test('detects manifests, missing runtimes, and pending project dependencies', () => {
    const root = workspace();
    try {
        fse.writeJsonSync(path.join(root, 'package.json'), { dependencies: { express: '^5.0.0' } });
        fse.outputFileSync(path.join(root, 'service', 'requirements.txt'), 'requests==2.32.0\n');
        fse.outputFileSync(path.join(root, 'native', 'Cargo.toml'), '[package]\nname="demo"\nversion="0.1.0"\n');
        const manager = new EnvironmentManager({ commandChecker: () => false });
        const audit = manager.audit(root);

        assert.deepEqual(audit.missingTools.map(tool => tool.id).sort(), ['cargo', 'node', 'npm', 'python']);
        assert.equal(audit.pendingDependencies.length, 3);
        assert.equal(audit.detectedFiles.length, 3);
    } finally { fse.removeSync(root); }
});

test('installs approved project packages and resumes with a ready result', async () => {
    const root = workspace();
    const prompts: string[] = [];
    const commands: CommandSpec[] = [];
    try {
        fse.writeJsonSync(path.join(root, 'package.json'), { dependencies: { chalk: '^4.0.0' } });
        const manager = new EnvironmentManager({
            commandChecker: command => command === 'node' || command === 'npm',
            confirmer: async name => { prompts.push(name); return true; },
            commandRunner: async spec => {
                commands.push(spec);
                fse.ensureDirSync(path.join(root, 'node_modules'));
                return { code: 0, stdout: '', stderr: '' };
            }
        });

        const result = await manager.ensure(root);
        assert.deepEqual(prompts, ['Node.js project packages']);
        assert.deepEqual(commands[0].args, ['install', '--no-audit']);
        assert.deepEqual(result.installed, ['Node.js project packages']);
    } finally { fse.removeSync(root); }
});

test('stops the workflow when a missing dependency is declined case-insensitively', async () => {
    const root = workspace();
    try {
        fse.writeJsonSync(path.join(root, 'package.json'), { dependencies: { chalk: '^4.0.0' } });
        const manager = new EnvironmentManager({
            commandChecker: command => command === 'node' || command === 'npm',
            confirmer: async () => false,
            commandRunner: async () => assert.fail('declined installation must not execute')
        });
        await assert.rejects(() => manager.ensure(root), EnvironmentSetupError);
    } finally { fse.removeSync(root); }
});

test('rejects unsafe custom environment manifest commands', () => {
    const root = workspace();
    try {
        fse.writeJsonSync(path.join(root, '.g-coder-env.json'), { tools: [{ name: 'bad', command: 'tool; rm -rf /' }] });
        const manager = new EnvironmentManager({ commandChecker: () => true });
        assert.throws(() => manager.audit(root), /safe characters/);
    } finally { fse.removeSync(root); }
});
